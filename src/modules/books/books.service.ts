import { paginate, PaginationMeta } from '@common/pagination'
import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Book } from './books.entity'
import { CreateBookDto } from './dtos/create-book.dto'
import { PaginateBookDto } from './dtos/paginate-book.dto'
import { UpdateBookDto } from './dtos/update-book.dto'

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
  ) {}

  async create(createBookDto: CreateBookDto): Promise<Book> {
    if (createBookDto.code) {
      const existing = await this.bookRepository.findOne({ where: { code: createBookDto.code } })
      if (existing) {
        throwAppException('BOOK_CODE_ALREADY_EXISTS', ErrorCode.BOOK_CODE_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
      }
    }

    const book = this.bookRepository.create(createBookDto)
    return await this.bookRepository.save(book)
  }

  async getAll(pagination: PaginateBookDto): Promise<{ data: Book[]; meta: PaginationMeta }> {
    const queryBuilder = this.bookRepository.createQueryBuilder('book')
    const { data, meta } = await paginate(queryBuilder, pagination)
    return { data, meta }
  }

  async getById(id: number): Promise<Book> {
    const book = await this.bookRepository.findOne({ where: { id } })
    if (!book) {
      throwAppException('BOOK_NOT_FOUND', ErrorCode.BOOK_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    return book
  }

  async update(id: number, updateBookDto: UpdateBookDto): Promise<Book> {
    const book = await this.bookRepository.findOne({ where: { id } })
    if (!book) {
      throwAppException('BOOK_NOT_FOUND', ErrorCode.BOOK_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    if (updateBookDto.code && updateBookDto.code !== book.code) {
      const existing = await this.bookRepository.findOne({ where: { code: updateBookDto.code } })
      if (existing && existing.id !== id) {
        throwAppException('BOOK_CODE_ALREADY_EXISTS', ErrorCode.BOOK_CODE_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
      }
    }

    await this.bookRepository.update(id, updateBookDto)
    return await this.bookRepository.findOne({ where: { id } })
  }

  async delete(id: number): Promise<void> {
    const exists = await this.bookRepository.exists({ where: { id } })
    if (!exists) {
      throwAppException('BOOK_NOT_FOUND', ErrorCode.BOOK_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    await this.bookRepository.softDelete(id)
  }
}
