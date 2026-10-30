import { paginate, PaginationMeta } from '@common/pagination'
import { removeVietnameseTones, throwAppException } from '@common/utils'
import { BookDeliveryStatus, LearnType, StatusEnrollment } from '@enums/class.enum'
import { ErrorCode } from '@enums/error-codes.enum'
import { Classes } from '@modules/class/class.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { Enrollments } from '@modules/enrollments/enrollments.entity'
import { Student } from '@modules/students/students.entity'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Not, Repository } from 'typeorm'
import { Book } from './books.entity'
import { IBook, IStudentBook } from './books.interface'
import { CreateBookDto } from './dtos/create-book.dto'
import { PaginateBookDto } from './dtos/paginate-book.dto'
import { CreateStudentBookDto, PaginateStudentBookDto, UpdateStudentBookDto } from './dtos/student-books.dto'
import { UpdateBookDto } from './dtos/update-book.dto'
import { StudentBook } from './student-books.entity'

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(StudentBook)
    private readonly studentBookRepository: Repository<StudentBook>,
    @InjectRepository(Classes)
    private readonly classRepository: Repository<Classes>,
    @InjectRepository(ClassStudents)
    private readonly classStudentsRepository: Repository<ClassStudents>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Enrollments)
    private readonly enrollmentsRepository: Repository<Enrollments>,
  ) {}

  private formatBook(book: Book): IBook {
    return {
      id: book.id,
      code: book.code,
      name: book.name,
      author: book.author,
      publisher: book.publisher,
      publication_year: book.publication_year,
      image: book.image,
      description: book.description,
      classes: book.classes
        ? book.classes.map(c => ({
            id: c.id,
            code: c.code,
            name: c.name,
            status: c.status,
            is_online: c.is_online,
            learn_offline: c.learn_offline,
            learn_video: c.learn_video,
            learn_meeting: c.learn_meeting,
            opening_day: c.opening_day,
            closing_day: c.closing_day,
          }))
        : [],
      created_at: book.created_at,
      updated_at: book.updated_at,
    }
  }

  private formatStudentBook(sb: StudentBook): IStudentBook {
    return {
      id: sb.id,
      student_id: sb.student_id,
      book_id: sb.book_id,
      book_status: sb.book_status,
      shipping_address: sb.shipping_address,
      book_delivery_note: sb.book_delivery_note,
      book_received_date: sb.book_received_date,
      created_at: sb.created_at,
      updated_at: sb.updated_at,
      student: sb.student
        ? {
            id: sb.student.id,
            code: sb.student.user?.code,
            full_name: sb.student.user?.full_name,
            first_name: sb.student.user?.first_name,
            saint_name: sb.student.user?.saint_name,
            email: sb.student.user?.email,
            phone_number: sb.student.user?.phone_number,
            gender: sb.student.user?.gender,
            avatar: sb.student.user?.avatar,
          }
        : undefined,
      book: sb.book
        ? {
            id: sb.book.id,
            code: sb.book.code,
            name: sb.book.name,
            author: sb.book.author,
            publisher: sb.book.publisher,
            publication_year: sb.book.publication_year,
            image: sb.book.image,
            description: sb.book.description,
          }
        : undefined,
    }
  }

  /**
   * Đồng bộ student_books khi gắn/gỡ lớp học vào sách:
   * - Với các lớp mới gắn vào sách: tìm học viên đang học online (VIDEO/MEETING) trong các lớp đó và tạo bản ghi student_books nếu chưa có.
   * - Với các lớp bị gỡ khỏi sách: nếu học viên không còn học online lớp nào khác gắn với sách này và trạng thái là NOT_SENT thì xóa bản ghi student_books.
   */
  private async syncStudentBooksWhenClassesChanged(bookId: number, addedClassIds: number[], removedClassIds: number[]): Promise<void> {
    if (addedClassIds.length > 0) {
      const onlineClassStudents = await this.classStudentsRepository.find({
        where: {
          class_id: In(addedClassIds),
          learn_type: In([LearnType.VIDEO, LearnType.MEETING]),
        },
      })

      const uniqueStudentIds = [...new Set(onlineClassStudents.map(cs => cs.student_id))]
      if (uniqueStudentIds.length > 0) {
        const existingStudentBooks = await this.studentBookRepository.find({
          where: {
            book_id: bookId,
            student_id: In(uniqueStudentIds),
          },
        })
        const existingStudentIdSet = new Set(existingStudentBooks.map(sb => sb.student_id))
        const missingStudentIds = uniqueStudentIds.filter(sid => !existingStudentIdSet.has(sid))

        if (missingStudentIds.length > 0) {
          // Lấy địa chỉ nhận sách từ đơn đăng ký gần nhất của học viên
          const enrollments = await this.enrollmentsRepository.find({
            where: {
              student_id: In(missingStudentIds),
              status: Not(StatusEnrollment.PENDING),
            },
            order: { id: 'DESC' },
          })
          const shippingAddressMap = new Map<number, string>()
          for (const enr of enrollments) {
            if (enr.student_id && enr.shipping_address && !shippingAddressMap.has(enr.student_id)) {
              shippingAddressMap.set(enr.student_id, enr.shipping_address)
            }
          }

          const toCreate = missingStudentIds.map(studentId =>
            this.studentBookRepository.create({
              student_id: studentId,
              book_id: bookId,
              book_status: BookDeliveryStatus.NOT_SENT,
              shipping_address: shippingAddressMap.get(studentId) ?? null,
            }),
          )
          await this.studentBookRepository.save(toCreate)
        }
      }
    }

    if (removedClassIds.length > 0) {
      const affectedClassStudents = await this.classStudentsRepository.find({
        where: {
          class_id: In(removedClassIds),
          learn_type: In([LearnType.VIDEO, LearnType.MEETING]),
        },
      })
      const affectedStudentIds = [...new Set(affectedClassStudents.map(cs => cs.student_id))]

      if (affectedStudentIds.length > 0) {
        const bookWithClasses = await this.bookRepository.findOne({
          where: { id: bookId },
          relations: ['classes'],
        })
        const remainingClassIds = bookWithClasses?.classes?.map(c => c.id) || []

        for (const studentId of affectedStudentIds) {
          let stillHasOnlineClassForBook = false
          if (remainingClassIds.length > 0) {
            stillHasOnlineClassForBook = await this.classStudentsRepository.exists({
              where: {
                student_id: studentId,
                class_id: In(remainingClassIds),
                learn_type: In([LearnType.VIDEO, LearnType.MEETING]),
              },
            })
          }

          if (!stillHasOnlineClassForBook) {
            await this.studentBookRepository.delete({
              student_id: studentId,
              book_id: bookId,
              book_status: BookDeliveryStatus.NOT_SENT,
            })
          }
        }
      }
    }
  }

  async create(createBookDto: CreateBookDto): Promise<IBook> {
    const { class_ids, ...bookData } = createBookDto

    if (bookData.code) {
      const existing = await this.bookRepository.findOne({ where: { code: bookData.code } })
      if (existing) {
        throwAppException('BOOK_CODE_ALREADY_EXISTS', ErrorCode.BOOK_CODE_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
      }
    }

    let classes: Classes[] = []
    const uniqueClassIds = class_ids ? [...new Set(class_ids)] : []
    if (uniqueClassIds.length > 0) {
      classes = await this.classRepository.findBy({ id: In(uniqueClassIds) })
      if (classes.length !== uniqueClassIds.length) {
        throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)
      }
    }

    const book = this.bookRepository.create({
      ...bookData,
      classes,
    })
    const savedBook = await this.bookRepository.save(book)

    if (uniqueClassIds.length > 0) {
      await this.syncStudentBooksWhenClassesChanged(savedBook.id, uniqueClassIds, [])
    }

    return this.formatBook(savedBook)
  }

  async getAll(pagination: PaginateBookDto): Promise<{ data: IBook[]; meta: PaginationMeta }> {
    const { class_id, ...rest } = pagination
    const queryBuilder = this.bookRepository.createQueryBuilder('book').leftJoinAndSelect('book.classes', 'classes')

    if (class_id) {
      queryBuilder.andWhere(qb => {
        const subQuery = qb
          .subQuery()
          .select('1')
          .from('class_books', 'cb')
          .where('cb.book_id = book.id')
          .andWhere('cb.class_id = :class_id', { class_id })
          .getQuery()
        return `EXISTS ${subQuery}`
      })
    }

    const { data, meta } = await paginate(queryBuilder, rest)
    return {
      data: data.map(b => this.formatBook(b)),
      meta,
    }
  }

  async getById(id: number): Promise<IBook> {
    const book = await this.bookRepository.findOne({
      where: { id },
      relations: ['classes'],
    })
    if (!book) {
      throwAppException('BOOK_NOT_FOUND', ErrorCode.BOOK_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    return this.formatBook(book)
  }

  async update(id: number, updateBookDto: UpdateBookDto): Promise<IBook> {
    const { class_ids, ...bookData } = updateBookDto
    const book = await this.bookRepository.findOne({
      where: { id },
      relations: ['classes'],
    })
    if (!book) {
      throwAppException('BOOK_NOT_FOUND', ErrorCode.BOOK_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    if (bookData.code && bookData.code !== book.code) {
      const existing = await this.bookRepository.findOne({ where: { code: bookData.code } })
      if (existing && existing.id !== id) {
        throwAppException('BOOK_CODE_ALREADY_EXISTS', ErrorCode.BOOK_CODE_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
      }
    }

    Object.assign(book, bookData)

    if (class_ids !== undefined) {
      const oldClassIds = (book.classes || []).map(c => c.id)
      const newClassIds = [...new Set(class_ids)]

      let classes: Classes[] = []
      if (newClassIds.length > 0) {
        classes = await this.classRepository.findBy({ id: In(newClassIds) })
        if (classes.length !== newClassIds.length) {
          throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)
        }
      }

      book.classes = classes
      await this.bookRepository.save(book)

      const addedClassIds = newClassIds.filter(cid => !oldClassIds.includes(cid))
      const removedClassIds = oldClassIds.filter(cid => !newClassIds.includes(cid))
      await this.syncStudentBooksWhenClassesChanged(id, addedClassIds, removedClassIds)
    } else {
      await this.bookRepository.save(book)
    }

    return await this.getById(id)
  }

  async updateBookClasses(id: number, classIds: number[]): Promise<IBook> {
    return await this.update(id, { class_ids: classIds })
  }

  async delete(id: number): Promise<void> {
    const exists = await this.bookRepository.exists({ where: { id } })
    if (!exists) {
      throwAppException('BOOK_NOT_FOUND', ErrorCode.BOOK_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    await this.bookRepository.softDelete(id)
  }

  /*===============================================
    ======== QUẢN LÝ SHIP SÁCH HỌC VIÊN ===========
  =================================================*/

  async getAllStudentBooks(pagination: PaginateStudentBookDto): Promise<{ data: IStudentBook[]; meta: PaginationMeta }> {
    const { student_id, book_id, book_status, full_name, code, phone_number, book_name, book_code, shipping_address, ...rest } = pagination

    const queryBuilder = this.studentBookRepository
      .createQueryBuilder('student_books')
      .leftJoinAndSelect('student_books.student', 'student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('student_books.book', 'book')
      .where('student.deleted_at IS NULL')
      .andWhere('book.deleted_at IS NULL')

    if (student_id) {
      queryBuilder.andWhere('student_books.student_id = :student_id', { student_id })
    }
    if (book_id) {
      queryBuilder.andWhere('student_books.book_id = :book_id', { book_id })
    }
    if (book_status) {
      queryBuilder.andWhere('student_books.book_status = :book_status', { book_status })
    }
    if (full_name) {
      const normalized = removeVietnameseTones(full_name).toLowerCase().trim()
      queryBuilder.andWhere('(user.full_name_normalized LIKE :full_name OR LOWER(user.full_name) LIKE :raw_full_name)', {
        full_name: `%${normalized}%`,
        raw_full_name: `%${full_name.toLowerCase().trim()}%`,
      })
    }
    if (code) {
      queryBuilder.andWhere('user.code LIKE :code', { code: `%${code.trim()}%` })
    }
    if (phone_number) {
      queryBuilder.andWhere('user.phone_number LIKE :phone_number', { phone_number: `%${phone_number.trim()}%` })
    }
    if (book_name) {
      queryBuilder.andWhere('book.name LIKE :book_name', { book_name: `%${book_name.trim()}%` })
    }
    if (book_code) {
      queryBuilder.andWhere('book.code LIKE :book_code', { book_code: `%${book_code.trim()}%` })
    }
    if (shipping_address) {
      queryBuilder.andWhere('student_books.shipping_address LIKE :shipping_address', {
        shipping_address: `%${shipping_address.trim()}%`,
      })
    }

    const { data, meta } = await paginate(queryBuilder, rest)
    return {
      data: data.map(sb => this.formatStudentBook(sb)),
      meta,
    }
  }

  async getStudentBookById(id: number): Promise<IStudentBook> {
    const sb = await this.studentBookRepository.findOne({
      where: { id },
      relations: ['student', 'student.user', 'book'],
    })
    if (!sb) {
      throwAppException('STUDENT_BOOK_NOT_FOUND', ErrorCode.STUDENT_BOOK_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    return this.formatStudentBook(sb)
  }

  async getBooksOfStudent(studentId: number): Promise<IStudentBook[]> {
    const studentExists = await this.studentRepository.exists({ where: { id: studentId } })
    if (!studentExists) {
      throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const list = await this.studentBookRepository.find({
      where: { student_id: studentId },
      relations: ['book', 'student', 'student.user'],
      order: { id: 'DESC' },
    })
    return list.map(sb => this.formatStudentBook(sb))
  }

  async getMyBooks(userId: number): Promise<IStudentBook[]> {
    const student = await this.studentRepository.findOne({ where: { user_id: userId }, select: ['id'] })
    if (!student) {
      throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    return await this.getBooksOfStudent(student.id)
  }

  async createStudentBook(dto: CreateStudentBookDto): Promise<IStudentBook> {
    const studentExists = await this.studentRepository.exists({ where: { id: dto.student_id } })
    if (!studentExists) {
      throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const bookExists = await this.bookRepository.exists({ where: { id: dto.book_id } })
    if (!bookExists) {
      throwAppException('BOOK_NOT_FOUND', ErrorCode.BOOK_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const existing = await this.studentBookRepository.findOne({
      where: { student_id: dto.student_id, book_id: dto.book_id },
    })
    if (existing) {
      throwAppException('STUDENT_BOOK_ALREADY_EXISTS', ErrorCode.STUDENT_BOOK_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
    }

    const receivedDate =
      dto.book_received_date !== undefined
        ? dto.book_received_date
        : dto.book_status === BookDeliveryStatus.RECEIVED
          ? new Date().toISOString().split('T')[0]
          : null

    const entity = this.studentBookRepository.create({
      student_id: dto.student_id,
      book_id: dto.book_id,
      book_status: dto.book_status ?? BookDeliveryStatus.NOT_SENT,
      shipping_address: dto.shipping_address ?? null,
      book_delivery_note: dto.book_delivery_note ?? null,
      book_received_date: receivedDate,
    })

    const saved = await this.studentBookRepository.save(entity)
    return await this.getStudentBookById(saved.id)
  }

  async updateStudentBook(id: number, dto: UpdateStudentBookDto): Promise<IStudentBook> {
    const sb = await this.studentBookRepository.findOne({ where: { id } })
    if (!sb) {
      throwAppException('STUDENT_BOOK_NOT_FOUND', ErrorCode.STUDENT_BOOK_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const updateData: Partial<StudentBook> = {}
    if (dto.book_status !== undefined) {
      updateData.book_status = dto.book_status
    }
    if (dto.shipping_address !== undefined) {
      updateData.shipping_address = dto.shipping_address
    }
    if (dto.book_delivery_note !== undefined) {
      updateData.book_delivery_note = dto.book_delivery_note
    }
    if (dto.book_received_date !== undefined) {
      updateData.book_received_date = dto.book_received_date
    } else if (dto.book_status === BookDeliveryStatus.RECEIVED && !sb.book_received_date) {
      updateData.book_received_date = new Date().toISOString().split('T')[0]
    }

    await this.studentBookRepository.update(id, updateData)
    return await this.getStudentBookById(id)
  }

  async updateStudentBookByStudentAndBook(studentId: number, bookId: number, dto: UpdateStudentBookDto): Promise<IStudentBook> {
    const sb = await this.studentBookRepository.findOne({
      where: { student_id: studentId, book_id: bookId },
    })
    if (!sb) {
      throwAppException('STUDENT_BOOK_NOT_FOUND', ErrorCode.STUDENT_BOOK_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    return await this.updateStudentBook(sb.id, dto)
  }

  async deleteStudentBook(id: number): Promise<void> {
    const exists = await this.studentBookRepository.exists({ where: { id } })
    if (!exists) {
      throwAppException('STUDENT_BOOK_NOT_FOUND', ErrorCode.STUDENT_BOOK_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    await this.studentBookRepository.delete(id)
  }
}
