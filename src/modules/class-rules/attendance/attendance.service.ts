import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { Attendance } from './attendance.entity'
import { CreateAttendanceDto } from './dtos/create-attendance.dto'
import { ErrorCode } from '@enums/error-codes.enum'
import { throwAppException } from '@common/utils'
import { Classes } from '@modules/class/class.entity'
import { Student } from '@modules/students/students.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { AttendanceRule } from '../attendance-rule/attendance-rule.entity'
import { AttendanceStatus } from '@enums/class.enum'
import { toMinutes } from '@common/utils'

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
    @InjectRepository(Classes)
    private readonly classRepository: Repository<Classes>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(ClassStudents)
    private readonly classStudentsRepository: Repository<ClassStudents>,
    @InjectRepository(AttendanceRule)
    private readonly attendanceRuleRepository: Repository<AttendanceRule>,
  ) {}

  async createAttendance(createAttendanceDto: CreateAttendanceDto): Promise<Attendance> {
    const { class_id, student_id } = createAttendanceDto
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // 1. Check class tồn tại
    const classExist = await this.classRepository.findOne({ where: { id: class_id } })
    if (!classExist) throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)

    // 2. Check student tồn tại
    const studentExist = await this.studentRepository.findOne({ where: { id: student_id } })
    if (!studentExist) throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)

    // 3. Check student có trong class
    const classStudent = await this.classStudentsRepository.findOne({
      where: { class_id, student_id },
    })
    if (!classStudent) throwAppException('STUDENT_NOT_IN_CLASS', ErrorCode.STUDENT_NOT_IN_CLASS, HttpStatus.BAD_REQUEST)

    // 4. Check đã điểm danh chưa
    const existed = await this.attendanceRepository.findOne({
      where: { class_student_id: classStudent.id, attendance_date: todayStr },
    })
    if (existed) throwAppException('ATTENDANCE_ALREADY_MARKED', ErrorCode.ATTENDANCE_ALREADY_MARKED, HttpStatus.BAD_REQUEST)

    // 5. Lấy rule của buổi hôm nay
    const rule = await this.attendanceRuleRepository.findOne({
      where: { class_id, lesson_date: todayStr },
    })
    if (!rule) throwAppException('NO_ATTENDANCE_RULE_TODAY', ErrorCode.NO_ATTENDANCE_RULE_TODAY, HttpStatus.BAD_REQUEST)

    // 6. Xác định status
    const nowMinutes = today.getHours() * 60 + today.getMinutes()
    const startMinutes = toMinutes(rule.card_start_time)
    const endMinutes = toMinutes(rule.card_end_time)

    let status: AttendanceStatus

    if (nowMinutes < startMinutes) {
      // điểm danh sớm
      throwAppException('ATTENDANCE_TOO_EARLY', ErrorCode.ATTENDANCE_TOO_EARLY, HttpStatus.BAD_REQUEST)
    } else if (nowMinutes <= endMinutes) {
      // trong giờ điểm danh
      const lateThreshold = startMinutes + 15 // VD cho phép đi trễ 15 phút
      status = nowMinutes <= lateThreshold ? AttendanceStatus.PRESENT : AttendanceStatus.LATE
    } else {
      // sau giờ điểm danh
      status = AttendanceStatus.ABSENT
    }

    const attendance = this.attendanceRepository.create({
      class_student_id: classStudent.id,
      attendance_date: todayStr,
      status,
    })
    return this.attendanceRepository.save(attendance)
  }

  async getAttendanceReport(class_id: number) {
    // 1. Lấy danh sách buổi học (ngày điểm danh)
    const rules = await this.attendanceRuleRepository.find({
      where: { class_id },
      order: { lesson_date: 'ASC' },
    })
    const lessonDates = rules.map(r => r.lesson_date) // ['2023-08-15', '2023-08-19', ...]

    // 2. Lấy danh sách học viên trong lớp
    const classStudents = await this.classStudentsRepository
      .createQueryBuilder('class_student')
      .select(['class_student.id', 'student.id', 'user.code', 'user.full_name'])
      .leftJoin('class_student.student', 'student')
      .leftJoin('student.user', 'user')
      .where('class_student.class_id = :class_id', { class_id })
      .getMany()

    // 3. Lấy toàn bộ attendance trong lớp
    const attendances = await this.attendanceRepository.find({
      where: { class_student: In(classStudents.map(cs => cs.id)) },
    })

    // 4. Format thành bảng
    const report = classStudents.map(cs => {
      const row: any = {
        student_id: cs.student.id,
        student_code: cs.student.user.code,
        student_name: cs.student.user.full_name,
        records: {},
        attendance_rate: 0,
      }

      let presentCount = 0

      for (const date of lessonDates) {
        const att = attendances.find(a => a.class_student_id === cs.id && a.attendance_date === date)

        if (att) {
          if (att.status === AttendanceStatus.PRESENT) {
            row.records[date] = AttendanceStatus.PRESENT
            presentCount++
          } else if (att.status === AttendanceStatus.LATE) {
            row.records[date] = AttendanceStatus.LATE
            presentCount++ // vẫn tính là tham dự
          } else {
            row.records[date] = AttendanceStatus.ABSENT
          }
        } else {
          row.records[date] = AttendanceStatus.ABSENT // chưa có record => vắng
        }
      }

      row.attendance_rate = ((presentCount / lessonDates.length) * 100).toFixed(1) + '%'
      return row
    })

    return { lessonDates, report }
  }
}
