import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { CreateSubjectDto } from './dtos/create-subject.dto'
import { PaginateSubjectDto } from './dtos/paginate-subject.dto'
import { SubjectsService } from './subjects.service'
import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { UpdateSubjectDto } from './dtos/update-subject.dto'

@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  @Auth(Role.ADMIN)
  async create(@Body() createSubjectDto: CreateSubjectDto): Promise<ResponseDto> {
    const subject = await this.subjectsService.create(createSubjectDto)
    return new ResponseDto({
      messageCode: 'SUBJECT_CREATED',
      statusCode: 201,
      data: subject,
    })
  }

  @Get()
  @Auth(Role.ADMIN)
  async getAll(@Query() pagination: PaginateSubjectDto): Promise<ResponseDto> {
    const subjects = await this.subjectsService.getAll(pagination)
    return new ResponseDto({
      messageCode: 'SUBJECTS_FETCHED',
      statusCode: 200,
      data: subjects.data,
      meta: subjects.meta,
    })
  }

  @Get(':id')
  @Auth(Role.ADMIN)
  async getById(@Param('id') id: string): Promise<ResponseDto> {
    const subject = await this.subjectsService.getById(Number(id))
    return new ResponseDto({
      messageCode: 'SUBJECT_FETCHED',
      statusCode: 200,
      data: subject,
    })
  }

  @Put(':id')
  @Auth(Role.ADMIN)
  async update(@Param('id') id: string, @Body() updateSubjectDto: UpdateSubjectDto): Promise<ResponseDto> {
    await this.subjectsService.update(Number(id), updateSubjectDto)
    return new ResponseDto({
      messageCode: 'SUBJECT_UPDATED',
      statusCode: 200,
    })
  }

  @Delete(':id')
  @Auth(Role.ADMIN)
  async delete(@Param('id') id: string): Promise<ResponseDto> {
    await this.subjectsService.delete(Number(id))
    return new ResponseDto({
      messageCode: 'SUBJECT_DELETED',
      statusCode: 200,
    })
  }
}
