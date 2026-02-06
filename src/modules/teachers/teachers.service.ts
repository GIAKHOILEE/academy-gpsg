import { HttpStatus, Injectable } from '@nestjs/common'

import { paginate, PaginationMeta } from '@common/pagination'
import { arrayToObject, hashPassword, throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { Role } from '@enums/role.enum'
import { UserStatus } from '@enums/status.enum'
import { User } from '@modules/users/user.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { CreateTeachersDto } from './dtos/create-teachers.dto'
import { PaginateTeacherClassesDto, PaginateTeachersDto } from './dtos/paginate-teachers.dto'
import { UpdateTeachersDto } from './dtos/update-teachers.dto'
import { Teacher } from './teachers.entity'
import { Classes } from '../class/class.entity'
import { BrevoMailerService } from '@services/brevo-mailer/email.service'
import { IClasses } from '@modules/class/class.interface'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'

@Injectable()
export class TeachersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(Classes)
    private readonly classRepository: Repository<Classes>,
    @InjectRepository(ClassStudents)
    private readonly classStudentsRepository: Repository<ClassStudents>,
    private readonly emailService: BrevoMailerService,
  ) {}

  async createTeacher(createTeacherDto: CreateTeachersDto): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const {
        other_name,
        degree,
        specialized,
        professional_certificate,
        teacher_certificate,
        subject_teaching,
        boarding,
        start_date,
        cv,
        bank_name,
        bank_account_number,
        bank_account_name,
        bank_branch,
        ...userData
      } = createTeacherDto
      const { password, email, code, full_name, ...rest } = userData

      // Kiểm tra email đã tồn tại
      if (email) {
        const existingUser = await queryRunner.manager
          .getRepository(User)
          .createQueryBuilder('users')
          .where('users.email = :email', { email })
          .getOne()

        if (existingUser) throwAppException('EMAIL_ALREADY_EXISTS', ErrorCode.EMAIL_ALREADY_EXISTS, HttpStatus.CONFLICT)
      }

      // Kiểm tra code đã tồn tại
      if (!code) throwAppException('CODE_IS_REQUIRED', ErrorCode.CODE_IS_REQUIRED, HttpStatus.BAD_REQUEST)
      if (code) {
        const existingUser = await queryRunner.manager.getRepository(User).createQueryBuilder('users').where('users.code = :code', { code }).getOne()

        if (existingUser) throwAppException('CODE_ALREADY_EXISTS', ErrorCode.CODE_ALREADY_EXISTS, HttpStatus.CONFLICT)
      }

      // từ full name tách ra first name
      const first_name = full_name.split(' ')[0]

      const hashedPassword = await hashPassword(password ?? code)
      const user = queryRunner.manager.getRepository(User).create({
        password: hashedPassword,
        role: Role.TEACHER,
        status: UserStatus.ACTIVE,
        email,
        code,
        full_name,
        first_name,
        ...rest,
      })

      await queryRunner.manager.save(User, user)

      const teacher = queryRunner.manager.getRepository(Teacher).create({
        user_id: user.id,
        other_name,
        degree,
        specialized,
        professional_certificate,
        teacher_certificate,
        subject_teaching,
        boarding,
        start_date,
        cv,
        bank_name,
        bank_account_number,
        bank_account_name,
        bank_branch,
      })

      await queryRunner.manager.save(Teacher, teacher)

      // Send email
      // if (email) {
      //   await this.emailService.sendMail([{ email: email, name: user.full_name }], 'Đăng ký tài khoản thành công', 'register-success', {
      //     name: user.full_name,
      //     username: user.code,
      //     password: password ?? code,
      //     loginLink: `${process.env.FRONTEND_URL}`,
      //   })
      // }

      await queryRunner.commitTransaction()
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async updateTeacher(id: number, updateTeacherDto: UpdateTeachersDto): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const {
        code,
        other_name,
        degree,
        specialized,
        professional_certificate,
        teacher_certificate,
        other_certificate,
        subject_teaching,
        boarding,
        start_date,
        cv,
        bank_name,
        bank_account_number,
        bank_account_name,
        bank_branch,
        ...userData
      } = updateTeacherDto
      const { email, full_name, password, ...rest } = userData

      const teacher = await queryRunner.manager.getRepository(Teacher).findOne({ where: { id } })
      if (!teacher) throwAppException('TEACHER_NOT_FOUND', ErrorCode.TEACHER_NOT_FOUND, HttpStatus.NOT_FOUND)

      const user = await queryRunner.manager.getRepository(User).findOne({ where: { id: teacher.user_id } })
      if (!user) throwAppException('USER_NOT_FOUND', ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND)

      // Check duplicate email
      if (email) {
        const existingUser = await queryRunner.manager
          .getRepository(User)
          .createQueryBuilder('users')
          .where('users.email = :email', { email })
          .andWhere('users.id != :id', { id: user.id })
          .getOne()
        if (existingUser) throwAppException('EMAIL_ALREADY_EXISTS', ErrorCode.EMAIL_ALREADY_EXISTS, HttpStatus.CONFLICT)
      }

      // Check duplicate code
      if (code) {
        const existingUser = await queryRunner.manager
          .getRepository(User)
          .createQueryBuilder('users')
          .where('users.code = :code', { code })
          .andWhere('users.id != :id', { id: user.id })
          .getOne()
        if (existingUser) throwAppException('CODE_ALREADY_EXISTS', ErrorCode.CODE_ALREADY_EXISTS, HttpStatus.CONFLICT)
      }

      // từ full name tách ra first name
      const first_name = full_name.split(' ')[0]
      const hashedPassword = password ? await hashPassword(password) : user.password

      const updatedUser = queryRunner.manager.getRepository(User).merge(user, {
        email: email ?? user.email,
        code: code ?? user.code,
        full_name: full_name ?? user.full_name,
        first_name: first_name ?? user.first_name,
        password: hashedPassword,
        ...rest,
      })
      await queryRunner.manager.save(User, updatedUser)

      const updatedTeacher = queryRunner.manager.getRepository(Teacher).merge(teacher, {
        other_name: other_name,
        degree: degree,
        specialized: specialized,
        professional_certificate: professional_certificate,
        teacher_certificate: teacher_certificate,
        other_certificate: other_certificate,
        subject_teaching: subject_teaching,
        boarding: boarding,
        start_date: start_date,
        cv: cv,
        bank_name: bank_name,
        bank_account_number: bank_account_number,
        bank_account_name: bank_account_name,
        bank_branch: bank_branch,
      })
      await queryRunner.manager.save(Teacher, updatedTeacher)
      await queryRunner.commitTransaction()
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async deleteTeacher(id: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const classes = await queryRunner.manager.getRepository(Classes).exists({ where: { teacher_id: id } })
      if (classes) throwAppException('TEACHER_HAS_CLASSES', ErrorCode.TEACHER_HAS_CLASSES, HttpStatus.BAD_REQUEST)

      const teacher = await queryRunner.manager.getRepository(Teacher).findOne({ where: { id } })
      if (!teacher) throwAppException('TEACHER_NOT_FOUND', ErrorCode.TEACHER_NOT_FOUND, HttpStatus.NOT_FOUND)

      await queryRunner.manager.getRepository(Teacher).update(id, { deleted_at: new Date() })
      await queryRunner.commitTransaction()
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async getTeacherById(id: number) {
    const teacher = await this.teacherRepository
      .createQueryBuilder('teachers')
      .leftJoinAndSelect('teachers.user', 'user')
      .where('teachers.id = :id', { id })
      .getOne()
    if (!teacher) throwAppException('TEACHER_NOT_FOUND', ErrorCode.TEACHER_NOT_FOUND, HttpStatus.NOT_FOUND)

    const formattedTeacher = {
      id: teacher.id,
      code: teacher.user.code,
      full_name: teacher.user.full_name,
      first_name: teacher.user.first_name,
      email: teacher.user.email,
      gender: teacher.user.gender,
      phone_number: teacher.user.phone_number,
      status: teacher.user.status,
      saint_name: teacher.user.saint_name,
      address: teacher.user.address,
      avatar: teacher.user.avatar,
      birth_place: teacher.user.birth_place,
      birth_date: teacher.user.birth_date,
      parish: teacher.user.parish,
      deanery: teacher.user.deanery,
      diocese: teacher.user.diocese,
      congregation: teacher.user.congregation,
      other_name: teacher.other_name,
      degree: teacher.degree,
      specialized: teacher.specialized,
      professional_certificate: teacher.professional_certificate,
      teacher_certificate: teacher.teacher_certificate,
      other_certificate: teacher?.other_certificate,
      subject_teaching: teacher.subject_teaching,
      boarding: teacher.boarding,
      start_date: teacher.start_date,
      cv: teacher.cv,
      bank_name: teacher.bank_name,
      bank_account_number: teacher.bank_account_number,
      bank_account_name: teacher.bank_account_name,
      bank_branch: teacher.bank_branch,
    }
    return formattedTeacher
  }

  async getTeachers(paginateTeachersDto: PaginateTeachersDto) {
    const {
      full_name,
      email,
      phone_number,
      status,
      class_name,
      class_code,
      class_status,
      class_id,
      semester_id,
      department_id,
      scholastic_id,
      first_name,
      ...rest
    } = paginateTeachersDto
    const query = this.teacherRepository.createQueryBuilder('teachers').leftJoinAndSelect('teachers.user', 'user')

    // Join tới classes (bảng classes) để filter theo lớp
    // (dùng left join vì teacher có thể chưa có class)
    query.leftJoin('classes', 'classes', 'classes.teacher_id = teachers.id')

    // Nếu cần filter department, join subject để lấy subject.department_id
    // (giả sử bảng subject tên là 'subjects' và trường id là subject.id)
    query.leftJoin('subjects', 'subject', 'subject.id = classes.subject_id')

    // luôn chỉ lấy teachers chưa bị xóa
    query.where('teachers.deleted_at IS NULL')

    if (full_name) {
      query.andWhere('user.full_name LIKE :full_name', { full_name: `%${full_name}%` })
    }

    if (first_name) {
      query.andWhere('user.first_name LIKE :first_name', { first_name: `%${first_name}%` })
    }

    if (email) {
      query.andWhere('user.email = :email', { email })
    }

    if (phone_number) {
      query.andWhere('user.phone_number = :phone_number', { phone_number })
    }

    if (status) {
      query.andWhere('user.status = :status', { status })
    }

    // Các filter liên quan tới class / subject
    if (class_name) {
      query.andWhere('classes.name LIKE :class_name', { class_name: `%${class_name}%` })
    }

    if (class_code) {
      query.andWhere('classes.code = :class_code', { class_code })
    }

    if (class_id) {
      query.andWhere('classes.id = :class_id', { class_id })
    }

    if (class_status) {
      query.andWhere('classes.status = :class_status', { class_status })
    }

    if (semester_id) {
      query.andWhere('classes.semester_id = :semester_id', { semester_id })
    }

    if (scholastic_id) {
      query.andWhere('classes.scholastic_id = :scholastic_id', { scholastic_id })
    }

    if (department_id) {
      // department lưu ở subject.department_id
      query.andWhere('subject.department_id = :department_id', { department_id })
    }

    if (rest.orderBy === 'first_name') {
      rest.anotherOrderBy = 'user.first_name'
    }

    query.distinct(true)

    const { data, meta } = await paginate(query, rest)

    const formattedTeachers = data.map(teacher => ({
      id: teacher.id,
      code: teacher.user.code,
      full_name: teacher.user.full_name,
      first_name: teacher.user.first_name,
      email: teacher.user.email,
      gender: teacher.user.gender,
      phone_number: teacher.user.phone_number,
      status: teacher.user.status,
      saint_name: teacher.user.saint_name,
      address: teacher.user.address,
      avatar: teacher.user.avatar,
      birth_place: teacher.user.birth_place,
      birth_date: teacher.user.birth_date,
      parish: teacher.user.parish,
      deanery: teacher.user.deanery,
      diocese: teacher.user.diocese,
      congregation: teacher.user.congregation,
      other_name: teacher.other_name,
      degree: teacher.degree,
      specialized: teacher.specialized,
      professional_certificate: teacher.professional_certificate,
      teacher_certificate: teacher.teacher_certificate,
      subject_teaching: teacher.subject_teaching,
      boarding: teacher.boarding,
      start_date: teacher.start_date,
      cv: teacher.cv,
      bank_name: teacher.bank_name,
      bank_account_number: teacher.bank_account_number,
      bank_account_name: teacher.bank_account_name,
      bank_branch: teacher.bank_branch,
    }))

    return {
      data: formattedTeachers,
      meta,
    }
  }

  // lấy danh sách lớp của giáo viên
  async getAllClassesOfTeacher(userId: number, paginateClassDto: PaginateTeacherClassesDto): Promise<{ data: IClasses[]; meta: PaginationMeta }> {
    const { classroom, is_online, is_free, status, ...rest } = paginateClassDto
    console.log(classroom, is_online, is_free, status, rest)
    const query = this.classRepository
      .createQueryBuilder('classes')
      .leftJoinAndSelect('classes.subject', 'subject')
      .leftJoinAndSelect('subject.department', 'department')
      .leftJoinAndSelect('classes.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'user')
      .leftJoinAndSelect('classes.scholastic', 'scholastic')
      .leftJoinAndSelect('classes.semester', 'semester')

    query.andWhere('teacher.user_id = :userId', { userId })

    if (classroom) {
      query.andWhere('classes.classroom = :classroom', { classroom })
    }

    if (is_online !== undefined) {
      console.log(is_online)
      console.log(typeof is_online)
      query.andWhere('classes.is_online = :is_online', { is_online })
    }

    if (is_free !== undefined) {
      query.andWhere('classes.is_free = :is_free', { is_free })
    }

    if (status) {
      query.andWhere('classes.status = :status', { status })
    }

    const { data, meta } = await paginate(query, rest)
    console.log(data, meta)
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
      number_lessons: classEntity.number_lessons,
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
      is_online: classEntity.is_online,
      is_free: classEntity.is_free,
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
}
