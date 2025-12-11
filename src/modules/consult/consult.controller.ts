import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { ConsultService } from './consult.service'
import { CreateConsultDto } from './dtos/create-consult.dto'
import { ResponseDto } from '@common/response.dto'
import { PaginateConsultDto } from './dtos/paginate-consult.dto'
import { UpdateConsultDto } from './dtos/update-consult.dto'

@Controller('admin/consults')
@ApiTags('Admin Consults')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF, Role.FINANCE)
export class AdminConsultController {
  constructor(private readonly consultService: ConsultService) {}
  @Get()
  @ApiOperation({ summary: 'Get all consults' })
  async getAll(@Query() pagination: PaginateConsultDto): Promise<ResponseDto> {
    const consults = await this.consultService.getAll(pagination)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'CONSULT_FETCHED_SUCCESSFULLY',
      data: consults,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a consult by id' })
  async getById(@Param('id') id: number): Promise<ResponseDto> {
    const consult = await this.consultService.getById(id)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'CONSULT_FETCHED_SUCCESSFULLY',
      data: consult,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a consult by id' })
  async update(@Param('id') id: number, @Body() updateConsultDto: UpdateConsultDto): Promise<ResponseDto> {
    await this.consultService.update(id, updateConsultDto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'CONSULT_UPDATED_SUCCESSFULLY',
    })
  }

  @Patch(':id/is-read')
  @ApiOperation({ summary: 'Update the is_read status of a consult by id' })
  async updateIsRead(@Param('id') id: number): Promise<ResponseDto> {
    await this.consultService.updateIsRead(id)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'CONSULT_IS_READ_UPDATED_SUCCESSFULLY',
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a consult by id' })
  async delete(@Param('id') id: number): Promise<ResponseDto> {
    await this.consultService.delete(id)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'CONSULT_DELETED_SUCCESSFULLY',
    })
  }
}

@Controller('consults')
@ApiTags('User Consults')
export class UserConsultController {
  constructor(private readonly consultService: ConsultService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new consult' })
  async create(@Body() createConsultDto: CreateConsultDto): Promise<ResponseDto> {
    const consult = await this.consultService.create(createConsultDto)
    return new ResponseDto({
      statusCode: 201,
      messageCode: 'CONSULT_CREATED',
      data: consult,
    })
  }
}
