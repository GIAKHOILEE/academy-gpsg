import { paginate } from '@common/pagination'
import {
  arrayToObject,
  formatCurrency,
  formatStringDate,
  generateRandomString,
  hashPassword,
  mapScheduleToVietnamese,
  renderPdfFromTemplate,
  throwAppException,
} from '@common/utils'
import { ClassStatus, PaymentMethod, PaymentStatus, StatusEnrollment } from '@enums/class.enum'
import { ErrorCode } from '@enums/error-codes.enum'
import { Role } from '@enums/role.enum'
import { UserStatus } from '@enums/status.enum'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { Classes } from '@modules/class/class.entity'
import { Student } from '@modules/students/students.entity'
import { User } from '@modules/users/user.entity'
import { HttpStatus, Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { BrevoMailerService } from '@services/brevo-mailer/email.service'
import * as fs from 'fs'
import * as path from 'path'
import { DataSource, In, Repository } from 'typeorm'
import { CreateEnrollmentsDto } from './dtos/create-enrollments.dto'
import { PaginateEnrollmentsDto } from './dtos/paginate-enrollments.dto'
import { UpdateEnrollmentsDto } from './dtos/update-enrollments.dto'
import { Enrollments } from './enrollments.entity'
import { IEnrollments } from './enrollments.interface'
import { Voucher } from '@modules/voucher/voucher.entity'
import { VoucherType } from '@enums/voucher.enum'
import { Footer } from '@modules/footer/footer.entity'
import { FooterEnum } from '@enums/footer.enum'

const logoBuffer = fs.readFileSync(path.resolve(__dirname, '..', '..', 'assets', 'logo.jpg'))
const backgroundBuffer = fs.readFileSync(path.resolve(__dirname, '..', '..', 'assets', 'background.png'))
const stampBuffer = fs.readFileSync(path.resolve(__dirname, '..', '..', 'assets', 'stamp.png'))
const qrCodeBuffer = fs.readFileSync(path.resolve(__dirname, '..', '..', 'assets', 'QR_code.png'))
const logo = `data:image/jpeg;base64,${logoBuffer.toString('base64')}`
const background = `data:image/png;base64,${backgroundBuffer.toString('base64')}`
const stamp = `data:image/png;base64,${stampBuffer.toString('base64')}`
const qrCode = `data:image/png;base64,${qrCodeBuffer.toString('base64')}`

const now = new Date()
const day = now.getDate()
const month = now.getMonth() + 1 // Vì getMonth() trả từ 0–11
const year = now.getFullYear()
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
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    private readonly emailService: BrevoMailerService,
    @InjectRepository(Footer)
    private readonly footerRepository: Repository<Footer>,
  ) {}

  async createEnrollmentV2(createEnrollmentDto: CreateEnrollmentsDto, isLogged: boolean, userId?: number): Promise<IEnrollments> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      const { class_ids } = createEnrollmentDto
      // check student
      // có studentId là có đăng nhập, không có studentId là không đăng nhập
      let studentEntity: Student | null = null
      let studentId: number | null = null
      if (userId) {
        studentId = await this.studentRepository
          .createQueryBuilder('student')
          .select(['student.id'])
          .where('student.user_id = :userId', { userId })
          .getOne()
          .then(student => student?.id)
      }
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
        if (!studentEntity) throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)

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
      }

      // check class
      const classEntities = await this.classRepository
        .createQueryBuilder('class')
        .select(['class.id', 'class.name', 'class.price', 'class.status'])
        .where('class.id IN (:...class_ids)', { class_ids })
        // .andWhere('class.end_enrollment_day >= :today', { today: new Date().toISOString().split('T')[0] })
        .getMany()
      if (classEntities.length !== class_ids.length) throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)

      // Tổng tiền học
      const totalFee = classEntities.reduce((acc, curr) => acc + curr.price, 0)
      const prepaid = 0 // trả trước
      const debt = totalFee - prepaid // nợ học phí

      // check voucher
      if (createEnrollmentDto.voucher_code) {
        const voucher = await this.voucherRepository.findOne({ where: { code: createEnrollmentDto.voucher_code } })
        if (!voucher) throwAppException('VOUCHER_NOT_FOUND', ErrorCode.VOUCHER_NOT_FOUND, HttpStatus.NOT_FOUND)
        if (voucher.is_used) throwAppException('VOUCHER_ALREADY_USED', ErrorCode.VOUCHER_ALREADY_USED, HttpStatus.BAD_REQUEST)
        if (voucher.type === VoucherType.PERCENTAGE) {
          createEnrollmentDto.discount = (totalFee * voucher.discount) / 100
        } else if (voucher.type === VoucherType.FIXED) {
          createEnrollmentDto.discount = voucher.discount
        }
        createEnrollmentDto.voucher_code = voucher.code
      }

      const enrollment = this.enrollmentsRepository.create({
        ...createEnrollmentDto,
        is_logged: isLogged,
        code: generateRandomString(5),
        class_ids,
        total_fee: totalFee,
        prepaid,
        debt,
        student_id: studentId,
      })

      const savedEnrollment = await queryRunner.manager.save(Enrollments, enrollment)

      // send mail
      if (enrollment.email) {
        setImmediate(() => {
          this.handleEnrollmentEmail(enrollment, 'register').catch(err => console.error('Email register job failed:', err))
        })
      }
      // check voucher
      if (createEnrollmentDto.voucher_code) {
        const voucher = await this.voucherRepository.findOne({ where: { code: createEnrollmentDto.voucher_code } })
        if (!voucher) throwAppException('VOUCHER_NOT_FOUND', ErrorCode.VOUCHER_NOT_FOUND, HttpStatus.NOT_FOUND)
        if (voucher.is_used) throwAppException('VOUCHER_ALREADY_USED', ErrorCode.VOUCHER_ALREADY_USED, HttpStatus.BAD_REQUEST)
        if (voucher.type === VoucherType.PERCENTAGE) {
          createEnrollmentDto.discount = (totalFee * voucher.discount) / 100
        } else if (voucher.type === VoucherType.FIXED) {
          createEnrollmentDto.discount = voucher.discount
        }
        createEnrollmentDto.voucher_code = voucher.code

        // update voucher
        await this.voucherRepository.update(voucher.id, {
          student_id: studentId,
          is_used: true,
          use_at: new Date().toISOString(),
          actual_discount: createEnrollmentDto.discount,
          enrollment_id: savedEnrollment.id,
        })
      }

      const formatEnrollment: IEnrollments = {
        ...savedEnrollment,
        student_id: studentId || null,
        student_code: studentId ? studentEntity?.user.code : null,
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

      await queryRunner.commitTransaction()
      return formatEnrollment
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async updateEnrollmentV2(id: number, updateEnrollmentDto: UpdateEnrollmentsDto): Promise<void> {
    const { student_code, status, prepaid, class_ids, ...rest } = updateEnrollmentDto
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      const enrollmentsRepo = queryRunner.manager.getRepository(Enrollments)
      const userRepo = queryRunner.manager.getRepository(User)
      const studentRepo = queryRunner.manager.getRepository(Student)
      const classRepo = queryRunner.manager.getRepository(Classes)
      const classStudentsRepo = queryRunner.manager.getRepository(ClassStudents)
      // gắn deleted_at = null trước khi cập nhật
      await enrollmentsRepo.update(id, { deleted_at: null })

      const enrollment = await enrollmentsRepo
        .createQueryBuilder('enrollment')
        .leftJoinAndSelect('enrollment.student', 'student')
        .leftJoinAndSelect('student.user', 'user')
        .where('enrollment.id = :id', { id })
        .withDeleted()
        .getOne()
      if (!enrollment) throwAppException('ENROLLMENT_NOT_FOUND', ErrorCode.ENROLLMENT_NOT_FOUND, HttpStatus.NOT_FOUND)

      // đơn mà có student code rồi thì không cho sửa code - nếu code mới giống code cũ thì cho pass
      if (student_code && enrollment?.student?.user?.code !== student_code && enrollment?.student?.user?.code) {
        throwAppException('ENROLLMENT_NOT_CHANGE_CODE_STUDENT', ErrorCode.ENROLLMENT_NOT_CHANGE_CODE_STUDENT, HttpStatus.BAD_REQUEST)
      }

      // nếu có enrollment.student_id chứng tỏ đã định danh. không cho sửa thông tin student/user
      if (enrollment.student_id) {
        const student = await studentRepo
          .createQueryBuilder('student')
          .select(['student.id', 'student.user_id'])
          .where('student.id = :id', { id: enrollment.student_id })
          .getOne()
        if (!student) throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)

        const { full_name, saint_name, email, phone_number, address, birth_date, birth_place, parish, deanery, diocese, congregation } = rest // thông tin user
        // check thông tin có trùng với thông tin trong enrollment không
        if (
          full_name !== enrollment.full_name ||
          saint_name !== enrollment.saint_name ||
          email !== enrollment.email ||
          phone_number !== enrollment.phone_number ||
          address !== enrollment.address ||
          birth_date !== enrollment.birth_date ||
          birth_place !== enrollment.birth_place ||
          parish !== enrollment.parish ||
          deanery !== enrollment.deanery ||
          diocese !== enrollment.diocese ||
          congregation !== enrollment.congregation
        ) {
          throwAppException('ENROLLMENT_NOT_CHANGE_STUDENT_INFO', ErrorCode.ENROLLMENT_NOT_CHANGE_STUDENT_INFO, HttpStatus.BAD_REQUEST)
        }
      }

      // Nếu chưa có student_id và admin cung cấp student_code → gán student vào enrollment
      if (student_code && !enrollment.student_id) {
        let user = await userRepo.findOne({ where: { code: student_code } })
        let isNewUser = false

        // Trường hợp : tạo mới user nếu chưa tồn tại
        if (!user) {
          isNewUser = true
          user = userRepo.create({
            code: student_code,
            password: await hashPassword(student_code),
            role: Role.STUDENT,
            status: UserStatus.ACTIVE,
            ...rest,
          })
          user = await userRepo.save(user)
        }

        // Tìm student theo user_id
        let student = await studentRepo.findOne({ where: { user_id: user.id } })
        if (!student) {
          student = studentRepo.create({
            user_id: user.id,
            graduate: false,
            graduate_year: null,
          })
          student = await studentRepo.save(student)
        }

        // Chỉ gửi email nếu là user mới tạo
        if (isNewUser && user.email) {
          console.log('gửi email')
          await this.emailService.sendMail([{ email: user.email, name: user.full_name }], 'Đăng ký tài khoản thành công', 'register-success', {
            name: user.full_name,
            username: user.code,
            password: user.code,
            loginLink: `${process.env.FRONTEND_URL}`,
          })
        }
        // Gán vào enrollment
        enrollment.student_id = student.id
        // await enrollmentsRepo.update(id, { student_id: student.id })
      }

      // lấy class_ids cũ và mới
      const oldClassIds = enrollment.class_ids || []
      const newClassIds = class_ids || oldClassIds
      // update class_students khi đổi class_ids
      if (status && status !== StatusEnrollment.PENDING) {
        const removedClasses = oldClassIds.filter(id => !newClassIds.includes(id))
        const addedClasses = newClassIds.filter(id => !oldClassIds.includes(id))
        // Xoá student khỏi lớp bị bỏ
        if (removedClasses.length > 0) {
          await classStudentsRepo.delete({
            student_id: enrollment.student_id,
            class_id: In(removedClasses),
          })
        }

        // Thêm student vào lớp mới (nếu chưa có)
        if (addedClasses.length > 0) {
          const existClassStudents = await classStudentsRepo.find({
            where: { student_id: enrollment.student_id, class_id: In(addedClasses) },
          })
          const existIds = existClassStudents.map(cs => cs.class_id)
          const toAdd = addedClasses.filter(id => !existIds.includes(id))
          if (toAdd.length > 0) {
            const classStudents = toAdd.map(class_id => ({
              class_id,
              student_id: enrollment.student_id,
              ...rest,
            }))
            await classStudentsRepo.save(classStudents)
          }
        }
      }

      // check class
      let totalFee = enrollment.total_fee

      if (Array.isArray(class_ids) && class_ids.length > 0) {
        const classEntities = await classRepo
          .createQueryBuilder('class')
          .select(['class.id', 'class.name', 'class.price', 'class.status'])
          .where('class.id IN (:...class_ids)', { class_ids })
          .andWhere('class.status = :status', { status: ClassStatus.ENROLLING })
          .getMany()

        if (classEntities.length !== class_ids.length) {
          throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)
        }

        // nếu status ClassStatus.END_ENROLLING thi khong cho update
        if (classEntities.some(classEntity => classEntity.status === ClassStatus.END_ENROLLING)) {
          throwAppException('CLASS_END_ENROLLING', ErrorCode.CLASS_END_ENROLLING, HttpStatus.BAD_REQUEST)
        }

        totalFee = classEntities.reduce((acc, curr) => acc + curr.price, 0)
        enrollment.class_ids = class_ids
        enrollment.total_fee = totalFee
      }

      if (prepaid) {
        // phải có status là nợ học phí mới được trả trước
        if (enrollment.status !== StatusEnrollment.DEBT && status !== StatusEnrollment.DEBT)
          throwAppException('ENROLLMENT_NOT_DEBT', ErrorCode.ENROLLMENT_NOT_DEBT, HttpStatus.BAD_REQUEST)
        enrollment.prepaid = prepaid
        enrollment.debt = totalFee - prepaid
      }

      if (updateEnrollmentDto.voucher_code) {
        const voucher = await this.voucherRepository.findOne({ where: { code: updateEnrollmentDto.voucher_code } })
        if (!voucher) throwAppException('VOUCHER_NOT_FOUND', ErrorCode.VOUCHER_NOT_FOUND, HttpStatus.NOT_FOUND)
        if (voucher.is_used && voucher.enrollment_id !== enrollment.id)
          throwAppException('VOUCHER_ALREADY_USED', ErrorCode.VOUCHER_ALREADY_USED, HttpStatus.BAD_REQUEST)
        if (voucher.type === VoucherType.PERCENTAGE) {
          enrollment.discount = (totalFee * voucher.discount) / 100
        } else if (voucher.type === VoucherType.FIXED) {
          enrollment.discount = voucher.discount
        }
        enrollment.voucher_code = voucher.code

        await this.voucherRepository.update(voucher.id, {
          student_id: enrollment.student_id,
          is_used: true,
          enrollment_id: enrollment.id,
          use_at: new Date().toISOString(),
          actual_discount: enrollment.discount,
        })
      }

      // check lớp có full không
      if (status && status !== StatusEnrollment.PENDING) {
        const classEntities = await classRepo
          .createQueryBuilder('class')
          .select(['class.id', 'class.max_students'])
          .where('class.id IN (:...class_ids)', { class_ids })
          .getMany()

        const classEntitiesObject = arrayToObject(classEntities, 'id')

        const current_students = await classStudentsRepo
          .createQueryBuilder('class_students')
          .select('class_students.class_id', 'class_id')
          .addSelect('COUNT(class_students.id)', 'count')
          .where('class_students.class_id IN (:...class_ids)', { class_ids })
          .groupBy('class_students.class_id')
          .getRawMany()

        const current_students_object = arrayToObject(current_students, 'class_id')

        for (const class_id of class_ids) {
          const maxStudents = Number(classEntitiesObject[class_id]?.max_students ?? 0)
          const studentCount = Number(current_students_object[class_id]?.count || 0)

          if (maxStudents !== 0 && studentCount >= maxStudents) {
            throwAppException('CLASS_FULL', ErrorCode.CLASS_FULL, HttpStatus.BAD_REQUEST)
          }
        }
      }

      // Nếu status là hoàn thành thì trạng thái thanh toán là đã thanh toán, ngược lại là chưa thanh toán
      if (status) {
        if (status === StatusEnrollment.DONE) {
          enrollment.payment_status = PaymentStatus.PAID
        } else {
          enrollment.payment_status = PaymentStatus.UNPAID
        }
      }

      if (status && status !== enrollment.status) {
        const isFromPending = enrollment.status === StatusEnrollment.PENDING
        const isToPending = status === StatusEnrollment.PENDING
        if (isFromPending && !isToPending) {
          // Từ pending sang trạng thái khác → thêm vào class_students
          // nếu student đã có trong class_students thì không thêm vào
          const existClassStudents = await classStudentsRepo.find({
            where: { student_id: enrollment.student_id, class_id: In(enrollment.class_ids) },
          })
          if (existClassStudents.length > 0) throwAppException('STUDENT_ALREADY_IN_CLASS', ErrorCode.STUDENT_ALREADY_IN_CLASS, HttpStatus.BAD_REQUEST)
          const classStudents = enrollment.class_ids.map(class_id => ({
            class_id,
            student_id: enrollment.student_id,
            ...rest,
          }))
          await classStudentsRepo.save(classStudents)
        }
        if (!isFromPending && isToPending) {
          // Từ trạng thái khác về pending → xóa khỏi class_students
          await classStudentsRepo.delete({
            student_id: enrollment.student_id,
          })
        }
      }
      // cập nhật lại enrollment
      const updatedEnrollment = this.enrollmentsRepository.create({
        ...enrollment,
        status: status || enrollment.status,
        ...rest,
      })
      await enrollmentsRepo.save(updatedEnrollment)

      // send mail
      if (enrollment.email) {
        setImmediate(() => {
          this.handleEnrollmentEmail(enrollment, 'payment', status).catch(err => console.error('Email payment job failed:', err))
        })
      }

      await queryRunner.commitTransaction()
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  private async handleEnrollmentEmail(enrollment: Enrollments, type: 'register' | 'payment', status?: StatusEnrollment) {
    try {
      if (!enrollment.email) return

      const listClass = await this.classRepository
        .createQueryBuilder('class')
        .select([
          'class.id',
          'class.name',
          'class.start_time',
          'class.end_time',
          'class.price',
          'class.schedule',
          'class.closing_day',
          'class.opening_day',
        ])
        .where('class.id IN (:...class_ids)', { class_ids: enrollment.class_ids })
        .getMany()

      const formatClass = listClass.map((classEntity: Classes, index: number) => ({
        id: classEntity.id,
        index: index + 1,
        name: classEntity.name,
        price: formatCurrency(classEntity.price),
        schedule: mapScheduleToVietnamese(classEntity.schedule).join(', '),
        start_time: classEntity.start_time,
        end_time: classEntity.end_time,
        start_date: formatStringDate(classEntity.opening_day, true),
        end_date: formatStringDate(classEntity.closing_day, true),
      }))

      let templateName = ''
      let subject = ''
      let pdfTemplate = ''
      let pdfFilename = ''
      const pdfData: any = {
        logo,
        background,
        stamp,
        code: enrollment?.code,
        saint_name: enrollment?.saint_name,
        full_name: enrollment?.full_name,
        birth_date: formatStringDate(enrollment?.birth_date, true),
        birth_place: enrollment?.birth_place,
        phone: enrollment?.phone_number,
        email: enrollment?.email,
        parish: enrollment?.parish,
        address: enrollment?.address,
        deanery: enrollment?.deanery,
        diocese: enrollment?.diocese,
        congregation: enrollment?.congregation,
        total_fee: formatCurrency(Number(enrollment?.total_fee)),
        prepaid: formatCurrency(Number(enrollment?.prepaid)),
        debt: formatCurrency(Number(enrollment?.debt)),
        discount: formatCurrency(Number(enrollment?.discount) || 0),
        final_amount: formatCurrency(Number(enrollment?.total_fee) - Number(enrollment?.discount)),
        payment_method: enrollment?.payment_method == PaymentMethod.CASH ? true : false,
        classes: formatClass,
        day,
        month,
        year,
      }

      if (type === 'payment' && status === StatusEnrollment.DONE) {
        subject = 'Xác nhận thanh toán thành công'
        templateName = 'enrollment-payment-success'
        pdfTemplate = 'pdf-enrollment-payment-success'
        pdfFilename = 'payment-success.pdf'
      } else if (type === 'register') {
        subject = 'Xác nhận đăng ký khóa học thành công'
        templateName = 'enrollment-register-succsess'
        pdfTemplate = 'pdf-enrollment-register-success'
        pdfFilename = 'register-success.pdf'
        pdfData.qrCode = qrCode
      } else {
        return // nếu không phải type hợp lệ thì bỏ qua
      }

      const pdfBuffer = await renderPdfFromTemplate(pdfTemplate, pdfData)

      await this.emailService.sendMail(
        [{ email: enrollment.email, name: enrollment.full_name }],
        subject,
        templateName,
        {
          saint_name: enrollment?.saint_name,
          full_name: enrollment?.full_name,
          day,
          month,
          year,
        },
        {
          filename: pdfFilename,
          content: pdfBuffer,
        },
      )
    } catch (err) {
      console.error('Error sending enrollment email:', err)
    }
  }

  async getEnrollmentById(id: number): Promise<IEnrollments> {
    const enrollment = await this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      .select([
        'enrollment.id',
        'enrollment.code',
        'enrollment.voucher_code',
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
        'enrollment.birth_date',
        'enrollment.birth_place',
        'enrollment.parish',
        'enrollment.deanery',
        'enrollment.diocese',
        'enrollment.congregation',
        'enrollment.note',
        'enrollment.discount',
        'enrollment.user_note',
        'enrollment.class_ids',
        'student.id',
        'user.code',
        'user.avatar',
      ])
      .leftJoin('enrollment.student', 'student')
      .leftJoin('student.user', 'user')
      .where('enrollment.id = :id', { id })
      .withDeleted()
      .getOne()
    if (!enrollment) throwAppException('ENROLLMENT_NOT_FOUND', ErrorCode.ENROLLMENT_NOT_FOUND, HttpStatus.NOT_FOUND)

    let payment_info = null
    if (enrollment.payment_method == PaymentMethod.CASH) {
      payment_info = await this.footerRepository.find({ where: { type: FooterEnum.CASH } })
    } else {
      payment_info = await this.footerRepository.find({ where: { type: FooterEnum.TRANSFER } })
    }

    const listClass = await this.classRepository
      .createQueryBuilder('class')
      .select([
        'class.id',
        'class.name',
        'class.price',
        'class.code',
        'class.schedule',
        'class.start_time',
        'class.end_enrollment_day',
        'class.end_time',
        'class.opening_day',
        'class.closing_day',
      ])
      .where('class.id IN (:...class_ids)', { class_ids: enrollment.class_ids })
      .withDeleted()
      .getMany()
    if (listClass.length !== enrollment.class_ids.length) throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)
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
      discount: enrollment.discount,
      note: enrollment.note,
      user_note: enrollment.user_note,
      is_logged: enrollment.is_logged,
      voucher_code: enrollment.voucher_code,
      payment_info: {
        title: payment_info[0]?.title,
        content: payment_info[0]?.content,
      },
      classes: listClass.map(classEntity => ({
        id: classEntity.id,
        name: classEntity.name,
        code: classEntity.code,
        price: classEntity.price,
        end_enrollment_day: classEntity.end_enrollment_day,
        schedule: classEntity.schedule,
        start_time: classEntity.start_time,
        end_time: classEntity.end_time,
        start_date: classEntity.opening_day,
        end_date: classEntity.closing_day,
      })),
      student_id: enrollment?.student?.id ? enrollment?.student?.id : null,
      student_code: enrollment?.student?.user?.code ? enrollment?.student?.user?.code : null,
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
      avatar: enrollment?.student?.user?.avatar ?? null,
    }

    return formatEnrollment
  }

  async getManyEnrollment(
    paginateEnrollmentsDto: PaginateEnrollmentsDto,
    isSoftDelete: boolean = false,
  ): Promise<{
    data: IEnrollments[]
    meta: PaginateEnrollmentsDto
  }> {
    const queryBuilder = this.enrollmentsRepository.createQueryBuilder('enrollment')
    queryBuilder
      .select([
        'enrollment.id',
        'enrollment.code',
        'enrollment.registration_date',
        'enrollment.payment_method',
        'enrollment.payment_status',
        'enrollment.status',
        'enrollment.total_fee',
        'enrollment.prepaid',
        'enrollment.debt',
        'enrollment.discount',
        'enrollment.note',
        'enrollment.user_note',
        'enrollment.is_logged',
        'enrollment.saint_name',
        'enrollment.full_name',
        'enrollment.email',
        'enrollment.phone_number',
        'enrollment.address',
        'student.id',
        'user.code',
      ])
      .leftJoin('enrollment.student', 'student')
      .leftJoin('student.user', 'user')
      .withDeleted()
    if (isSoftDelete) {
      queryBuilder.where('enrollment.deleted_at IS NOT NULL')
    } else {
      queryBuilder.andWhere('enrollment.deleted_at IS NULL')
    }

    const { data, meta } = await paginate(queryBuilder, paginateEnrollmentsDto)
    const formatEnrollments: IEnrollments[] = data.map(enrollment => {
      return {
        ...enrollment,
        student_id: enrollment?.student?.id,
        student_code: enrollment?.student?.user?.code,
        saint_name: enrollment.saint_name,
        full_name: enrollment.full_name,
        email: enrollment.email,
        phone_number: enrollment.phone_number,
        address: enrollment.address,
        discount: enrollment.discount,
      }
    })

    return {
      data: formatEnrollments,
      meta,
    }
  }

  // delete
  async deleteEnrollment(id: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()
    try {
      const enrollmentsRepo = queryRunner.manager.getRepository(Enrollments)
      const classStudentsRepo = queryRunner.manager.getRepository(ClassStudents)

      const enrollment = await enrollmentsRepo
        .createQueryBuilder('enrollment')
        .select(['enrollment.id', 'enrollment.status', 'enrollment.class_ids', 'enrollment.student_id'])
        .where('enrollment.id = :id', { id })
        .withDeleted()
        .getOne()
      if (!enrollment) throwAppException('ENROLLMENT_NOT_FOUND', ErrorCode.ENROLLMENT_NOT_FOUND, HttpStatus.NOT_FOUND)

      // nếu đơn nằm trong 3 status kia chứng tỏ đã vào lớp, xóa thì xóa trong lớp đi
      if (enrollment.status != StatusEnrollment.PENDING) {
        // xóa tất cả class_students
        const classIds = enrollment.class_ids
        await classStudentsRepo.delete({
          class_id: In(classIds),
          student_id: enrollment.student_id,
        })
      }

      await enrollmentsRepo.delete(id)
      await queryRunner.commitTransaction()
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  // 10 ngày không thanh toán thì tự động soft delete
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async overDue10Day() {
    const enrollments = await this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      .select(['enrollment.id', 'enrollment.status', 'enrollment.created_at', 'enrollment.payment_status'])
      .where('enrollment.payment_status = :payment_status', { payment_status: PaymentStatus.UNPAID })
      .andWhere('enrollment.status = :status', { status: StatusEnrollment.PENDING })
      .andWhere('enrollment.created_at < :date', { date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) })
      // .andWhere('enrollment.created_at < :date', { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) })
      .getMany()

    for (const enrollment of enrollments) {
      await this.enrollmentsRepository.softDelete(enrollment.id)
    }
  }
}
