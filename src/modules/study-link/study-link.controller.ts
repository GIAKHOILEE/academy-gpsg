import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { CreateStudyLinkDto } from './dtos/create-study-link.dto'
import { PaginateStudyLinkDto } from './dtos/paginate-study-link.dto'
import { UpdateStudyLinkDto } from './dtos/update-study-link.dto'
import { StudyLinkService } from './study-link.service'
/*===============================================
  ======================ADMIN=====================
=================================================*/
@Controller('admin/study-link')
@ApiBearerAuth()
@Auth(Role.ADMIN)
@ApiTags('Admin study link')
export class StudyLinkController {
  constructor(private readonly studyLinkService: StudyLinkService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new study link' })
  async create(@Body() createStudyLinkDto: CreateStudyLinkDto): Promise<ResponseDto> {
    const studyLink = await this.studyLinkService.createStudyLink(createStudyLinkDto)
    return new ResponseDto({
      statusCode: 201,
      messageCode: 'CREATE_STUDY_LINK_SUCCESS',
      data: studyLink,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get all study links' })
  async getAllStudyLinks(@Query() query: PaginateStudyLinkDto): Promise<ResponseDto> {
    const studyLinks = await this.studyLinkService.getManyStudyLink(query)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_ALL_STUDY_LINKS_SUCCESS',
      data: studyLinks.data,
      meta: studyLinks.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a study link by id' })
  @ApiParam({ name: 'id', type: Number, description: 'Study link id' })
  async getStudyLinkById(@Param('id') id: number): Promise<ResponseDto> {
    const studyLink = await this.studyLinkService.getStudyLinkById(id)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_STUDY_LINK_BY_ID_SUCCESS',
      data: studyLink,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a study link by id' })
  @ApiParam({ name: 'id', type: Number, description: 'Study link id' })
  async updateStudyLinkById(@Param('id') id: number, @Body() updateStudyLinkDto: UpdateStudyLinkDto): Promise<ResponseDto> {
    await this.studyLinkService.updateStudyLink(id, updateStudyLinkDto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_STUDY_LINK_SUCCESS',
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a study link by id' })
  @ApiParam({ name: 'id', type: Number, description: 'Study link id' })
  async deleteStudyLinkById(@Param('id') id: number): Promise<ResponseDto> {
    await this.studyLinkService.deleteStudyLink(id)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'DELETE_STUDY_LINK_SUCCESS',
    })
  }
}

/*===============================================
  ======================USER=====================
=================================================*/
@Controller('study-link')
@ApiTags('User study link')
export class StudyLinkControllerUser {
  constructor(private readonly studyLinkService: StudyLinkService) {}

  @Get()
  @ApiOperation({ summary: 'Get all study links' })
  async getAllStudyLinks(@Query() query: PaginateStudyLinkDto): Promise<ResponseDto> {
    const studyLinks = await this.studyLinkService.getManyStudyLink(query)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_ALL_STUDY_LINKS_SUCCESS',
      data: studyLinks.data,
      meta: studyLinks.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a study link by id' })
  @ApiParam({ name: 'id', type: Number, description: 'Study link id' })
  async getStudyLinkById(@Param('id') id: number): Promise<ResponseDto> {
    const studyLink = await this.studyLinkService.getStudyLinkById(id)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'GET_STUDY_LINK_BY_ID_SUCCESS',
      data: studyLink,
    })
  }
}
