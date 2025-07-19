import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { ScholasticService } from './scholastic.service'
import { CreateScholasticDto } from './dtos/create-scholastic.dto'
import { ResponseDto } from '@common/response.dto'
import { UpdateScholasticDto } from './dtos/update-scholastic.dto'
import { PaginateScholasticDto } from './dtos/paginate-scholastic.dto'

@ApiTags('Admin Scholastic')
@Controller('admin/scholastic')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
export class AdminScholasticController {
  constructor(private readonly scholasticService: ScholasticService) {}

  @Post()
  @ApiOperation({ summary: 'Create a scholastic' })
  async createScholastic(@Body() createScholasticDto: CreateScholasticDto): Promise<ResponseDto> {
    const scholastic = await this.scholasticService.create(createScholasticDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'SCHOLASTIC_CREATED_SUCCESSFULLY',
      data: scholastic,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a scholastic' })
  @ApiParam({ name: 'id', type: Number, description: 'The id of the scholastic to update' })
  async updateScholastic(@Param('id') id: number, @Body() updateScholasticDto: UpdateScholasticDto): Promise<ResponseDto> {
    await this.scholasticService.update(id, updateScholasticDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'SCHOLASTIC_UPDATED_SUCCESSFULLY',
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a scholastic' })
  @ApiParam({ name: 'id', type: Number, description: 'The id of the scholastic to delete' })
  async deleteScholastic(@Param('id') id: number): Promise<ResponseDto> {
    await this.scholasticService.delete(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'SCHOLASTIC_DELETED_SUCCESSFULLY',
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get all scholastics' })
  async getScholastics(@Query() paginateScholasticDto: PaginateScholasticDto): Promise<ResponseDto> {
    const scholastics = await this.scholasticService.findAll(paginateScholasticDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'SCHOLASTICS_FETCHED_SUCCESSFULLY',
      data: scholastics.data,
      meta: scholastics.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a scholastic by id' })
  @ApiParam({ name: 'id', type: Number, description: 'The id of the scholastic to get' })
  async getScholasticById(@Param('id') id: number): Promise<ResponseDto> {
    const scholastic = await this.scholasticService.findOne(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'SCHOLASTIC_FETCHED_SUCCESSFULLY',
      data: scholastic,
    })
  }
}
