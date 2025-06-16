import { ResponseDto } from '@common/response.dto'
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { DepartmentService } from './department.service'
import { CreateDepartmentDto } from './dtos/create-department.dto'
import { UpdateDepartmentDto } from './dtos/update-department.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { PaginateDepartmentDto } from './dtos/paginate-department.dto'

@Controller('admin/departments')
@ApiTags('Admin Departments')
@ApiBearerAuth()
@Auth(Role.ADMIN)
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new department' })
  async create(@Body() createDepartmentDto: CreateDepartmentDto): Promise<ResponseDto> {
    const department = await this.departmentService.create(createDepartmentDto)
    return new ResponseDto({
      statusCode: 201,
      messageCode: 'DEPARTMENT_CREATED',
      data: department,
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get all departments' })
  async getAll(@Query() pagination: PaginateDepartmentDto): Promise<ResponseDto> {
    const departments = await this.departmentService.getAll(pagination)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'DEPARTMENT_GET_ALL',
      data: departments.data,
      meta: departments.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a department by id' })
  async getById(@Param('id') id: number): Promise<ResponseDto> {
    const department = await this.departmentService.getById(id)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'DEPARTMENT_GET_BY_ID',
      data: department,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a department' })
  async update(@Param('id') id: number, @Body() updateDepartmentDto: UpdateDepartmentDto): Promise<ResponseDto> {
    const department = await this.departmentService.update(id, updateDepartmentDto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'DEPARTMENT_UPDATE',
      data: department,
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a department' })
  async delete(@Param('id') id: number): Promise<ResponseDto> {
    await this.departmentService.delete(id)
    return new ResponseDto({
      statusCode: 204,
      messageCode: 'DEPARTMENT_DELETE',
    })
  }
}
