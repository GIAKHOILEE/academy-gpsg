import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Query } from '@nestjs/common'
import { MailboxesService } from './mailboxes.service'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { PaginateMailboxesDto } from './dtos/paginate-mailboxes.dto'
import { ResponseDto } from '@common/response.dto'
import { CreateMailboxesDto } from './dtos/create-mailboxes.dto'
import { UpdateIsReadDto, UpdateMailboxesDto } from './dtos/update-mailboxes.dto'

@Controller('admin/mailboxes')
@ApiTags('Admin Mailboxes')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
export class AdminMailboxesController {
  constructor(private readonly mailboxesService: MailboxesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all mailboxes' })
  async getMailboxes(@Query() paginateMailboxesDto: PaginateMailboxesDto): Promise<ResponseDto> {
    const mailboxes = await this.mailboxesService.getMailboxes(paginateMailboxesDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'MAILBOX_GET_ALL',
      data: mailboxes.data,
      meta: mailboxes.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a mailbox by id' })
  async getMailboxesById(@Param('id') id: number): Promise<ResponseDto> {
    const mailboxes = await this.mailboxesService.getMailboxesById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'MAILBOX_GET_BY_ID',
      data: mailboxes,
    })
  }

  @Put(':id/is-read')
  @ApiOperation({ summary: 'Update a mailbox is read' })
  async updateMailboxesIsRead(@Param('id') id: number, @Body() updateIsReadDto: UpdateIsReadDto): Promise<ResponseDto> {
    await this.mailboxesService.adminUpdateIsReadMailboxes(id, updateIsReadDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'MAILBOX_UPDATED_IS_READ',
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a mailbox' })
  async deleteMailboxes(@Param('id') id: number): Promise<ResponseDto> {
    await this.mailboxesService.deleteMailboxes(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'MAILBOX_DELETED',
    })
  }
}

@Controller('mailboxes')
@ApiTags('User Mailboxes')
export class UserMailboxesController {
  constructor(private readonly mailboxesService: MailboxesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a mailbox' })
  async createMailboxes(@Body() createMailboxesDto: CreateMailboxesDto): Promise<ResponseDto> {
    const mailboxes = await this.mailboxesService.createMailboxes(createMailboxesDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'MAILBOX_CREATED',
      data: mailboxes,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a mailbox' })
  async updateMailboxes(@Param('id') id: number, @Body() updateMailboxesDto: UpdateMailboxesDto): Promise<ResponseDto> {
    const mailboxes = await this.mailboxesService.userUpdateMailboxes(id, updateMailboxesDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'MAILBOX_UPDATED',
      data: mailboxes,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get all My mailboxes' })
  async getMailboxes(@Query() paginateMailboxesDto: PaginateMailboxesDto): Promise<ResponseDto> {
    const mailboxes = await this.mailboxesService.getMailboxes(paginateMailboxesDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'MAILBOX_GET_ALL_MY',
      data: mailboxes.data,
      meta: mailboxes.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a mailbox by id' })
  async getMailboxesById(@Param('id') id: number): Promise<ResponseDto> {
    const mailboxes = await this.mailboxesService.getMailboxesById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'MAILBOX_GET_BY_ID',
      data: mailboxes,
    })
  }
}
