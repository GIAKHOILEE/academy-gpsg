import { paginate } from '@common/pagination'
import {
  arrayToObject,
  formatCurrency,
  formatStringDate,
  formatStringToDate,
  generateRandomString,
  hashPassword,
  mapScheduleToVietnamese,
  removeVietnameseTones,
  renderPdfFromTemplate,
  throwAppException,
} from '@common/utils'
import { BookDeliveryStatus, LearnType, PaymentMethod, PaymentStatus, StatusEnrollment } from '@enums/class.enum'
import { ErrorCode } from '@enums/error-codes.enum'
import { Role } from '@enums/role.enum'
import { UserStatus } from '@enums/status.enum'
import { StudentBook } from '@modules/books/student-books.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { Classes } from '@modules/class/class.entity'
import { Student } from '@modules/students/students.entity'
import { User } from '@modules/users/user.entity'
import { HttpStatus, Injectable } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { BrevoMailerService } from '@services/brevo-mailer/email.service'
import { LibrarySyncService } from '@services/library-sync/library-sync.service'
import * as fs from 'fs'
import * as path from 'path'
import { DataSource, EntityManager, In, Repository } from 'typeorm'
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
    @InjectRepository(ClassStudents)
    private readonly classStudentsRepository: Repository<ClassStudents>,
    private readonly librarySyncService: LibrarySyncService,
  ) {}

  /**
   * Đồng bộ giáo trình / sách (student_books) cho học viên dựa trên các lớp học online (VIDEO / MEETING) đã được duyệt.
   * Sách gắn trực tiếp với học viên (student_books), không gắn với class_students, và lấy shipping_address mới.
   */
  private async syncStudentBooksForStudent(
    manager: EntityManager,
    studentId: number,
    currentEnrollmentClassItems: { class_id: number; learn_type: LearnType }[],
    oldClassIds: number[],
    shippingAddress?: string | null,
  ): Promise<void> {
    if (!studentId) return

    const classStudentsRepo = manager.getRepository(ClassStudents)
    const classRepo = manager.getRepository(Classes)
    const studentBookRepo = manager.getRepository(StudentBook)

    // 1. Tìm tất cả các lớp học online hiện tại của học viên này
    const activeOnlineMemberships = await classStudentsRepo.find({
      where: {
        student_id: studentId,
        learn_type: In([LearnType.VIDEO, LearnType.MEETING]),
      },
    })
    const activeOnlineClassIds = [...new Set(activeOnlineMemberships.map(m => m.class_id))]

    let requiredBookIds: number[] = []
    if (activeOnlineClassIds.length > 0) {
      const onlineClasses = await classRepo.find({
        where: { id: In(activeOnlineClassIds) },
        relations: ['books'],
      })
      requiredBookIds = [...new Set(onlineClasses.flatMap(c => (c.books || []).map(b => b.id)))]
    }

    // 2. Xác định các sách thuộc các lớp cũ của đơn này mà học viên không còn học online ở bất kỳ lớp nào nữa
    if (oldClassIds.length > 0) {
      const oldClasses = await classRepo.find({
        where: { id: In(oldClassIds) },
        relations: ['books'],
      })
      const oldBookIds = [...new Set(oldClasses.flatMap(c => (c.books || []).map(b => b.id)))]
      const obsoleteBookIds = oldBookIds.filter(bid => !requiredBookIds.includes(bid))

      if (obsoleteBookIds.length > 0) {
        // Chỉ xóa những sách chưa gửi (NOT_SENT)
        await studentBookRepo.delete({
          student_id: studentId,
          book_id: In(obsoleteBookIds),
          book_status: BookDeliveryStatus.NOT_SENT,
        })
      }
    }

    // 3. Tạo mới hoặc cập nhật địa chỉ nhận sách cho các sách thuộc lớp online
    if (requiredBookIds.length > 0) {
      const currentOnlineClassIds = (currentEnrollmentClassItems || [])
        .filter(item => item.learn_type === LearnType.VIDEO || item.learn_type === LearnType.MEETING)
        .map(item => item.class_id)

      let currentEnrollmentBookIds: number[] = []
      if (currentOnlineClassIds.length > 0) {
        const currentOnlineClasses = await classRepo.find({
          where: { id: In(currentOnlineClassIds) },
          relations: ['books'],
        })
        currentEnrollmentBookIds = [...new Set(currentOnlineClasses.flatMap(c => (c.books || []).map(b => b.id)))]
      }

      const existingStudentBooks = await studentBookRepo.find({
        where: {
          student_id: studentId,
          book_id: In(requiredBookIds),
        },
      })
      const existingByBookId = new Map<number, StudentBook>(existingStudentBooks.map(sb => [sb.book_id, sb]))

      for (const bookId of requiredBookIds) {
        const existing = existingByBookId.get(bookId)
        if (!existing) {
          const newStudentBook = studentBookRepo.create({
            student_id: studentId,
            book_id: bookId,
            book_status: BookDeliveryStatus.NOT_SENT,
            shipping_address: shippingAddress ?? null,
          })
          await studentBookRepo.save(newStudentBook)
        } else if (
          existing.book_status === BookDeliveryStatus.NOT_SENT &&
          shippingAddress !== undefined &&
          shippingAddress !== null &&
          (currentEnrollmentBookIds.includes(bookId) || !existing.shipping_address)
        ) {
          await studentBookRepo.update(existing.id, {
            shipping_address: shippingAddress,
          })
        }
      }
    }
  }

  async createEnrollmentV3(createEnrollmentDto: CreateEnrollmentsDto, isLogged: boolean, userId?: number): Promise<IEnrollments> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      // Khởi tạo các repository sử dụng transaction manager
      const enrollmentsRepo = queryRunner.manager.getRepository(Enrollments)
      const studentRepo = queryRunner.manager.getRepository(Student)
      const classRepo = queryRunner.manager.getRepository(Classes)
      const voucherRepo = queryRunner.manager.getRepository(Voucher)
      const classStudentsRepo = queryRunner.manager.getRepository(ClassStudents)

      const { class_ids } = createEnrollmentDto
      let studentId: number | null = null
      let studentEntity: Student | null = null

      // 1. XỬ LÝ THÔNG TIN HỌC VIÊN (Nếu đã đăng nhập)
      if (userId) {
        studentEntity = await studentRepo
          .createQueryBuilder('student')
          .leftJoinAndSelect('student.user', 'user')
          .where('user.id = :userId', { userId })
          .getOne()

        if (studentEntity) {
          studentId = studentEntity.id
          // Tự động điền thông tin từ hồ sơ học viên vào đơn đăng ký (giữ nguyên shipping_address mới mà học viên nhập)
          const { user } = studentEntity
          Object.assign(createEnrollmentDto, {
            saint_name: user.saint_name,
            full_name: user.full_name,
            full_name_normalized: removeVietnameseTones(user.full_name).toLowerCase(),
            email: user.email,
            phone_number: user.phone_number,
            address: user.address,
            birth_date: user.birth_date,
            birth_place: user.birth_place,
            parish: user.parish,
            deanery: user.deanery,
            diocese: user.diocese,
            congregation: user.congregation,
            gender: user.gender,
          })

          // Chống đăng ký trùng lặp nếu học viên đã có mặt trong các lớp này
          const requestedClassIds = class_ids.map(item => item.class_id)
          const existingMemberships = await classStudentsRepo.find({
            where: { student_id: studentId, class_id: In(requestedClassIds) },
          })
          if (existingMemberships.length > 0) {
            throwAppException('STUDENT_ALREADY_IN_CLASS', ErrorCode.STUDENT_ALREADY_IN_CLASS, HttpStatus.BAD_REQUEST)
          }
        }
      }

      // 2. KIỂM TRA TÍNH HỢP LỆ CỦA LỚP HỌC (Validation)
      const classIds = class_ids.map(item => item.class_id)
      const classEntities = await classRepo.find({ where: { id: In(classIds) } })

      if (classEntities.length !== class_ids.length) {
        throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)
      }

      const classMap = arrayToObject(classEntities, 'id')
      const todayString = new Date().toISOString().split('T')[0]

      for (const item of class_ids) {
        const cls = classMap[item.class_id]

        // Kiểm tra thời hạn đăng ký
        if (cls.registration_start_date && todayString < cls.registration_start_date) {
          throwAppException('CLASS_NOT_ENROLLING', ErrorCode.CLASS_NOT_ENROLLING, HttpStatus.BAD_REQUEST)
        }
        if (cls.end_enrollment_day && todayString > cls.end_enrollment_day) {
          throwAppException('CLASS_END_ENROLLING', ErrorCode.CLASS_END_ENROLLING, HttpStatus.BAD_REQUEST)
        }

        // Kiểm tra hình thức học (learn_type) có được hỗ trợ hay không
        const isSupported =
          item.learn_type === LearnType.OFFLINE ||
          (item.learn_type === LearnType.VIDEO && cls.learn_video) ||
          (item.learn_type === LearnType.MEETING && cls.learn_meeting)

        if (!isSupported) {
          throwAppException('CLASS_DOES_NOT_SUPPORT_LEARN_TYPE', ErrorCode.CLASS_DOES_NOT_SUPPORT_LEARN_TYPE, HttpStatus.BAD_REQUEST)
        }
      }

      // 3. TÍNH TOÁN HỌC PHÍ VÀ VOUCHER
      const totalFee = classEntities.reduce((acc, curr) => acc + curr.price, 0)
      let discountAmount = 0

      if (createEnrollmentDto.voucher_code) {
        const voucher = await voucherRepo.findOne({ where: { code: createEnrollmentDto.voucher_code } })
        if (!voucher) throwAppException('VOUCHER_NOT_FOUND', ErrorCode.VOUCHER_NOT_FOUND, HttpStatus.NOT_FOUND)
        if (voucher.is_used) throwAppException('VOUCHER_ALREADY_USED', ErrorCode.VOUCHER_ALREADY_USED, HttpStatus.BAD_REQUEST)

        discountAmount = voucher.type === VoucherType.PERCENTAGE ? (totalFee * voucher.discount) / 100 : voucher.discount

        createEnrollmentDto.discount = discountAmount
      }

      // 4. TẠO ĐƠN ĐĂNG KÝ (Enrollment Creation)
      const enrollment = enrollmentsRepo.create({
        ...createEnrollmentDto,
        shipping_address: createEnrollmentDto.shipping_address ?? null,
        is_logged: isLogged,
        code: generateRandomString(5),
        total_fee: totalFee,
        prepaid: 0,
        debt: totalFee, // Mặc định đơn mới sẽ có dư nợ bằng tổng phí
        student_id: studentId,
        full_name_normalized: removeVietnameseTones(createEnrollmentDto.full_name).toLowerCase().trim(),
        is_read_note: createEnrollmentDto.user_note ? false : null,
      })

      const savedEnrollment = await queryRunner.manager.save(Enrollments, enrollment)

      // 5. CẬP NHẬT VOUCHER (Nếu có)
      if (createEnrollmentDto.voucher_code) {
        await voucherRepo.update(
          { code: createEnrollmentDto.voucher_code },
          {
            student_id: studentId,
            is_used: true,
            use_at: new Date().toISOString(),
            actual_discount: discountAmount,
            enrollment_id: savedEnrollment.id,
          },
        )
      }

      // 6. CHUẨN BỊ DỮ LIỆU PHẢN HỒI (Final Result)
      const result: IEnrollments = {
        ...savedEnrollment,
        student_id: studentId,
        student_code: studentEntity?.user?.code || null,
        birth_date: formatStringToDate(createEnrollmentDto.birth_date),
        gender: savedEnrollment.gender,
        shipping_address: savedEnrollment.shipping_address,
        classes: class_ids.map(item => ({
          class_id: item.class_id,
          learn_type: item.learn_type,
          class: classMap[item.class_id],
        })),
      }

      await queryRunner.commitTransaction()

      // 7. GỬI EMAIL THÀNH CÔNG (Chạy ngầm)
      if (enrollment.email) {
        setImmediate(() => {
          this.handleEnrollmentEmail(enrollment, 'register').catch(err => console.error('Email register job failed:', err))
        })

        // Gửi thêm email hướng dẫn học trực tuyến nếu có môn học online/video/meeting
        const hasOnlineClass = class_ids.some(item => item.learn_type === LearnType.VIDEO || item.learn_type === LearnType.MEETING)
        if (hasOnlineClass) {
          setImmediate(() => {
            const saintName = enrollment.saint_name ? `${enrollment.saint_name} ` : ''
            const fullName = enrollment.full_name || ''
            const mailContent = `Xin chào ${saintName}${fullName},<br><br>Học viện Mục vụ xin gửi video hướng dẫn sử dụng hệ thống học trực tuyến, xin học viên tham khảo kỹ để có một quá trình học tập thuận lợi nhất.<br><br>https://youtu.be/J_h32_gDSBE?si=-yo_sKlUyRq4O0Db<br><br>Mọi thắc mắc xin liên hệ lại với học viện qua bất kỳ hình thức liên lạc nào thuận tiện để được hỗ trợ.<br><br>Xin chân thành cảm ơn!`

            this.emailService
              .sendMail(
                [{ email: enrollment.email, name: enrollment.full_name }],
                'Hướng dẫn sử dụng hệ thống học trực tuyến',
                '',
                null,
                undefined,
                mailContent,
              )
              .catch(err => console.error('Email instruction job failed:', err))
          })
        }
      }

      return result
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async updateEnrollmentV3(id: number, updateEnrollmentDto: UpdateEnrollmentsDto): Promise<void> {
    const { student_code, status: newStatus, prepaid, class_ids: newClassData, ...rest } = updateEnrollmentDto
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      // Khởi tạo các repository sử dụng transaction manager
      const enrollmentsRepo = queryRunner.manager.getRepository(Enrollments)
      const userRepo = queryRunner.manager.getRepository(User)
      const studentRepo = queryRunner.manager.getRepository(Student)
      const classRepo = queryRunner.manager.getRepository(Classes)
      const classStudentsRepo = queryRunner.manager.getRepository(ClassStudents)
      const voucherRepo = queryRunner.manager.getRepository(Voucher)

      let isNewUserCreated = false
      let newUserObj: User | null = null

      // 1. PHỤC HỒI ĐƠN VÀ LẤY THÔNG TIN HIỆN TẠI
      // Nếu đơn bị xóa mềm, phục hồi lại trước khi cập nhật
      await enrollmentsRepo.update(id, { deleted_at: null })

      const enrollment = await enrollmentsRepo
        .createQueryBuilder('enrollment')
        .leftJoinAndSelect('enrollment.student', 'student')
        .leftJoinAndSelect('student.user', 'user')
        .where('enrollment.id = :id', { id })
        .withDeleted()
        .getOne()

      if (!enrollment) throwAppException('ENROLLMENT_NOT_FOUND', ErrorCode.ENROLLMENT_NOT_FOUND, HttpStatus.NOT_FOUND)

      // 2. KIỂM TRA TÍNH HỢP LỆ (Validation)
      // Không cho phép thay đổi mã học viên nếu đơn đã được gán mã từ trước
      if (student_code && enrollment.student?.user?.code && enrollment.student.user.code !== student_code) {
        throwAppException('ENROLLMENT_NOT_CHANGE_CODE_STUDENT', ErrorCode.ENROLLMENT_NOT_CHANGE_CODE_STUDENT, HttpStatus.BAD_REQUEST)
      }

      // Nếu đơn đã chính thức gán cho một StudentId, hạn chế sửa thông tin cá nhân qua API này để tránh sai lệch dữ liệu hệ thống
      if (enrollment.student_id) {
        const { full_name, saint_name, email, phone_number, address, birth_place, parish, deanery, diocese, congregation, gender } = rest
        const isInfoChanged = [
          [full_name, enrollment.full_name],
          [saint_name, enrollment.saint_name],
          [email, enrollment.email],
          [phone_number, enrollment.phone_number],
          [address, enrollment.address],
          [birth_place, enrollment.birth_place],
          [parish, enrollment.parish],
          [deanery, enrollment.deanery],
          [diocese, enrollment.diocese],
          [congregation, enrollment.congregation],
          [gender, enrollment.gender],
        ].some(([val, oldVal]) => val !== undefined && val !== oldVal)

        if (isInfoChanged) {
          throwAppException('ENROLLMENT_NOT_CHANGE_STUDENT_INFO', ErrorCode.ENROLLMENT_NOT_CHANGE_STUDENT_INFO, HttpStatus.BAD_REQUEST)
        }
      }

      // 3. ĐỊNH DANH HỌC VIÊN (Student Identification)
      // Nếu quản trị viên cung cấp mã học viên và đơn hiện tại chưa được gán học viên
      if (student_code && !enrollment.student_id) {
        let user = await userRepo.findOne({ where: { code: student_code } })
        let isNewUser = false

        // Nếu mã học viên đã tồn tại nhưng KHÔNG phải là học viên
        if (user && user.role !== Role.STUDENT) {
          throwAppException('USER_IS_NOT_A_STUDENT', ErrorCode.USER_IS_NOT_A_STUDENT, HttpStatus.BAD_REQUEST)
        }

        // Nếu mã học viên chưa tồn tại trong hệ thống User -> Tạo mới
        if (!user) {
          isNewUser = true
          isNewUserCreated = true
          const targetFullName = rest.full_name || enrollment.full_name
          const first_name = targetFullName ? targetFullName.trim().split(/\s+/).pop() : undefined
          user = userRepo.create({
            code: student_code,
            password: await hashPassword(student_code),
            role: Role.STUDENT,
            status: UserStatus.ACTIVE,
            first_name,
            saint_name: enrollment.saint_name,
            full_name: enrollment.full_name,
            full_name_normalized: enrollment.full_name ? removeVietnameseTones(enrollment.full_name).toLowerCase().trim() : null,
            email: enrollment.email,
            phone_number: enrollment.phone_number,
            address: enrollment.address,
            birth_place: enrollment.birth_place,
            birth_date: enrollment.birth_date,
            parish: enrollment.parish,
            deanery: enrollment.deanery,
            diocese: enrollment.diocese,
            congregation: enrollment.congregation,
            gender: enrollment.gender,
            ...rest,
          })
          user = await userRepo.save(user)
          newUserObj = user
        }

        // Đảm bảo User có thực thể Student tương ứng
        let student = await studentRepo.findOne({ where: { user_id: user.id } })
        if (!student) {
          student = studentRepo.create({ user_id: user.id, graduate: false, graduate_year: null })
          student = await studentRepo.save(student)
        }

        // Gửi email chào mừng nếu đây là tài khoản mới
        if (isNewUser && user.email) {
          await this.emailService.sendMail([{ email: user.email, name: user.full_name }], 'Đăng ký tài khoản thành công', 'register-success', {
            name: user.full_name,
            username: user.code,
            password: user.code,
            loginLink: `${process.env.FRONTEND_URL}`,
          })
        }
        enrollment.student_id = student.id
      }

      // 4. CẬP NHẬT LỚP HỌC VÀ HỌC PHÍ (Classes & Fee)
      const oldClassIds = enrollment.class_ids.map(item => item.class_id)
      const newClassIds = newClassData ? newClassData.map(item => item.class_id) : oldClassIds
      let totalFee = enrollment.total_fee

      if (newClassData && newClassData.length > 0) {
        const classEntities = await classRepo.find({ where: { id: In(newClassIds) } })
        if (classEntities.length !== newClassData.length) {
          throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)
        }
        totalFee = classEntities.reduce((acc, curr) => acc + curr.price, 0)
        enrollment.class_ids = newClassData
        enrollment.total_fee = totalFee
      }

      // 5. XỬ LÝ VOUCHER KHUYẾN MÃI
      if (updateEnrollmentDto.voucher_code) {
        const voucher = await voucherRepo.findOne({ where: { code: updateEnrollmentDto.voucher_code } })
        if (!voucher) throwAppException('VOUCHER_NOT_FOUND', ErrorCode.VOUCHER_NOT_FOUND, HttpStatus.NOT_FOUND)

        // Chỉ chấp nhận voucher nếu chưa dùng hoặc chính là voucher của đơn này
        if (voucher.is_used && voucher.enrollment_id !== enrollment.id) {
          throwAppException('VOUCHER_ALREADY_USED', ErrorCode.VOUCHER_ALREADY_USED, HttpStatus.BAD_REQUEST)
        }

        enrollment.discount = voucher.type === VoucherType.PERCENTAGE ? (totalFee * voucher.discount) / 100 : voucher.discount
        enrollment.voucher_code = voucher.code

        await voucherRepo.update(voucher.id, {
          student_id: enrollment.student_id,
          is_used: true,
          enrollment_id: enrollment.id,
          use_at: new Date().toISOString(),
          actual_discount: enrollment.discount,
        })
      }

      // 6. TRẠNG THÁI VÀ TÀI CHÍNH (Status & Financial)
      const finalStatus = newStatus || enrollment.status
      if (prepaid) {
        // Chỉ cho phép cập nhật tiền trả trước nếu đang ở trạng thái nợ học phí (DEBT)
        if (finalStatus !== StatusEnrollment.DEBT) {
          throwAppException('ENROLLMENT_NOT_DEBT', ErrorCode.ENROLLMENT_NOT_DEBT, HttpStatus.BAD_REQUEST)
        }
        enrollment.prepaid = prepaid
        enrollment.debt = totalFee - prepaid
      }

      // Cập nhật trạng thái thanh toán dựa trên trạng thái đơn
      if (newStatus) {
        enrollment.payment_status = newStatus === StatusEnrollment.DONE ? PaymentStatus.PAID : PaymentStatus.UNPAID
      }

      const targetShippingAddress = rest.shipping_address !== undefined ? rest.shipping_address : enrollment.shipping_address

      // 7. ĐỒNG BỘ THÀNH VIÊN LỚP (ClassStudents Sync) & GIÁO TRÌNH (StudentBooks Sync)
      // Logic: PENDING = chỉ là đơn đăng ký chờ. Các trạng thái khác = chính thức tham gia lớp.
      const isBecomingMember = newStatus && newStatus !== StatusEnrollment.PENDING && enrollment.status === StatusEnrollment.PENDING
      const isBecomingPending = newStatus === StatusEnrollment.PENDING && enrollment.status !== StatusEnrollment.PENDING
      const isCurrentlyMember = newStatus ? newStatus !== StatusEnrollment.PENDING : enrollment.status !== StatusEnrollment.PENDING

      if (isBecomingPending) {
        // Nếu đơn quay về trạng thái PENDING -> Xóa học viên khỏi danh sách lớp chính thức
        await classStudentsRepo.delete({ student_id: enrollment.student_id, class_id: In(oldClassIds) })
        if (enrollment.student_id) {
          await this.syncStudentBooksForStudent(queryRunner.manager, enrollment.student_id, [], oldClassIds, targetShippingAddress)
        }
      } else if (isCurrentlyMember && enrollment.student_id) {
        // A. Kiểm tra sĩ số (Class Capacity Check)
        // Chỉ kiểm tra khi bắt đầu duyệt đơn (PENDING -> Active) hoặc khi admin đổi lớp
        if (isBecomingMember || newClassData) {
          const classSpecs = await classRepo.find({ where: { id: In(newClassIds) }, select: ['id', 'max_students'] })
          const currentCounts = await classStudentsRepo
            .createQueryBuilder('cs')
            .select('cs.class_id', 'class_id')
            .addSelect('COUNT(cs.id)', 'count')
            .where('cs.class_id IN (:...ids)', { ids: newClassIds })
            .groupBy('cs.class_id')
            .getRawMany()

          const countMap = arrayToObject(currentCounts, 'class_id')
          for (const spec of classSpecs) {
            const max = Number(spec.max_students || 0)
            const count = Number(countMap[spec.id]?.count || 0)
            const isAlreadyActuallyInClass = oldClassIds.includes(spec.id) && enrollment.status !== StatusEnrollment.PENDING

            // Nếu lớp có giới hạn và đã đầy, và học viên này chưa có trong lớp đó
            if (max > 0 && count >= max && !isAlreadyActuallyInClass) {
              throwAppException('CLASS_FULL', ErrorCode.CLASS_FULL, HttpStatus.BAD_REQUEST)
            }
          }
        }

        // B. Đồng bộ hóa dữ liệu bảng ClassStudents
        // Xóa những lớp không còn trong danh sách đăng ký
        const classesToRemove = oldClassIds.filter(id => !newClassIds.includes(id))
        if (classesToRemove.length > 0) {
          await classStudentsRepo.delete({ student_id: enrollment.student_id, class_id: In(classesToRemove) })
        }

        // Thêm mới hoặc cập nhật thông tin lớp hiện tại
        const enrollmentClassDataMap = arrayToObject(enrollment.class_ids, 'class_id')
        for (const classId of newClassIds) {
          const classStudentEntry = await classStudentsRepo.findOne({ where: { student_id: enrollment.student_id, class_id: classId } })
          const currentLearnType = enrollmentClassDataMap[classId].learn_type

          if (!classStudentEntry) {
            await classStudentsRepo.save({
              student_id: enrollment.student_id,
              class_id: classId,
              learn_type: currentLearnType,
            })
          } else if (newClassData) {
            // Cập nhật lại hình thức học (learn_type) nếu danh sách lớp có thay đổi
            await classStudentsRepo.update(classStudentEntry.id, { learn_type: currentLearnType })
          }
        }

        // C. Đồng bộ giáo trình (student_books) cho các lớp học online (VIDEO / MEETING)
        await this.syncStudentBooksForStudent(
          queryRunner.manager,
          enrollment.student_id,
          enrollment.class_ids,
          oldClassIds,
          targetShippingAddress,
        )
      }

      // 8. LƯU THAY ĐỔI VÀ GỬI THÔNG BÁO
      const finalEnrollment = this.enrollmentsRepository.create({
        ...enrollment,
        status: newStatus || enrollment.status,
        full_name_normalized: rest.full_name ? removeVietnameseTones(rest.full_name).toLowerCase() : enrollment.full_name_normalized,
        ...rest,
      })
      await enrollmentsRepo.save(finalEnrollment)

      if (enrollment.email) {
        setImmediate(() => {
          this.handleEnrollmentEmail(enrollment, 'payment', newStatus).catch(err => console.error('Email payment job failed:', err))
        })
      }

      await queryRunner.commitTransaction()

      if (isNewUserCreated && newUserObj) {
        // Đồng bộ học viên sang hệ thống thư viện
        const birthDateToUse = rest.birth_date as any
        const new_birth_date = !birthDateToUse || birthDateToUse === '' ? '1970-01-01' : formatStringToDate(birthDateToUse)
        this.librarySyncService.syncStudentToLibrary({
          full_name: newUserObj.full_name,
          code: newUserObj.code,
          saint_name: newUserObj.saint_name || null,
          password: student_code,
          email: newUserObj.email || null,
          birth_date: new_birth_date as any,
          phone: newUserObj.phone_number || null,
          address: newUserObj.address || null,
          avatar: newUserObj.avatar || null,
        })
      }
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  private async handleEnrollmentEmail(enrollment: Enrollments, type: 'register' | 'payment', status?: StatusEnrollment, isThrowError = false) {
    try {
      if (!enrollment.email) return

      // Lấy ngày hiện tại theo múi giờ Việt Nam (UTC+7) để điền vào form mail/pdf
      const now = new Date()
      const utc7Date = new Date(now.getTime() + 7 * 60 * 60 * 1000)
      const day = utc7Date.getUTCDate()
      const month = utc7Date.getUTCMonth() + 1
      const year = utc7Date.getUTCFullYear()

      const class_ids = enrollment.class_ids.map(item => item.class_id)
      const classMap = arrayToObject(enrollment.class_ids, 'class_id')
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
        .where('class.id IN (:...class_ids)', { class_ids })
        .getMany()

      // format class
      const formatClass = listClass.map((classEntity: Classes, index: number) => {
        let learn_type: any = classMap[classEntity.id]?.learn_type
        if (learn_type === LearnType.VIDEO) {
          learn_type = 'Học qua video'
        } else if (learn_type === LearnType.MEETING) {
          learn_type = 'Học online'
        } else {
          learn_type = 'Học trực tiếp'
        }
        return {
          id: classEntity.id,
          index: index + 1,
          name: classEntity.name,
          price: formatCurrency(classEntity.price),
          schedule: mapScheduleToVietnamese(classEntity.schedule).join(', '),
          start_time: classEntity.start_time,
          end_time: classEntity.end_time,
          start_date: formatStringDate(classEntity.opening_day, true),
          end_date: formatStringDate(classEntity.closing_day, true),
          learn_type: learn_type,
        }
      })

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
        birth_date: formatStringDate(enrollment?.birth_date + '', true),
        birth_place: enrollment?.birth_place,
        phone: enrollment?.phone_number,
        email: enrollment?.email,
        parish: enrollment?.parish,
        address: enrollment?.address,
        shipping_address: enrollment?.shipping_address,
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
        templateName = 'enrollment-payment-success' // hbs email
        pdfTemplate = 'pdf-enrollment-payment-success' // hbs pdf đính kèm trong email
        pdfFilename = 'payment-success.pdf'
      } else if (type === 'register') {
        subject = 'Xác nhận đăng ký khóa học thành công'
        templateName = 'enrollment-register-succsess' // hbs email
        pdfTemplate = 'pdf-enrollment-register-success' // hbs pdf đính kèm trong email
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
      if (isThrowError) {
        throw err
      }
    }
  }

  async sendPaymentSuccessEmail(id: number): Promise<void> {
    const enrollment = await this.enrollmentsRepository.findOne({ where: { id } })
    if (!enrollment) {
      throwAppException('ENROLLMENT_NOT_FOUND', ErrorCode.ENROLLMENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    if (!enrollment.email) {
      throwAppException('NO_EMAIL_FOUND', ErrorCode.NO_EMAIL_FOUND, HttpStatus.BAD_REQUEST)
    }

    if (enrollment.status !== StatusEnrollment.DONE) {
      throwAppException('ENROLLMENT_NOT_PAID', ErrorCode.ENROLLMENT_NOT_PAID, HttpStatus.BAD_REQUEST)
    }

    await this.handleEnrollmentEmail(enrollment, 'payment', StatusEnrollment.DONE, true)
  }

  async sendAccountEmail(id: number): Promise<void> {
    const enrollment = await this.enrollmentsRepository.findOne({ where: { id } })
    if (!enrollment) {
      throwAppException('ENROLLMENT_NOT_FOUND', ErrorCode.ENROLLMENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const userRepo = this.dataSource.getRepository(User)
    let user: User | null = null

    if (enrollment.student_id) {
      const student = await this.studentRepository.findOne({ where: { id: enrollment.student_id } })
      if (student?.user_id) {
        user = await userRepo.findOne({ where: { id: student.user_id } })
      }
    }

    if (!user && enrollment.email) {
      user = await userRepo.findOne({ where: { email: enrollment.email } })
    }

    if (!user) {
      throwAppException('USER_NOT_FOUND', ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const emailToSend = user.email || enrollment.email
    if (!emailToSend) {
      throwAppException('NO_EMAIL_FOUND', ErrorCode.NO_EMAIL_FOUND, HttpStatus.BAD_REQUEST)
    }

    await this.emailService.sendMail([{ email: emailToSend, name: user.full_name }], 'Đăng ký tài khoản thành công', 'register-success', {
      name: user.full_name,
      username: user.code,
      password: user.code,
      loginLink: `${process.env.FRONTEND_URL}`,
    })
  }

  async sendInstructionEmail(id: number): Promise<void> {
    const enrollment = await this.enrollmentsRepository.findOne({ where: { id } })
    if (!enrollment) {
      throwAppException('ENROLLMENT_NOT_FOUND', ErrorCode.ENROLLMENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    if (!enrollment.email) {
      throwAppException('NO_EMAIL_FOUND', ErrorCode.NO_EMAIL_FOUND, HttpStatus.BAD_REQUEST)
    }

    const hasOnlineClass =
      Array.isArray(enrollment.class_ids) &&
      enrollment.class_ids.some(item => item.learn_type === LearnType.VIDEO || item.learn_type === LearnType.MEETING)

    if (!hasOnlineClass) {
      throwAppException('ENROLLMENT_NO_ONLINE_CLASS', ErrorCode.ENROLLMENT_NO_ONLINE_CLASS, HttpStatus.BAD_REQUEST)
    }

    const saintName = enrollment.saint_name ? `${enrollment.saint_name} ` : ''
    const fullName = enrollment.full_name || ''
    const mailContent = `Xin chào ${saintName}${fullName},<br><br>Học viện Mục vụ xin gửi video hướng dẫn sử dụng hệ thống học trực tuyến, xin học viên tham khảo kỹ để có một quá trình học tập thuận lợi nhất.<br><br>https://youtu.be/J_h32_gDSBE?si=-yo_sKlUyRq4O0Db<br><br>Mọi thắc mắc xin liên hệ lại với học viện qua bất kỳ hình thức liên lạc nào thuận tiện để được hỗ trợ.<br><br>Xin chân thành cảm ơn!`

    await this.emailService.sendMail(
      [{ email: enrollment.email, name: enrollment.full_name }],
      'Hướng dẫn sử dụng hệ thống học trực tuyến',
      '',
      null,
      undefined,
      mailContent,
    )
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
        'enrollment.gender',
        'enrollment.email',
        'enrollment.phone_number',
        'enrollment.address',
        'enrollment.shipping_address',
        'enrollment.birth_date',
        'enrollment.birth_place',
        'enrollment.parish',
        'enrollment.deanery',
        'enrollment.diocese',
        'enrollment.congregation',
        'enrollment.note',
        'enrollment.discount',
        'enrollment.user_note',
        'enrollment.is_read_note',
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

    const class_ids = enrollment.class_ids.map(item => item.class_id)
    const listClass = await this.classRepository
      .createQueryBuilder('class')
      .select([
        'class.id',
        'class.name',
        'class.price',
        'class.code',
        'class.schedule',
        'class.start_time',
        'class.learn_offline',
        'class.learn_video',
        'class.learn_meeting',
        'class.end_enrollment_day',
        'class.end_time',
        'class.opening_day',
        'class.closing_day',
      ])
      .where('class.id IN (:...class_ids)', { class_ids })
      .withDeleted()
      .getMany()
    if (listClass.length !== enrollment.class_ids.length) throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)

    const classStudentsObject = arrayToObject(enrollment.class_ids, 'class_id')
    const formatEnrollment: IEnrollments = {
      id: enrollment.id,
      code: enrollment.code,
      registration_date: new Date(enrollment.registration_date.getTime() + 7 * 60 * 60 * 1000),
      payment_method: enrollment.payment_method,
      payment_status: enrollment.payment_status,
      status: enrollment.status,
      total_fee: enrollment.total_fee,
      prepaid: enrollment.prepaid,
      debt: enrollment.debt,
      discount: enrollment.discount,
      note: enrollment.note,
      user_note: enrollment.user_note,
      is_read_note: enrollment.is_read_note,
      is_logged: enrollment.is_logged,
      voucher_code: enrollment.voucher_code,
      payment_info: {
        title: payment_info[0]?.title,
        content: payment_info[0]?.content,
      },
      classes: listClass.map(classEntity => ({
        class_id: classEntity.id,
        learn_type: classStudentsObject[classEntity.id]?.learn_type,
        class: {
          id: classEntity.id,
          name: classEntity.name,
          code: classEntity.code,
          price: classEntity.price,
          learn_offline: classEntity.learn_offline,
          learn_video: classEntity.learn_video,
          learn_meeting: classEntity.learn_meeting,
          end_enrollment_day: classEntity.end_enrollment_day,
          schedule: classEntity.schedule,
          start_time: classEntity.start_time,
          end_time: classEntity.end_time,
          start_date: classEntity.opening_day,
          end_date: classEntity.closing_day,
        },
      })),
      student_id: enrollment?.student?.id ? enrollment?.student?.id : null,
      student_code: enrollment?.student?.user?.code ? enrollment?.student?.user?.code : null,
      saint_name: enrollment.saint_name,
      full_name: enrollment.full_name,
      gender: enrollment.gender,
      email: enrollment.email,
      phone_number: enrollment.phone_number,
      address: enrollment.address,
      shipping_address: enrollment.shipping_address,
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
    const { semester_id, scholastic_id, full_name, ...rest } = paginateEnrollmentsDto

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
        'enrollment.is_read_note',
        'enrollment.is_logged',
        'enrollment.saint_name',
        'enrollment.full_name',
        'enrollment.gender',
        'enrollment.full_name_normalized',
        'enrollment.email',
        'enrollment.phone_number',
        'enrollment.address',
        'enrollment.shipping_address',
        'enrollment.class_ids',
        'student.id',
        'user.code',
        'user.birth_date',
      ])
      .leftJoin('enrollment.student', 'student')
      .leftJoin('student.user', 'user')

    /**
     * Search full name
     */
    if (full_name) {
      queryBuilder.andWhere(`enrollment.full_name_normalized LIKE :full_name`, {
        full_name: `%${removeVietnameseTones(full_name).toLowerCase().trim()}%`,
      })
    }

    /**
     * FILTER enrollment thật sự theo semester + scholastic
     */
    if (semester_id || scholastic_id) {
      queryBuilder.andWhere(qb => {
        const subQuery = qb.subQuery().select('1').from(Classes, 'c').where("JSON_CONTAINS(enrollment.class_ids, JSON_OBJECT('class_id', c.id))")

        if (semester_id) {
          subQuery.andWhere('c.semester_id = :semester_id', {
            semester_id,
          })
        }

        if (scholastic_id) {
          subQuery.andWhere('c.scholastic_id = :scholastic_id', {
            scholastic_id,
          })
        }

        return `EXISTS ${subQuery.getQuery()}`
      })

      /**
       * Optional:
       * lấy classes đã filter
       */
      queryBuilder.addSelect(qb => {
        const subQuery = qb
          .select(
            `
          JSON_ARRAYAGG(
            JSON_OBJECT(
              "id", c.id,
              "name", c.name
            )
          )
        `,
          )
          .from(Classes, 'c')
          .where("JSON_CONTAINS(enrollment.class_ids, JSON_OBJECT('class_id', c.id))")

        if (semester_id) {
          subQuery.andWhere('c.semester_id = :semester_id', {
            semester_id,
          })
        }

        if (scholastic_id) {
          subQuery.andWhere('c.scholastic_id = :scholastic_id', {
            scholastic_id,
          })
        }

        return subQuery
      }, 'classes')
    }

    queryBuilder.withDeleted()

    if (isSoftDelete) {
      queryBuilder.andWhere('enrollment.deleted_at IS NOT NULL')
    } else {
      queryBuilder.andWhere('enrollment.deleted_at IS NULL')
    }

    const { data, meta } = await paginate(queryBuilder, rest)

    const formatEnrollments: IEnrollments[] = data.map(enrollment => {
      return {
        ...enrollment,
        registration_date: new Date(enrollment.registration_date.getTime() + 7 * 60 * 60 * 1000),
        student_id: enrollment?.student?.id,
        student_code: enrollment?.student?.user?.code,
        saint_name: enrollment.saint_name,
        full_name: enrollment.full_name,
        gender: enrollment.gender,
        birth_date: enrollment?.student?.user?.birth_date,
        email: enrollment.email,
        phone_number: enrollment.phone_number,
        address: enrollment.address,
        shipping_address: enrollment.shipping_address,
        discount: enrollment.discount,
        is_read_note: enrollment.is_read_note,
        class_ids: enrollment.class_ids,
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
        const classIds = enrollment.class_ids.map(item => item.class_id)
        await classStudentsRepo.delete({
          class_id: In(classIds),
          student_id: enrollment.student_id,
        })

        if (enrollment.student_id) {
          await this.syncStudentBooksForStudent(queryRunner.manager, enrollment.student_id, [], classIds)
        }
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
      .getMany()

    for (const enrollment of enrollments) {
      await this.enrollmentsRepository.softDelete(enrollment.id)
    }
  }
}
