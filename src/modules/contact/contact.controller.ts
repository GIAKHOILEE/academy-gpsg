import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ContactService } from './contact.service'
import { CreateContactDto } from './dtos/create-contact.dto'
import { UpdateContactDto } from './dtos/update-contact.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { ResponseDto } from 'src/common/response.dto'
/*================================================
=======================ADMIN========================
================================================*/
@ApiTags('Admin contact')
@Controller('admin/contact')
@Auth(Role.ADMIN, Role.STAFF)
@ApiBearerAuth()
export class ContactAdminController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new contact' })
  async create(@Body() createContactDto: CreateContactDto): Promise<ResponseDto> {
    const contact = await this.contactService.create(createContactDto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'CREATE_CONTACT_SUCCESS',
      data: contact,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a contact' })
  async update(@Param('id') id: string, @Body() updateContactDto: UpdateContactDto): Promise<ResponseDto> {
    const contact = await this.contactService.update(Number(id), updateContactDto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_CONTACT_SUCCESS',
      data: contact,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get a contact' })
  async getContact(): Promise<ResponseDto> {
    const contact = await this.contactService.getContact()
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_CONTACT_SUCCESS',
      data: contact,
    })
  }
}

@ApiTags('User contact')
@Controller('contact')
export class ContactUserController {
  constructor(private readonly contactService: ContactService) {}

  @Get()
  @ApiOperation({ summary: 'Get a contact' })
  async getContact(): Promise<ResponseDto> {
    const contact = await this.contactService.getContact()
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_CONTACT_SUCCESS',
      data: contact,
    })
  }
}
