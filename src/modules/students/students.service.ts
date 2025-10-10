import { paginate, PaginationMeta } from '@common/pagination'
import { hashPassword, throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { Role } from '@enums/role.enum'
import { UserStatus } from '@enums/status.enum'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Not, Repository } from 'typeorm'
import { User } from '../users/user.entity'
import { CreateStudentsDto } from './dtos/create-students.dto'
import { PaginateStudentsDto } from './dtos/paginate-students.dto'
import { UpdateStudentsDto } from './dtos/update-students.dto'
import { Student } from './students.entity'
import { IStudent } from './students.interface'
import { Enrollments } from '@modules/enrollments/enrollments.entity'
import { BrevoMailerService } from '@services/brevo-mailer/email.service'

@Injectable()
export class StudentsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    private readonly emailService: BrevoMailerService,
  ) {}

  async createStudent(createStudentDto: CreateStudentsDto): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner()

    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const { image_4x6, diploma_image, transcript_image, other_document, card_code, ...userData } = createStudentDto
      const { password, email, code, ...rest } = userData

      // Kiểm tra email đã tồn tại
      // if (email) {
      //   const existingUser = await queryRunner.manager
      //     .getRepository(User)
      //     .createQueryBuilder('users')
      //     .where('users.email = :email', { email })
      //     .getOne()

      //   if (existingUser) throwAppException('EMAIL_ALREADY_EXISTS', ErrorCode.EMAIL_ALREADY_EXISTS, HttpStatus.CONFLICT)
      // }

      // Kiểm tra code đã tồn tại
      if (!code) throwAppException('CODE_IS_REQUIRED', ErrorCode.CODE_IS_REQUIRED, HttpStatus.BAD_REQUEST)
      if (code) {
        const existingUser = await queryRunner.manager.getRepository(User).createQueryBuilder('users').where('users.code = :code', { code }).getOne()

        if (existingUser) throwAppException('CODE_ALREADY_EXISTS', ErrorCode.CODE_ALREADY_EXISTS, HttpStatus.CONFLICT)
      }

      const hashedPassword = await hashPassword(password ?? code)
      const user = queryRunner.manager.getRepository(User).create({
        password: hashedPassword,
        role: Role.STUDENT,
        status: UserStatus.ACTIVE,
        email,
        code,
        ...rest,
      })

      await queryRunner.manager.save(User, user)

      // Kiểm tra mã student
      const existingStudent = await queryRunner.manager
        .getRepository(Student)
        .createQueryBuilder('students')
        .where('students.user_id = :user_id', { user_id: user.id })
        .getOne()

      if (existingStudent) throwAppException('STUDENT_ALREADY_EXISTS', ErrorCode.STUDENT_ALREADY_EXISTS, HttpStatus.CONFLICT)

      // Kiểm tra mã thẻ của học viên
      if (card_code) {
        const existingStudent = await queryRunner.manager.getRepository(Student).exists({ where: { card_code } })
        if (existingStudent) throwAppException('STUDENT_CARD_CODE_ALREADY_EXISTS', ErrorCode.STUDENT_CARD_CODE_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
      }

      const student = queryRunner.manager.getRepository(Student).create({
        user_id: user.id,
        image_4x6: image_4x6 ?? null,
        diploma_image: diploma_image ?? null,
        transcript_image: transcript_image ?? null,
        other_document: other_document ?? null,
        graduate: false,
        graduate_year: null,
        card_code: card_code ?? null,
      })

      await queryRunner.manager.save(Student, student)

      // Send email
      if (email) {
        await this.emailService.sendMail([{ email: email, name: user.full_name }], 'Đăng ký tài khoản thành công', 'register-success', {
          name: user.full_name,
          username: user.code,
          password: password ?? code,
          loginLink: `${process.env.FRONTEND_URL}`,
        })
      }

      await queryRunner.commitTransaction()

      return
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async updateStudent(id: number, updateStudentDto: UpdateStudentsDto): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner()

    await queryRunner.connect()
    await queryRunner.startTransaction()

    const { image_4x6, diploma_image, transcript_image, other_document, graduate, graduate_year, card_code, ...userData } = updateStudentDto
    const { email, ...rest } = userData

    try {
      const studentRepo = queryRunner.manager.getRepository(Student)
      const userRepo = queryRunner.manager.getRepository(User)
      const enrollmentsRepo = queryRunner.manager.getRepository(Enrollments)

      const student = await studentRepo.findOne({ where: { id } })
      if (!student) throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)

      const user = await userRepo.findOne({ where: { id: student.user_id } })
      if (!user) throwAppException('USER_NOT_FOUND', ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND)

      // // Check duplicate email
      // if (email) {
      //   const existingUser = await userRepo
      //     .createQueryBuilder('users')
      //     .where('users.email = :email', { email })
      //     .andWhere('users.id != :id', { id: user.id })
      //     .getOne()
      //   if (existingUser) throwAppException('EMAIL_ALREADY_EXISTS', ErrorCode.EMAIL_ALREADY_EXISTS, HttpStatus.CONFLICT)
      // }

      // Cập nhật user: merge dữ liệu mới vào dữ liệu cũ
      const updatedUser = userRepo.merge(user, {
        email: email ?? user.email,
        ...rest,
      })
      await userRepo.save(updatedUser)

      // cập nhật thông tin các enrollments
      const enrollments = await enrollmentsRepo.find({ where: { student_id: student.id } })
      if (enrollments.length > 0) {
        for (const enrollment of enrollments) {
          await enrollmentsRepo.update(enrollment.id, {
            email: email ?? enrollment.email,
            full_name: user.full_name ?? enrollment.full_name,
            saint_name: user.saint_name ?? enrollment.saint_name,
            phone_number: user.phone_number ?? enrollment.phone_number,
            birth_date: user.birth_date ?? enrollment.birth_date,
            address: user.address ?? enrollment.address,
            birth_place: user.birth_place ?? enrollment.birth_place,
            parish: user.parish ?? enrollment.parish,
            deanery: user.deanery ?? enrollment.deanery,
            diocese: user.diocese ?? enrollment.diocese,
            congregation: user.congregation ?? enrollment.congregation,
          })
        }
      }

      // Kiểm tra mã thẻ của học viên
      if (card_code) {
        const existingStudent = await studentRepo.exists({ where: { card_code, id: Not(student.id) } })
        if (existingStudent) throwAppException('STUDENT_CARD_CODE_ALREADY_EXISTS', ErrorCode.STUDENT_CARD_CODE_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
      }

      // Cập nhật student: merge tương tự
      const updatedStudent = studentRepo.merge(student, {
        image_4x6: image_4x6 ?? student.image_4x6,
        diploma_image: diploma_image ?? student.diploma_image,
        transcript_image: transcript_image ?? student.transcript_image,
        other_document: other_document ?? student.other_document,
        graduate: graduate ?? student.graduate,
        graduate_year: graduate_year ?? student.graduate_year,
        card_code: card_code ?? student.card_code,
      })
      await studentRepo.save(updatedStudent)

      await queryRunner.commitTransaction()

      return
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async deleteStudent(id: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner()

    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const studentRepo = queryRunner.manager.getRepository(Student)
      const userRepo = queryRunner.manager.getRepository(User)

      const student = await studentRepo.findOne({ where: { id } })
      if (!student) throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)

      const user = await userRepo.findOne({ where: { id: student.user_id } })
      if (!user) throwAppException('USER_NOT_FOUND', ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND)

      // nếu student có trong enrollments thì không xóa
      const enrollments = await queryRunner.manager.getRepository(Enrollments).exists({ where: { student_id: student.id } })
      if (enrollments) throwAppException('STUDENT_HAS_ENROLLMENTS', ErrorCode.STUDENT_HAS_ENROLLMENTS, HttpStatus.BAD_REQUEST)

      await studentRepo.delete(student.id)
      await userRepo.delete(user.id)

      await queryRunner.commitTransaction()
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async getStudentById(id: number) {
    const student = await this.studentRepository
      .createQueryBuilder('students')
      .leftJoinAndSelect('students.user', 'user')
      .select([
        'students.id',
        'students.card_code',
        'students.image_4x6',
        'students.diploma_image',
        'students.transcript_image',
        'students.other_document',
        'user.id',
        'user.code',
        'user.full_name',
        'user.email',
        'user.gender',
        'user.phone_number',
        'user.saint_name',
        'user.address',
        'user.avatar',
        'user.birth_place',
        'user.birth_date',
        'user.parish',
        'user.deanery',
        'user.diocese',
        'user.congregation',
        'user.status',
        'students.graduate',
        'students.graduate_year',
      ])
      .where('students.id = :id', { id })
      .getOne()

    if (!student) throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)

    const formattedStudent = {
      id: student.id,
      code: student.user.code,
      full_name: student.user.full_name,
      email: student.user.email,
      gender: student.user.gender,
      phone_number: student.user.phone_number,
      status: student.user.status,
      saint_name: student.user.saint_name,
      address: student.user.address,
      avatar: student.user.avatar,
      birth_place: student.user.birth_place,
      birth_date: student.user.birth_date,
      parish: student.user.parish,
      deanery: student.user.deanery,
      diocese: student.user.diocese,
      congregation: student.user.congregation,
      card_code: student.card_code,
      image_4x6: student.image_4x6,
      diploma_image: student.diploma_image,
      transcript_image: student.transcript_image,
      other_document: student.other_document,
      graduate: student.graduate,
      graduate_year: student.graduate_year,
    }
    return formattedStudent
  }

  async getAllStudents(paginateStudentsDto: PaginateStudentsDto): Promise<{ data: IStudent[]; meta: PaginationMeta }> {
    const { full_name, email, phone_number, status, code, class_name, class_code, class_id, semester_id, department_id, scholastic_id, ...rest } =
      paginateStudentsDto

    // base query: students + user
    const query = this.studentRepository.createQueryBuilder('students').leftJoinAndSelect('students.user', 'user')

    // Determine if we need to join class_students + classes (bridge)
    const needClassJoin = Boolean(class_code || class_id || semester_id || department_id || scholastic_id || class_name)

    if (needClassJoin) {
      // join once and reuse aliases
      query.leftJoin('students.class_students', 'class_students')
      query.leftJoin('class_students.class', 'class')
    }

    // If department filter is present, we need subject -> department joins
    if (department_id) {
      // join class.subject -> subject and subject.department -> department
      query.leftJoin('class.subject', 'subject')
      query.leftJoin('subject.department', 'department')
    }

    // Filters on user fields
    if (full_name) {
      query.andWhere('user.full_name LIKE :full_name', { full_name: `%${full_name}%` })
    }

    if (email) {
      query.andWhere('user.email LIKE :email', { email: `%${email}%` })
    }

    if (phone_number) {
      query.andWhere('user.phone_number LIKE :phone_number', { phone_number: `%${phone_number}%` })
    }

    if (status) {
      query.andWhere('user.status = :status', { status })
    }

    if (code) {
      query.andWhere('user.code LIKE :code', { code: `%${code}%` })
    }

    // Class-related filters (only valid if we already joined class_students/class)
    if (class_name) {
      query.andWhere('class.name LIKE :class_name', { class_name: `%${class_name}%` })
    }

    if (class_code) {
      query.andWhere('class.code LIKE :class_code', { class_code: `%${class_code}%` })
    }

    if (class_id) {
      query.andWhere('class.id = :class_id', { class_id })
    }

    if (semester_id) {
      query.andWhere('class.semester_id = :semester_id', { semester_id })
    }

    if (scholastic_id) {
      query.andWhere('class.scholastic_id = :scholastic_id', { scholastic_id })
    }

    if (department_id) {
      // department_id sits on subject.department_id
      query.andWhere('subject.department_id = :department_id', { department_id })
      // or if you joined department entity: `department.id = :department_id`
    }

    // ensure soft-delete filter
    query.andWhere('students.deleted_at IS NULL')

    // pagination (reuse your paginate util)
    const { data, meta } = await paginate(query, rest)

    // format results same as before
    const formattedStudents = data.map(student => ({
      id: student.id,
      code: student.user?.code,
      full_name: student.user?.full_name,
      email: student.user?.email,
      gender: student.user?.gender,
      phone_number: student.user?.phone_number,
      status: student.user?.status,
      saint_name: student.user?.saint_name,
      address: student.user?.address,
      avatar: student.user?.avatar,
      birth_place: student.user?.birth_place,
      birth_date: student.user?.birth_date,
      parish: student.user?.parish,
      deanery: student.user?.deanery,
      diocese: student.user?.diocese,
      congregation: student.user?.congregation,
      card_code: student.card_code,
      image_4x6: student.image_4x6,
      diploma_image: student.diploma_image,
      transcript_image: student.transcript_image,
      other_document: student.other_document,
      graduate: student.graduate,
      graduate_year: student.graduate_year,
    }))
    return {
      data: formattedStudents,
      meta,
    }
  }

  // async createStudentCardCode(createStudentCardCodeDto: CreateStudentCardCodeDto): Promise<void> {
  //   const { card_code, user_id } = createStudentCardCodeDto

  //   const student = await this.studentRepository.findOne({ where: { user_id } })
  //   if (!student) throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)

  //   const existingStudent = await this.studentRepository.exists({ where: { card_code } })
  //   if (existingStudent) throwAppException('STUDENT_CARD_CODE_ALREADY_EXISTS', ErrorCode.STUDENT_CARD_CODE_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)

  //   // check student đã có card_code chưa
  //   if (student.card_code) throwAppException('STUDENT_HAD_CARD_CODE', ErrorCode.STUDENT_HAD_CARD_CODE, HttpStatus.BAD_REQUEST)

  //   await this.studentRepository.update(student.id, { card_code })
  //   return
  // }

  // async updateStudentCardCode(updateStudentCardCodeDto: UpdateStudentCardCodeDto): Promise<void> {
  //   const { card_code, user_id } = updateStudentCardCodeDto

  //   const student = await this.studentRepository.findOne({ where: { user_id } })
  //   if (!student) throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)

  //   const existingStudent = await this.studentRepository.exists({ where: { card_code, id: Not(student.id) } })
  //   if (existingStudent) {
  //     throwAppException('STUDENT_CARD_CODE_ALREADY_EXISTS', ErrorCode.STUDENT_CARD_CODE_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
  //   }

  //   await this.studentRepository.update(student.id, { card_code })
  //   return
  // }
}
