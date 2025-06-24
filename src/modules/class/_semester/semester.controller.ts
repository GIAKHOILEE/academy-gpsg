import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Query } from '@nestjs/common'
import { SemesterService } from './semester.service'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { ResponseDto } from '@common/response.dto'
import { CreateSemesterDto } from './dtos/create-semester.dto'
import { UpdateSemesterDto } from './dtos/update-semester.dto'
import { PaginateSemesterDto } from './dtos/paginate-semester.dto'

@ApiTags('Admin Semester')
@Controller('admin/semester')
@ApiBearerAuth()
@Auth(Role.ADMIN)
export class AdminSemesterController {
  constructor(private readonly semesterService: SemesterService) {}

  @Post()
  @ApiOperation({ summary: 'Create a semester' })
  async createSemester(@Body() createSemesterDto: CreateSemesterDto): Promise<ResponseDto> {
    const semester = await this.semesterService.create(createSemesterDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'SEMESTER_CREATED_SUCCESSFULLY',
      data: semester,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a semester' })
  @ApiParam({ name: 'id', type: Number, description: 'The id of the semester to update' })
  async updateSemester(@Param('id') id: number, @Body() updateSemesterDto: UpdateSemesterDto): Promise<ResponseDto> {
    await this.semesterService.update(id, updateSemesterDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'SEMESTER_UPDATED_SUCCESSFULLY',
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a semester' })
  @ApiParam({ name: 'id', type: Number, description: 'The id of the semester to delete' })
  async deleteSemester(@Param('id') id: number): Promise<ResponseDto> {
    await this.semesterService.delete(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'SEMESTER_DELETED_SUCCESSFULLY',
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get all semesters' })
  async getSemesters(@Query() paginateSemesterDto: PaginateSemesterDto): Promise<ResponseDto> {
    const semesters = await this.semesterService.findAll(paginateSemesterDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'SEMESTERS_FETCHED_SUCCESSFULLY',
      data: semesters.data,
      meta: semesters.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a semester by id' })
  @ApiParam({ name: 'id', type: Number, description: 'The id of the semester to get' })
  async getSemesterById(@Param('id') id: number): Promise<ResponseDto> {
    const semester = await this.semesterService.findOne(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'SEMESTER_FETCHED_SUCCESSFULLY',
      data: semester,
    })
  }
}
