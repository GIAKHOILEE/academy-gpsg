import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { BooksService } from './books.service'
import { CreateBookDto } from './dtos/create-book.dto'
import { PaginateBookDto } from './dtos/paginate-book.dto'
import { UpdateBookDto } from './dtos/update-book.dto'

/*===============================================
  =====================ADMIN=====================
=================================================*/
@Controller('admin/books')
@ApiTags('Admin Books')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
export class BooksAdminController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo mới giáo trình / sách' })
  async create(@Body() createBookDto: CreateBookDto): Promise<ResponseDto> {
    const book = await this.booksService.create(createBookDto)
    return new ResponseDto({
      statusCode: 201,
      messageCode: 'BOOK_CREATED_SUCCESS',
      data: book,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách giáo trình / sách (phân trang, tìm kiếm)' })
  async getAll(@Query() pagination: PaginateBookDto): Promise<ResponseDto> {
    const result = await this.booksService.getAll(pagination)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'BOOKS_FETCHED_SUCCESS',
      data: result.data,
      meta: result.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết giáo trình / sách theo ID' })
  @ApiParam({ name: 'id', type: Number, description: 'ID giáo trình / sách' })
  async getById(@Param('id') id: string): Promise<ResponseDto> {
    const book = await this.booksService.getById(Number(id))
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'BOOK_FETCHED_SUCCESS',
      data: book,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật giáo trình / sách' })
  @ApiParam({ name: 'id', type: Number, description: 'ID giáo trình / sách' })
  async update(@Param('id') id: string, @Body() updateBookDto: UpdateBookDto): Promise<ResponseDto> {
    const updatedBook = await this.booksService.update(Number(id), updateBookDto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'BOOK_UPDATED_SUCCESS',
      data: updatedBook,
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa giáo trình / sách' })
  @ApiParam({ name: 'id', type: Number, description: 'ID giáo trình / sách' })
  async delete(@Param('id') id: string): Promise<ResponseDto> {
    await this.booksService.delete(Number(id))
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'BOOK_DELETED_SUCCESS',
    })
  }
}

/*===============================================
  =====================PUBLIC====================
=================================================*/
@Controller('books')
@ApiTags('Books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách giáo trình / sách cho người dùng' })
  async getAll(@Query() pagination: PaginateBookDto): Promise<ResponseDto> {
    const result = await this.booksService.getAll(pagination)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'BOOKS_FETCHED_SUCCESS',
      data: result.data,
      meta: result.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết giáo trình / sách cho người dùng' })
  @ApiParam({ name: 'id', type: Number, description: 'ID giáo trình / sách' })
  async getById(@Param('id') id: string): Promise<ResponseDto> {
    const book = await this.booksService.getById(Number(id))
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'BOOK_FETCHED_SUCCESS',
      data: book,
    })
  }
}
