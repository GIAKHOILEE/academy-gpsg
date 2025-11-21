import { paginate, PaginationMeta } from '@common/pagination'
import { arrayToObject, throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { Subject } from '@modules/subjects/subjects.entity'
import { Teacher } from '@modules/teachers/teachers.entity'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Scholastic } from './_scholastic/scholastic.entity'
import { Semester } from './_semester/semester.entity'
import { Classes } from './class.entity'
import { IClasses } from './class.interface'
import { CreateClassDto } from './dtos/create-class.dto'
import { GetStudentsOfClassDto, PaginateClassDto, PaginateClassOfStudentDto } from './dtos/paginate-class.dto'
import { UpdateClassDto } from './dtos/update-class.dto'
import { IStudent } from '@modules/students/students.interface'
import { ClassStudents } from './class-students/class-student.entity'
import { ClassStatus } from '@enums/class.enum'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Student } from '@modules/students/students.entity'
import { Enrollments } from '@modules/enrollments/enrollments.entity'

@Injectable()
export class ClassService {
  constructor(
    @InjectRepository(Classes)
    private classRepository: Repository<Classes>,
    @InjectRepository(Subject)
    private subjectRepository: Repository<Subject>,
    @InjectRepository(Teacher)
    private teacherRepository: Repository<Teacher>,
    @InjectRepository(Scholastic)
    private scholasticRepository: Repository<Scholastic>,
    @InjectRepository(Semester)
    private semesterRepository: Repository<Semester>,
    @InjectRepository(ClassStudents)
    private classStudentsRepository: Repository<ClassStudents>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(Enrollments)
    private enrollmentRepository: Repository<Enrollments>,
  ) {}

  async createClass(createClassDto: CreateClassDto): Promise<IClasses> {
    const { code, subject_id, teacher_id, scholastic_id, semester_id, ...rest } = createClassDto

    const existingClass = await this.classRepository.findOne({ where: { code } })
    if (existingClass) throwAppException('CLASS_CODE_ALREADY_EXISTS', ErrorCode.CLASS_CODE_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)

    const subject = await this.subjectRepository
      .createQueryBuilder('subjects')
      .select(['subjects.id', 'subjects.code', 'subjects.name', 'subjects.credit'])
      .where('subjects.id = :id', { id: subject_id })
      .getOne()
    if (!subject) throwAppException('SUBJECT_NOT_FOUND', ErrorCode.SUBJECT_NOT_FOUND, HttpStatus.NOT_FOUND)
    const teacher = await this.teacherRepository
      .createQueryBuilder('teachers')
      .leftJoinAndSelect('teachers.user', 'user')
      .select(['teachers.id', 'user.code', 'user.full_name', 'user.email'])
      .where('teachers.id = :id', { id: teacher_id })
      .getOne()
    if (!teacher) throwAppException('TEACHER_NOT_FOUND', ErrorCode.TEACHER_NOT_FOUND, HttpStatus.NOT_FOUND)
    const scholastic = await this.scholasticRepository
      .createQueryBuilder('scholastics')
      .select(['scholastics.id', 'scholastics.name'])
      .where('scholastics.id = :id', { id: scholastic_id })
      .getOne()
    if (!scholastic) throwAppException('SCHOLASTIC_NOT_FOUND', ErrorCode.SCHOLASTIC_NOT_FOUND, HttpStatus.NOT_FOUND)
    const semester = await this.semesterRepository
      .createQueryBuilder('semesters')
      .select(['semesters.id', 'semesters.name'])
      .where('semesters.id = :id', { id: semester_id })
      .getOne()
    if (!semester) throwAppException('SEMESTER_NOT_FOUND', ErrorCode.SEMESTER_NOT_FOUND, HttpStatus.NOT_FOUND)

    // ngày khai giảng phải sau ngày kết thúc ghi danh
    // if (rest.opening_day && rest.end_enrollment_day) {
    //   if (new Date(rest.opening_day) < new Date(rest.end_enrollment_day)) {
    //     throwAppException(
    //       'OPENING_DAY_MUST_BE_AFTER_END_ENROLLMENT_DAY',
    //       ErrorCode.OPENING_DAY_MUST_BE_AFTER_END_ENROLLMENT_DAY,
    //       HttpStatus.BAD_REQUEST,
    //     )
    //   }
    // }

    // ngày kết thúc lớp phải sau ngày khai giảng
    if (rest.closing_day && rest.opening_day) {
      if (new Date(rest.closing_day) < new Date(rest.opening_day)) {
        throwAppException('CLOSING_DAY_MUST_BE_AFTER_OPENING_DAY', ErrorCode.CLOSING_DAY_MUST_BE_AFTER_OPENING_DAY, HttpStatus.BAD_REQUEST)
      }
    }

    // so sánh các ngày với ngày hiên tại để chỉnh status
    const today = new Date()
    let status = ClassStatus.ENROLLING
    if (rest.opening_day && new Date(rest.opening_day) < today) {
      status = ClassStatus.HAS_BEGUN
    }
    if (rest.closing_day && new Date(rest.closing_day) < today) {
      status = ClassStatus.END_CLASS
    }
    if (rest.end_enrollment_day && new Date(rest.end_enrollment_day) < today) {
      status = ClassStatus.END_ENROLLING
    }

    const classEntity = this.classRepository.create({ ...rest, code, subject, teacher, scholastic, semester, name: subject.name, status })
    const savedClass = await this.classRepository.save(classEntity)

    const formattedClass: IClasses = {
      id: savedClass.id,
      name: subject.name, // tên lớp là tên môn học
      code: savedClass.code,
      status: savedClass.status,
      salary: savedClass.salary,
      extra_allowance: savedClass.extra_allowance,
      number_lessons: savedClass.number_lessons,
      number_periods: savedClass.number_periods,
      classroom: savedClass.classroom,
      credit: subject.credit,
      max_students: savedClass.max_students == 0 ? 999999 : savedClass.max_students,
      price: savedClass.price,
      current_students: 0,
      schedule: savedClass.schedule,
      end_enrollment_day: savedClass.end_enrollment_day,
      start_time: savedClass.start_time,
      end_time: savedClass.end_time,
      opening_day: savedClass.opening_day,
      closing_day: savedClass.closing_day,
      is_evaluate: false,
      subject: {
        id: subject.id,
        code: subject.code,
        name: subject.name,
        credit: subject.credit,
      },
      teacher: {
        id: teacher.id,
        code: teacher.user.code,
        full_name: teacher.user.full_name,
        email: teacher.user.email,
      },
      scholastic: {
        id: scholastic.id,
        name: scholastic.name,
      },
      semester: {
        id: semester.id,
        name: semester.name,
      },
    }
    return formattedClass
  }

  async updateClass(id: number, updateClassDto: UpdateClassDto): Promise<void> {
    const { code, subject_id, teacher_id, scholastic_id, semester_id, ...rest } = updateClassDto
    console.log(updateClassDto)
    const existingClass = await this.classRepository.findOne({ where: { id } })
    if (!existingClass) throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)

    if (subject_id) {
      const subject = await this.subjectRepository.exists({ where: { id: subject_id } })
      if (!subject) throwAppException('SUBJECT_NOT_FOUND', ErrorCode.SUBJECT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    if (teacher_id) {
      const teacher = await this.teacherRepository.exists({ where: { id: teacher_id } })
      if (!teacher) throwAppException('TEACHER_NOT_FOUND', ErrorCode.TEACHER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    if (scholastic_id) {
      const scholastic = await this.scholasticRepository.exists({ where: { id: scholastic_id } })
      if (!scholastic) throwAppException('SCHOLASTIC_NOT_FOUND', ErrorCode.SCHOLASTIC_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    if (semester_id) {
      const semester = await this.semesterRepository.exists({ where: { id: semester_id } })
      if (!semester) throwAppException('SEMESTER_NOT_FOUND', ErrorCode.SEMESTER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    // ngày khai giảng phải sau ngày kết thúc ghi danh
    // if (rest.opening_day && rest.end_enrollment_day) {
    //   if (new Date(rest.opening_day) < new Date(rest.end_enrollment_day)) {
    //     throwAppException(
    //       'OPENING_DAY_MUST_BE_AFTER_END_ENROLLMENT_DAY',
    //       ErrorCode.OPENING_DAY_MUST_BE_AFTER_END_ENROLLMENT_DAY,
    //       HttpStatus.BAD_REQUEST,
    //     )
    //   }
    // }

    // ngày kết thúc lớp phải sau ngày khai giảng
    if (rest.closing_day && rest.opening_day) {
      if (new Date(rest.closing_day) < new Date(rest.opening_day)) {
        throwAppException('CLOSING_DAY_MUST_BE_AFTER_OPENING_DAY', ErrorCode.CLOSING_DAY_MUST_BE_AFTER_OPENING_DAY, HttpStatus.BAD_REQUEST)
      }
    }

    // so sánh các ngày với ngày hiện tại để chỉnh status
    const openingDay = rest.opening_day ? new Date(rest.opening_day) : existingClass.opening_day
    const endEnrollmentDay = rest.end_enrollment_day ? new Date(rest.end_enrollment_day) : existingClass.end_enrollment_day
    const closingDay = rest.closing_day ? new Date(rest.closing_day) : existingClass.closing_day

    const today = new Date()
    let status = existingClass.status

    // 1. Nếu đã kết thúc
    if (closingDay && closingDay < today) {
      status = ClassStatus.END_CLASS
    }
    // 2. Nếu đã mở học rồi (ưu tiên hơn ENROLLING)
    else if (openingDay && openingDay <= today) {
      status = ClassStatus.HAS_BEGUN
    }
    // 3. Nếu đang trong giai đoạn tuyển sinh
    else if (openingDay && endEnrollmentDay && openingDay > today && endEnrollmentDay > today) {
      status = ClassStatus.ENROLLING
    }
    // 4. Nếu hết hạn tuyển sinh
    else if (openingDay && endEnrollmentDay && openingDay < today && endEnrollmentDay < today) {
      status = ClassStatus.END_ENROLLING
    }

    await this.classRepository.update(id, { ...rest, code, subject_id, teacher_id, scholastic_id, semester_id, status })
  }

  async updateIsActive(id: number): Promise<void> {
    const existingClass = await this.classRepository.findOne({ where: { id }, select: ['id', 'is_active'] })
    if (!existingClass) throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)

    await this.classRepository.update(id, { is_active: !existingClass.is_active })
  }

  async deleteClass(id: number): Promise<void> {
    const existingClass = await this.classRepository.exists({ where: { id } })
    if (!existingClass) throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)

    const hasEnrollment = await this.enrollmentRepository
      .createQueryBuilder('enrollment')
      .where('JSON_CONTAINS(enrollment.class_ids, :id)', { id: JSON.stringify(id) })
      .getExists()

    if (hasEnrollment) {
      throwAppException('CLASS_HAS_ENROLLMENTS', ErrorCode.CLASS_HAS_ENROLLMENTS, HttpStatus.BAD_REQUEST)
    }

    await this.classRepository.delete(id)
  }

  async getClassById(id: number): Promise<IClasses> {
    const classEntity = await this.classRepository
      .createQueryBuilder('classes')
      .leftJoinAndSelect('classes.subject', 'subject')
      .leftJoinAndSelect('subject.department', 'department')
      .leftJoinAndSelect('classes.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'user')
      .leftJoinAndSelect('classes.scholastic', 'scholastic')
      .leftJoinAndSelect('classes.semester', 'semester')
      .where('classes.id = :id', { id })
      .getOne()
    if (!classEntity) throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)

    const current_students = await this.classStudentsRepository.count({ where: { class_id: id } })
    const formattedClass: IClasses = {
      id: classEntity.id,
      name: classEntity?.subject?.name,
      code: classEntity.code,
      image: classEntity.subject.image,
      status: classEntity.status,
      salary: classEntity.salary,
      extra_allowance: classEntity.extra_allowance,
      number_lessons: classEntity.number_lessons,
      number_periods: classEntity.number_periods,
      classroom: classEntity.classroom,
      credit: classEntity.subject.credit,
      max_students: classEntity.max_students,
      price: classEntity.price,
      current_students: current_students,
      condition: classEntity.condition,
      end_enrollment_day: classEntity.end_enrollment_day,
      schedule: classEntity.schedule,
      start_time: classEntity.start_time,
      end_time: classEntity.end_time,
      opening_day: classEntity.opening_day,
      closing_day: classEntity.closing_day,
      is_evaluate: classEntity.is_evaluate,
      subject: classEntity?.subject
        ? {
            id: classEntity.subject.id,
            code: classEntity.subject.code,
            name: classEntity.subject.name,
            image: classEntity.subject.image,
            credit: classEntity.subject.credit,
            post_link: classEntity.subject.post_link,
          }
        : null,
      teacher: classEntity?.teacher
        ? {
            id: classEntity.teacher.id,
            code: classEntity.teacher.user.code,
            full_name: classEntity.teacher.user.full_name,
            saint_name: classEntity.teacher.user.saint_name,
            email: classEntity.teacher.user.email,
            other_name: classEntity.teacher.other_name,
          }
        : null,
      scholastic: classEntity?.scholastic
        ? {
            id: classEntity.scholastic.id,
            name: classEntity.scholastic.name,
          }
        : null,
      semester: classEntity?.semester
        ? {
            id: classEntity.semester.id,
            name: classEntity.semester.name,
          }
        : null,
      department: classEntity?.subject?.department
        ? {
            id: classEntity.subject.department.id,
            code: classEntity.subject.department.code,
            name: classEntity.subject.department.name,
          }
        : null,
    }
    return formattedClass
  }

  async getAllClasses(paginateClassDto: PaginateClassDto, is_admin: boolean): Promise<{ data: IClasses[]; meta: PaginationMeta }> {
    const { subject_id, teacher_id, department_id, scholastic_id, semester_id, is_register, ...rest } = paginateClassDto

    const query = this.classRepository
      .createQueryBuilder('classes')
      .leftJoinAndSelect('classes.subject', 'subject')
      .leftJoinAndSelect('subject.department', 'department')
      .leftJoinAndSelect('classes.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'user')
      .leftJoinAndSelect('classes.scholastic', 'scholastic')
      .leftJoinAndSelect('classes.semester', 'semester')

    // nếu không có status thì mặc định lấy hết trừ status số 4
    // if (!paginateClassDto.status) {
    //   query.andWhere('classes.status != :status', { status: ClassStatus.END_CLASS })
    // }
    if (subject_id) {
      query.andWhere('subject.id = :subject_id', { subject_id })
    }
    if (teacher_id) {
      query.andWhere('teacher.id = :teacher_id', { teacher_id })
    }
    if (scholastic_id) {
      query.andWhere('scholastic.id = :scholastic_id', { scholastic_id })
    }
    if (semester_id) {
      query.andWhere('semester.id = :semester_id', { semester_id })
    }
    if (department_id) {
      query.andWhere('subject.department_id = :department_id', { department_id })
    }

    // filter lớp đang mở ghi danh end_enrollment_day theo thời gian so với hiện tại
    const today = new Date().toISOString().split('T')[0]
    if (is_register) {
      query.andWhere('classes.end_enrollment_day >= :today', { today })
    }
    if (!is_admin) {
      query.andWhere('classes.is_active = :is_active', { is_active: true })
    }

    const { data, meta } = await paginate(query, rest)
    const classIds = data.map(classEntity => classEntity.id)
    let current_students_object = {}
    if (classIds.length > 0) {
      const current_students = await this.classStudentsRepository
        .createQueryBuilder('cs')
        .select('cs.class_id', 'class_id')
        .addSelect('COUNT(cs.id)', 'count')
        .where('cs.class_id IN (:...classIds)', { classIds })
        .groupBy('cs.class_id')
        .getRawMany()
      current_students_object = arrayToObject(current_students, 'class_id')
    }

    const formattedClasses: IClasses[] = data.map(classEntity => ({
      id: classEntity.id,
      name: classEntity?.subject?.name,
      code: classEntity.code,
      image: classEntity.subject.image,
      status: classEntity.status,
      salary: classEntity.salary,
      extra_allowance: classEntity.extra_allowance,
      number_lessons: classEntity.number_lessons,
      number_periods: classEntity.number_periods,
      classroom: classEntity.classroom,
      credit: classEntity.subject.credit,
      max_students: classEntity.max_students,
      price: classEntity.price,
      current_students: Number(current_students_object[classEntity.id]?.count || 0),
      schedule: classEntity.schedule,
      condition: classEntity.condition,
      end_enrollment_day: classEntity.end_enrollment_day,
      start_time: classEntity.start_time,
      end_time: classEntity.end_time,
      opening_day: classEntity.opening_day,
      closing_day: classEntity.closing_day,
      is_evaluate: classEntity.is_evaluate,
      subject: classEntity?.subject
        ? {
            id: classEntity.subject.id,
            code: classEntity.subject.code,
            name: classEntity.subject.name,
            credit: classEntity.subject.credit,
            image: classEntity.subject.image,
            post_link: classEntity.subject.post_link,
          }
        : null,
      teacher: classEntity?.teacher
        ? {
            id: classEntity.teacher.id,
            code: classEntity.teacher.user.code,
            full_name: classEntity.teacher.user.full_name,
            saint_name: classEntity.teacher.user.saint_name,
            email: classEntity.teacher.user.email,
            other_name: classEntity.teacher.other_name,
          }
        : null,
      scholastic: classEntity?.scholastic
        ? {
            id: classEntity.scholastic.id,
            name: classEntity.scholastic.name,
          }
        : null,
      semester: classEntity?.semester
        ? {
            id: classEntity.semester.id,
            name: classEntity.semester.name,
          }
        : null,
      department: classEntity.subject?.department
        ? {
            id: classEntity.subject.department.id,
            code: classEntity.subject.department.code,
            name: classEntity.subject.department.name,
          }
        : null,
    }))
    return { data: formattedClasses, meta }
  }

  //lấy danh sách học sinh của lớp
  async getStudentsOfClass(class_id: number, getStudentsOfClassDto: GetStudentsOfClassDto): Promise<{ data: IStudent[]; meta: PaginationMeta }> {
    const { name, code, ...rest } = getStudentsOfClassDto

    const classEntity = await this.classRepository.findOne({ where: { id: class_id }, select: ['id'] })
    if (!classEntity) throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)

    const classStudents = await this.classStudentsRepository
      .createQueryBuilder('class_students')
      .select([
        'class_students.id',
        'student.id',
        'user.code',
        'user.gender',
        'user.avatar',
        'user.full_name',
        'user.email',
        'user.saint_name',
        'user.phone_number',
        'user.address',
        'user.birth_place',
        'user.birth_date',
        'user.parish',
        'user.deanery',
        'user.diocese',
        'user.congregation',
      ])
      .leftJoin('class_students.student', 'student')
      .leftJoin('student.user', 'user')
      .where('class_students.class_id = :class_id', { class_id })

    if (name) {
      classStudents.andWhere('user.full_name LIKE :name', { name: `%${name}%` })
    }
    if (code) {
      classStudents.andWhere('user.code = :code', { code })
    }

    const { data, meta } = await paginate(classStudents, rest)
    const formattedStudents: IStudent[] = data.map(classStudent => ({
      id: classStudent.student.id,
      code: classStudent.student.user.code,
      gender: classStudent.student.user.gender,
      avatar: classStudent.student.user.avatar,
      full_name: classStudent.student.user.full_name,
      email: classStudent.student.user.email,
      saint_name: classStudent.student.user.saint_name,
      phone_number: classStudent.student.user.phone_number,
      address: classStudent.student.user.address,
      birth_place: classStudent.student.user.birth_place,
      birth_date: classStudent.student.user.birth_date,
      parish: classStudent.student.user.parish,
      deanery: classStudent.student.user.deanery,
      diocese: classStudent.student.user.diocese,
      congregation: classStudent.student.user.congregation,
    }))
    return { data: formattedStudents, meta }
  }

  // lấy list class của 1 học sinh
  async getClassesOfStudent(userId: number, paginateClassDto: PaginateClassOfStudentDto): Promise<{ data: IClasses[]; meta: PaginationMeta }> {
    const { name, code, classroom, ...rest } = paginateClassDto
    const student = await this.studentRepository.findOne({ where: { user_id: userId }, select: ['id'] })
    if (!student) throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    const student_id = student.id

    const classEntities = this.classStudentsRepository
      .createQueryBuilder('class_students')
      .select([
        'class_students.id',
        'class_students.class_id',
        'class_students.student_id',
        'class.id',
        'class.name',
        'class.code',
        'class.status',
        'class.number_lessons',
        'class.classroom',
        'class.max_students',
        'class.end_enrollment_day',
        'class.price',
        'class.schedule',
        'class.start_time',
        'class.end_time',
        'class.opening_day',
        'class.closing_day',
        'class.is_evaluate',
        'subject.id',
        'subject.image',
        'subject.code',
        'subject.name',
        'subject.credit',
        'teacher.id',
        'user.code',
        'user.full_name',
        'user.saint_name',
        'user.email',
        'teacher.other_name',
      ])
      .leftJoin('class_students.class', 'class')
      .leftJoin('class.teacher', 'teacher')
      .leftJoin('teacher.user', 'user')
      .leftJoin('class.subject', 'subject')
      .where('class_students.student_id = :student_id', { student_id })

    if (name) {
      classEntities.andWhere('class.name LIKE :name', { name: `%${name}%` })
    }
    if (code) {
      classEntities.andWhere('class.code LIKE :code', { code: `%${code}%` })
    }
    if (classroom) {
      classEntities.andWhere('class.classroom LIKE :classroom', { classroom: `%${classroom}%` })
    }

    const { data, meta } = await paginate(classEntities, rest)

    const classIds = data.map(classStudent => classStudent.class.id)
    let current_students_object = {}
    if (classIds.length > 0) {
      const current_students = await this.classStudentsRepository
        .createQueryBuilder('cs')
        .select('cs.class_id', 'class_id')
        .addSelect('COUNT(cs.id)', 'count')
        .where('cs.class_id IN (:...classIds)', { classIds })
        .groupBy('cs.class_id')
        .getRawMany()
      current_students_object = arrayToObject(current_students, 'class_id')
    }

    const formattedClasses: IClasses[] = data.map(classStudent => ({
      id: classStudent.class.id,
      name: classStudent.class.name,
      code: classStudent.class.code,
      image: classStudent.class.subject.image,
      status: classStudent.class.status,
      salary: classStudent.class.salary,
      extra_allowance: classStudent.class.extra_allowance,
      number_lessons: classStudent.class.number_lessons,
      number_periods: classStudent.class.number_periods,
      classroom: classStudent.class.classroom,
      credit: classStudent.class.subject.credit,
      max_students: classStudent.class.max_students,
      price: classStudent.class.price,
      current_students: Number(current_students_object[classStudent.class.id]?.count || 0),
      end_enrollment_day: classStudent.class.end_enrollment_day,
      schedule: classStudent.class.schedule,
      start_time: classStudent.class.start_time,
      end_time: classStudent.class.end_time,
      opening_day: classStudent.class.opening_day,
      closing_day: classStudent.class.closing_day,
      is_evaluate: classStudent.class.is_evaluate,
      subject: {
        id: classStudent.class.subject.id,
        code: classStudent.class.subject.code,
        name: classStudent.class.subject.name,
        credit: classStudent.class.subject.credit,
      },
      teacher: {
        id: classStudent.class.teacher.id,
        code: classStudent.class.teacher.user.code,
        full_name: classStudent.class.teacher.user.full_name,
        saint_name: classStudent.class.teacher.user.saint_name,
        email: classStudent.class.teacher.user.email,
        other_name: classStudent.class.teacher.other_name,
      },
    }))
    return { data: formattedClasses, meta }
  }

  // học sinh lấy danh sách học sinh của lớp
  async studentGetStudentsOfClass(
    class_id: number,
    getStudentsOfClassDto: GetStudentsOfClassDto,
  ): Promise<{ data: IStudent[]; meta: PaginationMeta }> {
    const { name, code, ...rest } = getStudentsOfClassDto

    const classEntity = await this.classRepository.findOne({ where: { id: class_id }, select: ['id'] })
    if (!classEntity) throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)

    const classStudents = await this.classStudentsRepository
      .createQueryBuilder('class_students')
      .select(['class_students.id', 'student.id', 'user.gender', 'user.avatar', 'user.full_name', 'user.saint_name'])
      .leftJoin('class_students.student', 'student')
      .leftJoin('student.user', 'user')
      .where('class_students.class_id = :class_id', { class_id })

    if (name) {
      classStudents.andWhere('user.full_name LIKE :name', { name: `%${name}%` })
    }
    if (code) {
      classStudents.andWhere('user.code = :code', { code })
    }

    const { data, meta } = await paginate(classStudents, rest)
    const formattedStudents: IStudent[] = data.map(classStudent => ({
      id: classStudent.student.id,
      gender: classStudent.student.user.gender,
      avatar: classStudent.student.user.avatar,
      full_name: classStudent.student.user.full_name,
      saint_name: classStudent.student.user.saint_name,
    }))
    return { data: formattedStudents, meta }
  }

  // // cronjob cuối ngày closing_day chuyển status qua END_CLASS
  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  // async cronjobUpdateClassStatus(): Promise<void> {
  //   const classes = await this.classRepository.createQueryBuilder('classes').select(['classes.id', 'classes.closing_day']).getMany()
  //   for (const classEntity of classes) {
  //     if (classEntity.closing_day < new Date().toISOString()) {
  //       await this.classRepository.update(classEntity.id, { status: ClassStatus.END_CLASS })
  //     }
  //   }
  // }

  // // cronjob cuối ngày end_enrollment_day chuyển status qua END_CLASS
  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  // async cronjobUpdateEndEnrollmentClass(): Promise<void> {
  //   const classes = await this.classRepository
  //     .createQueryBuilder('classes')
  //     .select(['classes.id', 'classes.closing_day', 'classes.end_enrollment_day'])
  //     .getMany()
  //   for (const classEntity of classes) {
  //     if (classEntity.end_enrollment_day < new Date().toISOString()) {
  //       await this.classRepository.update(classEntity.id, { status: ClassStatus.END_ENROLLING })
  //     }
  //   }
  // }

  // // cronjob đầu ngày opening_day chuyển status qua HAS_BEGUN
  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  // async cronjobUpdateOpeningClass(): Promise<void> {
  //   const classes = await this.classRepository.createQueryBuilder('classes').select(['classes.id', 'classes.opening_day']).getMany()
  //   for (const classEntity of classes) {
  //     if (classEntity.opening_day < new Date().toISOString()) {
  //       await this.classRepository.update(classEntity.id, { status: ClassStatus.HAS_BEGUN })
  //     }
  //   }
  // }

  // Cronjob: cập nhật status lớp học mỗi ngày lúc 00:00
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cronjobUpdateClassStatus(): Promise<void> {
    const classes = await this.classRepository
      .createQueryBuilder('classes')
      .select(['classes.id', 'classes.opening_day', 'classes.end_enrollment_day', 'classes.closing_day', 'classes.status'])
      .getMany()

    const today = new Date()

    for (const classEntity of classes) {
      const openingDay = classEntity.opening_day ? new Date(classEntity.opening_day) : null
      const endEnrollmentDay = classEntity.end_enrollment_day ? new Date(classEntity.end_enrollment_day) : null
      const closingDay = classEntity.closing_day ? new Date(classEntity.closing_day) : null

      let newStatus = classEntity.status

      // 1. Ưu tiên: Đã kết thúc
      if (closingDay && closingDay < today) {
        newStatus = ClassStatus.END_CLASS
      }
      // 2. Ưu tiên: Đã bắt đầu học
      else if (openingDay && openingDay <= today) {
        newStatus = ClassStatus.HAS_BEGUN
      }
      // 3. Ưu tiên: Hết hạn tuyển sinh
      else if (endEnrollmentDay && endEnrollmentDay < today) {
        newStatus = ClassStatus.END_ENROLLING
      }
      // 4. Nếu vẫn trong giai đoạn tuyển sinh
      else if (openingDay && endEnrollmentDay && openingDay > today && endEnrollmentDay > today) {
        newStatus = ClassStatus.ENROLLING
      }

      if (newStatus !== classEntity.status) {
        await this.classRepository.update(classEntity.id, { status: newStatus })
      }
    }
  }
}
