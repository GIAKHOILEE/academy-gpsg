import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common'
import { PaginateAnnouncementStationDto } from '@modules/announcement-station/dtos/paginate-announcement-station.dto'
import { AdminLoginDto } from '@modules/auth/dtos/user-login.dto'
import { CreateBookDto } from '@modules/books/dtos/create-book.dto'
import { CreateStudentBookDto, PaginateStudentBookDto, UpdateStudentBookDto } from '@modules/books/dtos/student-books.dto'
import { PaginateCertificatesDto } from '@modules/certificates/dtos/paginate-certificates.dto'
import { PaginateAttendanceDto } from '@modules/class-rules/attendance/dtos/paginate-attendance.dto'
import { CreateExamDto } from '@modules/class-rules/exam/_exam/dtos/create-exam.dto'
import { PaginateMyExamScoresDto } from '@modules/class-rules/exam/exam-scores/dtos/paginate-exam-scores.dto'
import { CreateScholasticDto } from '@modules/class/_scholastic/dtos/create-scholastic.dto'
import { CreateSemesterDto } from '@modules/class/_semester/dtos/create-semester.dto'
import { GetStudentsOfClassDto, PaginateClassDto } from '@modules/class/dtos/paginate-class.dto'
import { CreateConsultDto } from '@modules/consult/dtos/create-consult.dto'
import { CreateContactDto } from '@modules/contact/dtos/create-contact.dto'
import { CreateDepartmentDto } from '@modules/departments/dtos/create-department.dto'
import { CreateDocumentOrderDto } from '@modules/documents/dtos/update-documents.dto'
import { CreateEnrollmentsDto } from '@modules/enrollments/dtos/create-enrollments.dto'
import { UpdateEnrollmentsDto } from '@modules/enrollments/dtos/update-enrollments.dto'
import { CreateFinancesDto } from '@modules/finances/dtos/create-finances.dto'
import { CreateMailboxesDto } from '@modules/mailboxes/dtos/create-mailboxes.dto'
import { CreatePostCatalogDto } from '@modules/post-catalog/dtos/create-post-catalog.dto'
import { RegisterSmsDeviceDto } from '@modules/sms-gateway/dtos/register-sms-device.dto'
import { CreateStorageFolderDto, RenameStorageFileDto, RenameStorageFolderDto } from '@modules/storage/dtos/storage-file.dto'
import { CreateStorageProviderDto, UpdateStorageProviderDto } from '@modules/storage/dtos/storage-provider.dto'
import { CreateTopicDto } from '@modules/storys/topic/dtos/create-topic.dto'
import { CreateStudentsDto, CreateStudentWithEnrollmentDto } from '@modules/students/dtos/create-students.dto'
import { PaginateStudentsDto, SearchStudentClassCertificateDto } from '@modules/students/dtos/paginate-students.dto'
import { UpdateStudentsDto } from '@modules/students/dtos/update-students.dto'
import { CreateSubjectDto } from '@modules/subjects/dtos/create-subject.dto'
import { CreateTeachersDto } from '@modules/teachers/dtos/create-teachers.dto'
import { PaginateTeachersDto } from '@modules/teachers/dtos/paginate-teachers.dto'
import { UpdateTeachersDto } from '@modules/teachers/dtos/update-teachers.dto'
import { CreateTimekeepingDto } from '@modules/timekeeping/dtos/create-timekeeping.dto'
import { CreateUserDto } from '@modules/users/dtos/create-user.dto'
import { UpdateUserDto } from '@modules/users/dtos/update-user.dto'
import { CreateVoucherDto } from '@modules/voucher/dtos/create-voucher.dto'
import { CreateWitnessFaithMenuDto } from '@modules/witness-faiths/_witness-faith-menu/dtos/create-witness-faith-menu.dto'
import { CreateWitnessFaithDto } from '@modules/witness-faiths/dtos/create-witness-faith.dto'
import { Gender } from '@enums/role.enum'
import { LearnType, PaymentMethod } from '@enums/class.enum'
import { FinancesType } from '@enums/finances.enum'
import { StorageDriver } from '@enums/storage.enum'
import { VoucherType } from '@enums/voucher.enum'

describe('DTO @Trim() with ValidationPipe', () => {
  const pipe = new ValidationPipe({ whitelist: true, transform: true })

  const transform = <T>(metatype: new () => T, value: Record<string, any>, type: ArgumentMetadata['type'] = 'body'): Promise<T> =>
    pipe.transform(value, { type, metatype })

  it('trims user, student, teacher and login name fields while keeping password untouched', async () => {
    const login = await transform(AdminLoginDto, {
      username: '  superadmin  ',
      password: '  pass123  ',
    })
    expect(login.username).toBe('superadmin')
    expect(login.password).toBe('  pass123  ')

    const createdUser = await transform(CreateUserDto, {
      full_name: '  Nguyễn Văn An  ',
      username: '  admin_an  ',
      saint_name: '  Giuse  ',
      email: 'an@example.com',
      password: '  secret123  ',
    })
    expect(createdUser.full_name).toBe('Nguyễn Văn An')
    expect(createdUser.username).toBe('admin_an')
    expect(createdUser.saint_name).toBe('Giuse')
    expect(createdUser.password).toBe('  secret123  ')

    const updatedUser = await transform(UpdateUserDto, {
      full_name: '  Trần Thị Bình  ',
      username: '  binh  ',
      saint_name: '  Maria  ',
    })
    expect(updatedUser.full_name).toBe('Trần Thị Bình')
    expect(updatedUser.username).toBe('binh')
    expect(updatedUser.saint_name).toBe('Maria')

    const createdStudent = await transform(CreateStudentsDto, {
      full_name: '  Lê Văn Cường  ',
      saint_name: '  Phêrô  ',
      email: 'cuong@example.com',
    })
    expect(createdStudent.full_name).toBe('Lê Văn Cường')
    expect(createdStudent.saint_name).toBe('Phêrô')

    const createdStudentEnrollment = await transform(CreateStudentWithEnrollmentDto, {
      full_name: '  Phạm Minh  ',
      saint_name: '  Phaolô  ',
      email: 'minh@example.com',
    })
    expect(createdStudentEnrollment.full_name).toBe('Phạm Minh')
    expect(createdStudentEnrollment.saint_name).toBe('Phaolô')

    const updatedStudent = await transform(UpdateStudentsDto, {
      full_name: '  Lê Văn Dũng  ',
      saint_name: '  Gioan  ',
    })
    expect(updatedStudent.full_name).toBe('Lê Văn Dũng')
    expect(updatedStudent.saint_name).toBe('Gioan')

    const createdTeacher = await transform(CreateTeachersDto, {
      full_name: '  LM Giuse Minh  ',
      saint_name: '  Giuse  ',
      other_name: '  LM  ',
      bank_name: '  Vietcombank  ',
      bank_account_name: '  NGUYEN VAN MINH  ',
      email: 'gv@example.com',
    })
    expect(createdTeacher.full_name).toBe('LM Giuse Minh')
    expect(createdTeacher.saint_name).toBe('Giuse')
    expect(createdTeacher.other_name).toBe('LM')
    expect(createdTeacher.bank_name).toBe('Vietcombank')
    expect(createdTeacher.bank_account_name).toBe('NGUYEN VAN MINH')

    const updatedTeacher = await transform(UpdateTeachersDto, {
      full_name: '  TS Nguyễn A  ',
      saint_name: '  Tôma  ',
      other_name: '  TS  ',
      bank_name: '  ACB  ',
      bank_account_name: '  NGUYEN A  ',
    })
    expect(updatedTeacher.full_name).toBe('TS Nguyễn A')
    expect(updatedTeacher.saint_name).toBe('Tôma')
    expect(updatedTeacher.other_name).toBe('TS')
    expect(updatedTeacher.bank_name).toBe('ACB')
    expect(updatedTeacher.bank_account_name).toBe('NGUYEN A')
  })

  it('trims enrollment, consult, mailbox, book and nested order name fields', async () => {
    const createEnrollment = await transform(CreateEnrollmentsDto, {
      class_ids: [{ class_id: 1, learn_type: LearnType.OFFLINE }],
      payment_method: PaymentMethod.CASH,
      gender: Gender.MALE,
      saint_name: '  Đaminh  ',
      full_name: '  Vũ Hoàng Nam  ',
      shipping_name: '  Vũ Thị Hoa  ',
    })
    expect(createEnrollment.saint_name).toBe('Đaminh')
    expect(createEnrollment.full_name).toBe('Vũ Hoàng Nam')
    expect(createEnrollment.shipping_name).toBe('Vũ Thị Hoa')

    const updateEnrollment = await transform(UpdateEnrollmentsDto, {
      saint_name: '  Anna  ',
      full_name: '  Nguyễn Thị Lan  ',
      shipping_name: '  Nguyễn Thị Mai  ',
    })
    expect(updateEnrollment.saint_name).toBe('Anna')
    expect(updateEnrollment.full_name).toBe('Nguyễn Thị Lan')
    expect(updateEnrollment.shipping_name).toBe('Nguyễn Thị Mai')

    const consult = await transform(CreateConsultDto, {
      saint_name: '  Têrêsa  ',
      full_name: '  Đỗ Thu Hà  ',
      phone_number: '0909090909',
      content: 'Hỏi lịch học',
    })
    expect(consult.saint_name).toBe('Têrêsa')
    expect(consult.full_name).toBe('Đỗ Thu Hà')

    const mailbox = await transform(CreateMailboxesDto, {
      content: 'Góp ý',
      full_name: '  Hoàng Anh  ',
    })
    expect(mailbox.full_name).toBe('Hoàng Anh')

    const book = await transform(CreateBookDto, { name: '  Thần học căn bản  ' })
    expect(book.name).toBe('Thần học căn bản')

    const createStudentBook = await transform(CreateStudentBookDto, {
      student_id: 1,
      book_id: 2,
      shipping_name: '  Trần Minh  ',
    })
    expect(createStudentBook.shipping_name).toBe('Trần Minh')

    const updateStudentBook = await transform(UpdateStudentBookDto, {
      shipping_name: '  Trần Quang  ',
    })
    expect(updateStudentBook.shipping_name).toBe('Trần Quang')

    const docOrder = await transform(CreateDocumentOrderDto, {
      buyDocuments: [{ id: 1, quantity: 2 }],
      user: { name: '  John Doe  ', email: 'john@example.com' },
    })
    expect(docOrder.user.name).toBe('John Doe')
  })

  it('trims entity name DTOs including PartialType and query/paginate DTOs', async () => {
    expect((await transform(CreateDepartmentDto, { code: 'KH1', name: '  Thần học  ' })).name).toBe('Thần học')
    expect((await transform(CreateSubjectDto, { department_id: 1, code: 'M1', name: '  Kinh Thánh  ' })).name).toBe('Kinh Thánh')
    expect((await transform(CreateScholasticDto, { name: '  2025-2026  ' })).name).toBe('2025-2026')
    expect((await transform(CreateSemesterDto, { name: '  Học kỳ 1  ' })).name).toBe('Học kỳ 1')
    expect((await transform(CreateExamDto, { class_id: 1, name: '  Giữa kỳ  ', weight_percentage: 30 })).name).toBe('Giữa kỳ')
    expect((await transform(CreateContactDto, { name: '  Học viện Mục vụ  ' })).name).toBe('Học viện Mục vụ')
    expect(
      (await transform(CreateFinancesDto, { name: '  Chi phí  ', type: FinancesType.GENERAL, statement: true, day: 1, month: 1, year: 2026 })).name,
    ).toBe('Chi phí')
    expect((await transform(CreatePostCatalogDto, { name: '  Tin tức  ' })).name).toBe('Tin tức')
    expect((await transform(CreateTopicDto, { name: '  Giới trẻ  ' })).name).toBe('Giới trẻ')
    expect((await transform(CreateWitnessFaithDto, { witness_faith_menu_id: 1, name: '  Thánh Anrê  ' })).name).toBe('Thánh Anrê')
    expect((await transform(CreateWitnessFaithMenuDto, { name: '  Các Thánh  ' })).name).toBe('Các Thánh')
    expect((await transform(CreateVoucherDto, { name: '  Ưu đãi  ', code: 'VC1', type: VoucherType.PERCENTAGE, discount: 10 })).name).toBe('Ưu đãi')
    expect(
      (await transform(CreateTimekeepingDto, { name: '  Nguyễn Văn A  ', year: 2026, month: 1, days: [8], allowance: 0, salary_per_hour: 100000 }))
        .name,
    ).toBe('Nguyễn Văn A')
    expect((await transform(RegisterSmsDeviceDto, { device_id: 'dev-1', name: '  Máy chính  ' })).name).toBe('Máy chính')
    expect((await transform(RenameStorageFileDto, { name: '  file.pdf  ' })).name).toBe('file.pdf')
    expect((await transform(CreateStorageFolderDto, { provider_id: 1, name: '  tai-lieu  ' })).name).toBe('tai-lieu')
    expect((await transform(RenameStorageFolderDto, { name: '  moi  ' })).name).toBe('moi')
    expect((await transform(CreateStorageProviderDto, { name: '  R2 chính  ', driver: StorageDriver.S3, config: {} })).name).toBe('R2 chính')
    expect((await transform(UpdateStorageProviderDto, { name: '  R2 phụ  ' })).name).toBe('R2 phụ')

    const paginateStudents = await transform(PaginateStudentsDto, { full_name: '  An  ', first_name: '  An  ', class_name: '  Lớp 1  ' }, 'query')
    expect(paginateStudents.full_name).toBe('An')
    expect(paginateStudents.first_name).toBe('An')
    expect(paginateStudents.class_name).toBe('Lớp 1')

    const searchCert = await transform(SearchStudentClassCertificateDto, { full_name: '  Hoàng An  ' }, 'query')
    expect(searchCert.full_name).toBe('Hoàng An')

    const paginateTeachers = await transform(PaginateTeachersDto, { full_name: '  Bình  ', first_name: '  Bình  ', class_name: '  Lớp 2  ' }, 'query')
    expect(paginateTeachers.full_name).toBe('Bình')
    expect(paginateTeachers.first_name).toBe('Bình')
    expect(paginateTeachers.class_name).toBe('Lớp 2')

    const paginateClass = await transform(PaginateClassDto, { name: '  Giáo lý  ' }, 'query')
    expect(paginateClass.name).toBe('Giáo lý')

    const classStudents = await transform(GetStudentsOfClassDto, { full_name: '  Nam  ', first_name: '  Nam  ' }, 'query')
    expect(classStudents.full_name).toBe('Nam')
    expect(classStudents.first_name).toBe('Nam')

    const studentBooksQuery = await transform(
      PaginateStudentBookDto,
      { full_name: '  A  ', book_name: '  Sách 1  ', shipping_name: '  B  ' },
      'query',
    )
    expect(studentBooksQuery.full_name).toBe('A')
    expect(studentBooksQuery.book_name).toBe('Sách 1')
    expect(studentBooksQuery.shipping_name).toBe('B')

    expect((await transform(PaginateCertificatesDto, { full_name: '  Khanh  ' }, 'query')).full_name).toBe('Khanh')
    expect((await transform(PaginateAttendanceDto, { full_name: '  Lan  ' }, 'query')).full_name).toBe('Lan')
    expect((await transform(PaginateAnnouncementStationDto, { full_name: '  Mai  ' }, 'query')).full_name).toBe('Mai')
    expect((await transform(PaginateMyExamScoresDto, { class_name: '  10A1  ' }, 'query')).class_name).toBe('10A1')
  })

  it('rejects whitespace-only required name fields and non-string values safely', async () => {
    await expect(
      transform(CreateConsultDto, {
        full_name: '   ',
        phone_number: '0909090909',
        content: 'Hỏi học',
      }),
    ).rejects.toThrow(BadRequestException)

    await expect(
      transform(CreateUserDto, {
        username: '  ab  ',
        email: 'a@b.com',
        password: 'password123',
      }),
    ).rejects.toThrow(BadRequestException)

    await expect(
      transform(CreateDepartmentDto, {
        code: 'D1',
        name: '   ',
      }),
    ).rejects.toThrow(BadRequestException)

    await expect(
      transform(CreateBookDto, {
        name: 12345 as any,
      }),
    ).rejects.toThrow(BadRequestException)
  })
})
