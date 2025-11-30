import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Query } from '@nestjs/common'
import { DocumentsService } from './documents.service'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { ResponseDto } from '@common/response.dto'
import { CreateDocumentsDto } from './dtos/create-documents.dto'
import { PaginateDocumentDto, PaginateDocumentOrderDto } from './dtos/paginate-documents.dto'
import { CreateDocumentOrderDto, UpdateDocumentsDto } from './dtos/update-documents.dto'

@ApiTags('Admin Documents')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
@Controller('admin/documents')
export class AdminDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo tài liệu' })
  async createDocument(@Body() createDocumentDto: CreateDocumentsDto): Promise<ResponseDto> {
    const document = await this.documentsService.createDocument(createDocumentDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'DOCUMENT_CREATED_SUCCESSFULLY',
      data: document,
    })
  }

  @Post('order')
  @ApiOperation({ summary: 'Mua tài liệu' })
  async createDocumentOrder(@Body() createDocumentOrderDto: CreateDocumentOrderDto): Promise<ResponseDto> {
    const documentOrder = await this.documentsService.buyDocument(createDocumentOrderDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'DOCUMENT_ORDER_CREATED_SUCCESSFULLY',
      data: documentOrder,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả tài liệu' })
  async getDocuments(@Query() paginateDocumentDto: PaginateDocumentDto): Promise<ResponseDto> {
    const documents = await this.documentsService.paginateDocuments(paginateDocumentDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'DOCUMENTS_FETCHED_SUCCESSFULLY',
      data: documents.data,
      meta: documents.meta,
    })
  }

  @Get('order')
  @ApiOperation({ summary: 'Lấy tất cả đơn hàng tài liệu' })
  async getDocumentOrders(@Query() paginateDocumentOrderDto: PaginateDocumentOrderDto): Promise<ResponseDto> {
    const documentOrders = await this.documentsService.paginateDocumentOrder(paginateDocumentOrderDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'DOCUMENT_ORDERS_FETCHED_SUCCESSFULLY',
      data: documentOrders.data,
      meta: {
        ...documentOrders.meta,
        total_profit: documentOrders.total_profit,
      },
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy tài liệu theo id' })
  async getDocumentById(@Param('id') id: number): Promise<ResponseDto> {
    const document = await this.documentsService.getDocumentById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'DOCUMENT_FETCHED_SUCCESSFULLY',
      data: document,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật tài liệu' })
  async updateDocument(@Param('id') id: number, @Body() updateDocumentDto: UpdateDocumentsDto): Promise<ResponseDto> {
    const document = await this.documentsService.updateDocument(id, updateDocumentDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'DOCUMENT_UPDATED_SUCCESSFULLY',
      data: document,
    })
  }

  @Put('index/:id')
  @ApiOperation({ summary: 'Cập nhật vị trí tài liệu' })
  @ApiParam({ name: 'id', type: Number, description: 'Document id' })
  async updateIndex(@Param('id') id: number, @Query('index') index: number): Promise<ResponseDto> {
    await this.documentsService.updateIndex(id, index)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'DOCUMENT_UPDATED_SUCCESSFULLY',
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa tài liệu' })
  async deleteDocument(@Param('id') id: number): Promise<ResponseDto> {
    await this.documentsService.deleteDocument(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'DOCUMENT_DELETED_SUCCESSFULLY',
    })
  }
}

@ApiTags('User Documents')
@Controller('documents')
export class UserDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy tất cả tài liệu' })
  async getDocuments(@Query() paginateDocumentDto: PaginateDocumentDto): Promise<ResponseDto> {
    const documents = await this.documentsService.paginateDocuments(paginateDocumentDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'DOCUMENTS_FETCHED_SUCCESSFULLY',
      data: documents.data,
      meta: documents.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy tài liệu theo id' })
  async getDocumentById(@Param('id') id: number): Promise<ResponseDto> {
    const document = await this.documentsService.getDocumentById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'DOCUMENT_FETCHED_SUCCESSFULLY',
      data: document,
    })
  }
}
