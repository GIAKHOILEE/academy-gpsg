import { Injectable, HttpStatus } from '@nestjs/common'
import { DataSource, In, Repository } from 'typeorm'
import { BulkExamScoreByStudentDto, CreateClassStudentScoreDto } from './dtos/create-exam-scores.dto'
import { ExamScore } from './exam-scores.entity'
import { Exam } from '../_exam/exam.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { Classes } from '@modules/class/class.entity'
import { Student } from '@modules/students/students.entity'
import { PaginateExamScoresDto } from './dtos/paginate-exam-scores.dto'
import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { UpdateClassStudentScoreDto } from './dtos/update-class-student-score.dto'
import { InjectRepository } from '@nestjs/typeorm'
import { paginate } from '@common/pagination'

@Injectable()
export class ExamScoreService {
  constructor(private dataSource: DataSource) {}

  async insertScoresSimple(dto: BulkExamScoreByStudentDto) {
    const { class_id, scores } = dto
    if (!scores || scores.length === 0) return { inserted: 0 }

    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      // check điểm nằm trong khoảng 0-10
      const invalidScores = scores.filter(s => s.score < 0 || s.score > 10)
      if (invalidScores.length > 0) {
        throwAppException('SCORE_BETWEEN_0_AND_10', ErrorCode.SCORE_BETWEEN_0_AND_10, HttpStatus.BAD_REQUEST)
      }

      // check exam_id tồn tại
      const examIds = Array.from(new Set(scores.map(s => s.exam_id)))
      const exams = await queryRunner.manager.find(Exam, {
        where: { id: In(examIds) },
      })
      if (exams.length !== examIds.length) {
        throwAppException('EXAM_NOT_FOUND', ErrorCode.EXAM_NOT_FOUND, HttpStatus.BAD_REQUEST)
      }

      // check student_id tồn tại
      const studentIds = Array.from(new Set(scores.map(s => s.student_id)))
      const students = await queryRunner.manager.find(Student, {
        where: { id: In(studentIds) },
      })
      if (students.length !== studentIds.length) {
        throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.BAD_REQUEST)
      }

      // check class_id tồn tại
      const classes = await queryRunner.manager.findOne(Classes, {
        where: { id: class_id },
      })
      if (!classes) {
        throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.BAD_REQUEST)
      }

      // 1) Lấy list class_student tương ứng (student_id thuộc class_id)
      const classStudents = await queryRunner.manager.find(ClassStudents, {
        where: { student_id: In(studentIds), class_id },
      })

      // Kiểm tra nếu có student chưa có trong class -> báo lỗi
      const foundStudentIds = classStudents.map(cs => cs.student_id)
      const missing = studentIds.filter(id => !foundStudentIds.includes(id))
      if (missing.length > 0) {
        throwAppException('STUDENT_NOT_IN_CLASS', ErrorCode.STUDENT_NOT_IN_CLASS, HttpStatus.BAD_REQUEST)
      }

      // map student_id -> class_student_id
      const studentToCsId = new Map<number, number>()
      classStudents.forEach(cs => studentToCsId.set(cs.student_id, cs.id))

      // 2) build rows để insert (dùng last-write-wins nếu FE gửi duplicate)
      const pairKey = (examId: number, csId: number) => `${examId}#${csId}`
      const unique = new Map<string, { exam_id: number; class_student_id: number; score: number }>()
      for (const s of scores) {
        const csId = studentToCsId.get(s.student_id)!
        unique.set(pairKey(s.exam_id, csId), { exam_id: s.exam_id, class_student_id: csId, score: s.score })
      }
      const rows = Array.from(unique.values())
      if (rows.length === 0) {
        await queryRunner.commitTransaction()
        return { inserted: 0 }
      }

      // 3) (Tuỳ chọn nhưng khuyến nghị) Xóa các bản ghi cũ có cùng (exam_id, class_student_id)
      const deletePlaceholders: string[] = []
      const deleteParams: any[] = []
      for (const r of rows) {
        deletePlaceholders.push('(?, ?)')
        deleteParams.push(r.exam_id, r.class_student_id)
      }
      const deleteSql = `DELETE FROM exam_scores WHERE (exam_id, class_student_id) IN (${deletePlaceholders.join(',')})`
      await queryRunner.query(deleteSql, deleteParams)

      // 4) Bulk insert mới
      // TypeORM manager.insert hỗ trợ mảng value
      await queryRunner.manager.createQueryBuilder().insert().into(ExamScore).values(rows).execute()

      await queryRunner.commitTransaction()
      return { inserted: rows.length }
    } catch (err) {
      await queryRunner.rollbackTransaction()
      throw err
    } finally {
      await queryRunner.release()
    }
  }

  async getClassScoreboard(dto: PaginateExamScoresDto) {
    const { class_id, student_id } = dto
    // Query: lấy tất cả class_students của lớp, join students -> users,
    // join exams của lớp (all exams), và left join exam_scores tương ứng

    const params: any[] = []
    let sql = `
      SELECT
        cs.id AS class_student_id,
        s.id AS student_id,
        u.full_name,
        u.email,
        u.code,
        u.saint_name,
        cs.score AS stored_score,
        e.id AS exam_id,
        e.name AS exam_name,
        es.score AS exam_score,
        e.weight_percentage
      FROM class_students cs
      JOIN students s ON s.id = cs.student_id
      LEFT JOIN user u ON u.id = s.user_id
      LEFT JOIN exams e ON e.class_id = cs.class_id
      LEFT JOIN exam_scores es ON es.exam_id = e.id AND es.class_student_id = cs.id
    `

    const conditions: string[] = []

    if (class_id) {
      conditions.push(`cs.class_id = ?`)
      params.push(class_id)
    }

    if (student_id) {
      conditions.push(`cs.student_id = ?`)
      params.push(student_id)
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ')
    }

    sql += ` ORDER BY s.id, e.id`
    const rows: Array<{
      class_student_id: number
      student_id: number
      code: string | null
      saint_name: string | null
      full_name: string | null
      email: string | null
      stored_score: number | null
      exam_id: number | null
      exam_name: string | null
      exam_score: number | null
      weight_percentage: number | null
    }> = await this.dataSource.query(sql, params)

    // Group rows by class_student_id and compute final_score
    const map = new Map<number, any>()

    for (const r of rows) {
      const csId = r.class_student_id

      if (!map.has(csId)) {
        map.set(csId, {
          //   class_student_id: csId,
          student_id: r.student_id,
          code: r.code ?? null,
          saint_name: r.saint_name ?? null,
          full_name: r.full_name ?? null,
          email: r.email ?? null,
          stored_score: typeof r.stored_score === 'number' ? r.stored_score : null,
          exams: [],
          // we'll compute final_score after collecting exams
          final_score: null,
        })
      }

      // add exam row (if no exam for class, exam_id will be null)
      if (r.exam_id !== null) {
        map.get(csId).exams.push({
          exam_id: r.exam_id,
          exam_name: r.exam_name,
          score: r.exam_score !== null ? Number(r.exam_score) : null,
          weight_percentage: r.weight_percentage !== null ? Number(r.weight_percentage) : null,
        })
      } else {
        // if class has zero exams at all, exams[] will remain empty
      }
    }

    // compute weighted final score per student
    for (const [, v] of map) {
      let sumWeighted = 0
      let sumWeight = 0
      for (const ex of v.exams) {
        if (ex.score !== null && typeof ex.weight_percentage === 'number') {
          sumWeighted += ex.score * ex.weight_percentage
          sumWeight += ex.weight_percentage
        }
      }
      v.final_score = sumWeight > 0 ? sumWeighted / sumWeight : null
    }

    // convert to array
    const result = Array.from(map.values())
    return result
  }
}
/* =============================================
================= SCORE V2 =====================
================================================*/
export class ExamScoreServiceV2 {
  @InjectRepository(Classes)
  private classRepo: Repository<Classes>

  @InjectRepository(ClassStudents)
  private classStudentRepo: Repository<ClassStudents>

  // create  score
  async createClassStudentScores(dto: CreateClassStudentScoreDto): Promise<void> {
    const { class_id, scores } = dto
    if (!scores || scores.length === 0) return

    const classEntity = await this.classRepo.findOne({ where: { id: class_id } })
    if (!classEntity) throw throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)

    // validate score từ 0-10
    scores.forEach(s => {
      if (Number(s.score) < 0 || Number(s.score) > 10) {
        throw throwAppException('SCORE_INVALID', ErrorCode.SCORE_INVALID, HttpStatus.BAD_REQUEST)
      }
    })
    const updateData = scores.map(s => ({
      class_id,
      student_id: s.student_id,
      score: s.score,
    }))
    await this.classStudentRepo.upsert(updateData, ['class_id', 'student_id'])
  }

  // update score
  async updateClassStudentScores(dto: UpdateClassStudentScoreDto): Promise<void> {
    const { class_id, scores } = dto
    if (!scores || scores.length === 0) return

    // validate score từ 0-10
    scores.forEach(s => {
      if (Number(s.score) < 0 || Number(s.score) > 10) {
        throw throwAppException('SCORE_INVALID', ErrorCode.SCORE_INVALID, HttpStatus.BAD_REQUEST)
      }
    })

    try {
      const updateData = scores.map(s => ({
        class_id,
        student_id: s.student_id,
        score: s.score,
      }))
      await this.classStudentRepo.upsert(updateData, ['class_id', 'student_id'])
    } catch (err) {
      throw err
    }
  }

  async getClassStudentScores(dto: PaginateExamScoresDto): Promise<{ data: any[]; meta: any }> {
    const queryBuilder = this.classStudentRepo
      .createQueryBuilder('class_student')
      .leftJoin('class_student.student', 'student')
      .leftJoin('student.user', 'user')
      .leftJoin('class_student.class', 'class')
      .select([
        'class_student.id',
        'class_student.score',
        'class_student.learn_type',
        'student.id',
        'user.code',
        'user.saint_name',
        'user.full_name',
        'user.email',
        'class.id',
      ])

    if (dto.orderBy === 'first_name') {
      dto.anotherOrderBy = 'user.first_name'
    }

    const { data, meta } = await paginate(queryBuilder, dto)
    const result = data.map((row: any) => ({
      student_id: Number(row.student.id),
      code: row?.student?.user?.code ?? '',
      saint_name: row?.student?.user?.saint_name ?? '',
      full_name: row?.student?.user?.full_name ?? '',
      email: row?.student?.user?.email ?? '',
      score: row.score !== null ? Number(row.score) : null,
      learn_type: row?.learn_type,
      class_id: Number(row.class.id),
    }))

    return { data: result, meta }
  }
}
