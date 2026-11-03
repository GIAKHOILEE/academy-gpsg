import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Request } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { BooksService } from './books.service'
import { CreateBookDto } from './dtos/create-book.dto'
import { PaginateBookDto } from './dtos/paginate-book.dto'
import { CreateStudentBookDto, PaginateStudentBookDto, UpdateStudentBookDto } from './dtos/student-books.dto'
import { UpdateBookClassesDto, UpdateBookDto } from './dtos/update-book.dto'

/*===============================================
  =====================ADMIN=====================
=================================================*/
@Controller('admin/books')
@ApiTags('Admin Books')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
export class BooksAdminController {
  constructor(private readonly booksService: BooksService) {}

  /*--- Quản lý giao sách (ship sách) cho học viên ---*/

  @Get('student-books')
  @ApiOperation({ summary: 'Danh sách ship sách cho học viên (không phụ thuộc lớp học)' })
  async getAllStudentBooks(@Query() pagination: PaginateStudentBookDto): Promise<ResponseDto> {
    const result = await this.booksService.getAllStudentBooks(pagination)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'STUDENT_BOOKS_FETCHED_SUCCESS',
      data: result.data,
      meta: result.meta,
    })
  }

  @Post('student-books')
  @ApiOperation({ summary: 'Gán thủ công một giáo trình / sách cho học viên để giao sách' })
  async createStudentBook(@Body() dto: CreateStudentBookDto): Promise<ResponseDto> {
    const data = await this.booksService.createStudentBook(dto)
    return new ResponseDto({
      statusCode: 201,
      messageCode: 'STUDENT_BOOK_CREATED_SUCCESS',
      data,
    })
  }

  @Get('student-books/:id')
  @ApiOperation({ summary: 'Chi tiết một bản ghi giao sách của học viên' })
  @ApiParam({ name: 'id', type: Number, description: 'ID bản ghi student_books' })
  async getStudentBookById(@Param('id') id: string): Promise<ResponseDto> {
    const data = await this.booksService.getStudentBookById(Number(id))
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'STUDENT_BOOK_FETCHED_SUCCESS',
      data,
    })
  }

  @Patch('student-books/:id')
  @ApiOperation({ summary: 'Cập nhật trạng thái ship sách / địa chỉ nhận sách / ghi chú theo ID student_books' })
  @ApiParam({ name: 'id', type: Number, description: 'ID bản ghi student_books' })
  async updateStudentBook(@Param('id') id: string, @Body() dto: UpdateStudentBookDto): Promise<ResponseDto> {
    const data = await this.booksService.updateStudentBook(Number(id), dto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'STUDENT_BOOK_STATUS_UPDATED_SUCCESSFULLY',
      data,
    })
  }

  @Delete('student-books/:id')
  @ApiOperation({ summary: 'Xóa bản ghi sách của học viên' })
  @ApiParam({ name: 'id', type: Number, description: 'ID bản ghi student_books' })
  async deleteStudentBook(@Param('id') id: string): Promise<ResponseDto> {
    await this.booksService.deleteStudentBook(Number(id))
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'STUDENT_BOOK_DELETED_SUCCESS',
    })
  }

  @Get('students/:studentId')
  @ApiOperation({ summary: 'Lấy danh sách giáo trình / sách của một học viên' })
  @ApiParam({ name: 'studentId', type: Number, description: 'ID học viên' })
  async getBooksOfStudent(@Param('studentId') studentId: string): Promise<ResponseDto> {
    const data = await this.booksService.getBooksOfStudent(Number(studentId))
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'STUDENT_BOOKS_FETCHED_SUCCESS',
      data,
    })
  }

  @Patch(':bookId/students/:studentId')
  @ApiOperation({ summary: 'Cập nhật trạng thái ship sách / địa chỉ nhận sách theo bookId và studentId' })
  @ApiParam({ name: 'bookId', type: Number, description: 'ID giáo trình / sách' })
  @ApiParam({ name: 'studentId', type: Number, description: 'ID học viên' })
  async updateStudentBookByStudentAndBook(
    @Param('bookId') bookId: string,
    @Param('studentId') studentId: string,
    @Body() dto: UpdateStudentBookDto,
  ): Promise<ResponseDto> {
    const data = await this.booksService.updateStudentBookByStudentAndBook(Number(studentId), Number(bookId), dto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'STUDENT_BOOK_STATUS_UPDATED_SUCCESSFULLY',
      data,
    })
  }

  /*--- Quản lý danh mục sách / giáo trình ---*/

  @Post()
  @ApiOperation({ summary: 'Tạo mới giáo trình / sách (kèm danh sách class_ids)' })
  async create(@Body() createBookDto: CreateBookDto): Promise<ResponseDto> {
    const book = await this.booksService.create(createBookDto)
    return new ResponseDto({
      statusCode: 201,
      messageCode: 'BOOK_CREATED_SUCCESS',
      data: book,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách giáo trình / sách (phân trang, tìm kiếm, kèm danh sách lớp)' })
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
  @ApiOperation({ summary: 'Lấy chi tiết giáo trình / sách theo ID (kèm danh sách lớp)' })
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
  @ApiOperation({ summary: 'Cập nhật giáo trình / sách (kèm danh sách class_ids)' })
  @ApiParam({ name: 'id', type: Number, description: 'ID giáo trình / sách' })
  async update(@Param('id') id: string, @Body() updateBookDto: UpdateBookDto): Promise<ResponseDto> {
    const updatedBook = await this.booksService.update(Number(id), updateBookDto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'BOOK_UPDATED_SUCCESS',
      data: updatedBook,
    })
  }

  @Patch(':id/classes')
  @ApiOperation({ summary: 'Cập nhật danh sách lớp học gắn vào sách / giáo trình' })
  @ApiParam({ name: 'id', type: Number, description: 'ID giáo trình / sách' })
  async updateBookClasses(@Param('id') id: string, @Body() dto: UpdateBookClassesDto): Promise<ResponseDto> {
    const updatedBook = await this.booksService.updateBookClasses(Number(id), dto.class_ids)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'BOOK_CLASSES_UPDATED_SUCCESS',
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
  ====================STUDENT====================
=================================================*/
@Controller('student/books')
@ApiTags('Student Books')
@ApiBearerAuth()
@Auth(Role.STUDENT)
export class StudentBooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách giáo trình / sách của học viên đang đăng nhập' })
  async getMyBooks(@Request() req): Promise<ResponseDto> {
    const data = await this.booksService.getMyBooks(req.user.userId)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'STUDENT_BOOKS_FETCHED_SUCCESS',
      data,
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
