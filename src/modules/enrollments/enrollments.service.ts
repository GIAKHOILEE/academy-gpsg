import { HttpStatus, Injectable } from '@nestjs/common'
import { Enrollments } from './enrollments.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, FindManyOptions, In, Repository } from 'typeorm'
import { CreateEnrollmentsDto } from './dtos/create-enrollments.dto'
import { ErrorCode } from '@enums/error-codes.enum'
import { generateRandomString, throwAppException } from '@common/utils'
import { Student } from '@modules/students/students.entity'
import { Classes } from '@modules/class/class.entity'
import { ClassStatus, StatusEnrollment } from '@enums/class.enum'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { IEnrollments } from './enrollments.interface'
import { Role } from '@enums/role.enum'
import { UserService } from '@modules/users/user.service'
import { CreateStudentsDto, CreateStudentWithEnrollmentDto } from '@modules/students/dtos/create-students.dto'
import { StudentsService } from '@modules/students/students.service'
import { User } from '@modules/users/user.entity'
import { UserStatus } from '@enums/status.enum'
import { paginate, PaginationMeta } from '@common/pagination'
import { PaginateEnrollmentsDto } from './dtos/paginate-enrollments.dto'

@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Enrollments)
    private readonly enrollmentsRepository: Repository<Enrollments>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Classes)
    private readonly classRepository: Repository<Classes>,
    @InjectRepository(ClassStudents)
    private readonly classStudentsRepository: Repository<ClassStudents>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createEnrollment(createEnrollmentDto: CreateEnrollmentsDto, isLogged: boolean, studentId?: number): Promise<IEnrollments> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      const { class_ids } = createEnrollmentDto
      // check student
      // có studentId là có đăng nhập, không có studentId là không đăng nhập
      let studentEntity: Student | null = null
      if (studentId) {
        studentEntity = await this.studentRepository
          .createQueryBuilder('student')
          .select([
            'student.id',
            'user.full_name',
            'user.code',
            'user.email',
            'user.phone_number',
            'user.saint_name',
            'user.address',
            'user.birth_date',
            'user.birth_place',
            'user.parish',
            'user.deanery',
            'user.diocese',
            'user.congregation',
          ])
          .leftJoin('student.user', 'user')
          .where('student.id = :id', { id: studentId })
          .getOne()
        if (!studentEntity) throwAppException(ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)

        createEnrollmentDto.saint_name = studentEntity.user.saint_name
        createEnrollmentDto.full_name = studentEntity.user.full_name
        createEnrollmentDto.email = studentEntity.user.email
        createEnrollmentDto.phone_number = studentEntity.user.phone_number
        createEnrollmentDto.address = studentEntity.user.address
        createEnrollmentDto.birth_date = studentEntity.user.birth_date
        createEnrollmentDto.birth_place = studentEntity.user.birth_place
        createEnrollmentDto.parish = studentEntity.user.parish
        createEnrollmentDto.deanery = studentEntity.user.deanery
        createEnrollmentDto.diocese = studentEntity.user.diocese
        createEnrollmentDto.congregation = studentEntity.user.congregation
      } else {
        // Nếu không đăng nhập thì tạo user/student mới và gắn is_temporary = true
        const newStudent = {
          full_name: createEnrollmentDto.full_name,
          email: createEnrollmentDto.email,
          phone_number: createEnrollmentDto.phone_number,
          address: createEnrollmentDto.address,
          birth_date: createEnrollmentDto.birth_date,
          birth_place: createEnrollmentDto.birth_place,
          parish: createEnrollmentDto.parish,
          deanery: createEnrollmentDto.deanery,
          diocese: createEnrollmentDto.diocese,
          congregation: createEnrollmentDto.congregation,
          is_temporary: true,
        }
        const user = queryRunner.manager.getRepository(User).create({
          role: Role.STUDENT,
          status: UserStatus.ACTIVE,
          ...newStudent,
        })

        await queryRunner.manager.save(User, user)

        const student = queryRunner.manager.getRepository(Student).create({
          user_id: user.id,
          graduate: false,
          graduate_year: null,
          is_temporary: true,
        })

        await queryRunner.manager.save(Student, student)
      }

      // check class
      const classEntities = await this.classRepository
        .createQueryBuilder('class')
        .select(['class.id', 'class.name', 'class.price', 'class.start_date', 'class.end_date', 'class.status'])
        .where('class.id IN (:...class_ids)', { class_ids })
        .andWhere('class.status = :status', { status: ClassStatus.ENROLLING })
        .getMany()
      if (classEntities.length !== class_ids.length) throwAppException(ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)

      // Tổng tiền học
      const totalFee = classEntities.reduce((acc, curr) => acc + curr.price, 0)

      const enrollment = this.enrollmentsRepository.create({
        ...createEnrollmentDto,
        is_logged: isLogged,
        code: generateRandomString(5),
        class_ids,
        total_fee: totalFee,
      })
      const savedEnrollment = await this.enrollmentsRepository.save(enrollment)

      const formatEnrollment: IEnrollments = {
        ...savedEnrollment,
        student_id: studentId || null,
        student_code: studentId ? studentEntity.user.code : null,
        saint_name: createEnrollmentDto.saint_name,
        full_name: createEnrollmentDto.full_name,
        email: createEnrollmentDto.email,
        phone_number: createEnrollmentDto.phone_number,
        address: createEnrollmentDto.address,
        birth_date: createEnrollmentDto.birth_date,
        birth_place: createEnrollmentDto.birth_place,
        parish: createEnrollmentDto.parish,
        deanery: createEnrollmentDto.deanery,
        diocese: createEnrollmentDto.diocese,
        congregation: createEnrollmentDto.congregation,
      }
      // Tạo class-students ---- khi nào chỉnh qua 3 loại status mới lưu vào class-students
      // const classStudents = classEntities.map(classEntity => {
      //   return {
      //     class_id: classEntity.id,
      //     student_id: studentId || null,
      //   }
      // })
      // await this.classStudentsRepository.save(classStudents)

      return formatEnrollment
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async getEnrollmentById(id: number): Promise<IEnrollments> {
    const enrollment = await this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      .select(['enrollment.*', 'student.user.code', 'student.id'])
      .leftJoin('enrollment.student', 'student')
      .leftJoin('student.user', 'user')
      .where('enrollment.id = :id', { id })
      .getOne()
    if (!enrollment) throwAppException(ErrorCode.ENROLLMENT_NOT_FOUND, HttpStatus.NOT_FOUND)

    const listClass = await this.classRepository
      .createQueryBuilder('class')
      .select(['class.id', 'class.name', 'class.price', 'class.code'])
      .where('class.id IN (:...class_ids)', { class_ids: enrollment.class_ids })
      .getRawMany()
    if (listClass.length !== enrollment.class_ids.length) throwAppException(ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)

    const formatEnrollment: IEnrollments = {
      id: enrollment.id,
      code: enrollment.code,
      registration_date: enrollment.registration_date,
      payment_method: enrollment.payment_method,
      payment_status: enrollment.payment_status,
      status: enrollment.status,
      total_fee: enrollment.total_fee,
      prepaid: enrollment.prepaid,
      debt: enrollment.debt,
      note: enrollment.note,
      is_logged: enrollment.is_logged,
      classes: listClass.map(classEntity => ({
        id: classEntity.id,
        name: classEntity.name,
        code: classEntity.code,
        price: classEntity.price,
      })),
      student_id: enrollment.student.id,
      student_code: enrollment.student.user.code,
      saint_name: enrollment.saint_name,
      full_name: enrollment.full_name,
      email: enrollment.email,
      phone_number: enrollment.phone_number,
      address: enrollment.address,
      birth_date: enrollment.birth_date,
      birth_place: enrollment.birth_place,
      parish: enrollment.parish,
      deanery: enrollment.deanery,
      diocese: enrollment.diocese,
      congregation: enrollment.congregation,
    }

    return formatEnrollment
  }

  async getManyEnrollment(paginateEnrollmentsDto: PaginateEnrollmentsDto): Promise<{
    data: IEnrollments[]
    meta: PaginationMeta
    summary: {
      total_revenue: number
      total_prepaid: number
      total_debt: number
      total_fee: number
    }
  }> {
    const queryBuilder = this.enrollmentsRepository.createQueryBuilder('enrollment')
    queryBuilder.select([
      'enrollment.id',
      'enrollment.code',
      'enrollment.registration_date',
      'enrollment.payment_method',
      'enrollment.payment_status',
      'enrollment.status',
      'enrollment.total_fee',
      'enrollment.prepaid',
      'enrollment.debt',
      'enrollment.is_logged',
      'enrollment.saint_name',
      'enrollment.full_name',
      'enrollment.email',
      'enrollment.phone_number',
      'enrollment.address',
      'student.id',
      'student.user.code',
    ])
    queryBuilder.leftJoin('enrollment.student', 'student')
    queryBuilder.leftJoin('student.user', 'user')
    queryBuilder.where('enrollment.status != :status', { status: StatusEnrollment.DELETED })

    const { data, meta } = await paginate(queryBuilder, paginateEnrollmentsDto)

    const formatEnrollments: IEnrollments[] = data.map(enrollment => {
      return {
        ...enrollment,
        student_id: enrollment.student.id,
        student_code: enrollment.student.user.code,
        saint_name: enrollment.saint_name,
        full_name: enrollment.full_name,
        email: enrollment.email,
        phone_number: enrollment.phone_number,
        address: enrollment.address,
      }
    })

    // Tính tổng tiền đã trả & chưa trả
    const totalResult = await this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      .select('SUM(enrollment.prepaid)', 'total_prepaid')
      .addSelect('SUM(enrollment.debt)', 'total_debt')
      .addSelect('SUM(enrollment.total_fee)', 'total_fee')
      .where('enrollment.status != :status', { status: StatusEnrollment.DELETED })
      .getRawOne()

    return {
      data: formatEnrollments,
      meta,
      summary: {
        total_revenue: totalResult.total_prepaid + totalResult.total_debt + totalResult.total_fee,
        total_prepaid: totalResult.total_prepaid,
        total_debt: totalResult.total_debt,
        total_fee: totalResult.total_fee,
      },
    }
  }
}
