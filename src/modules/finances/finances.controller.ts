import { Body, Controller, Delete, Get, HttpStatus, Param, Post, Put, Query } from '@nestjs/common'
import { CreateFinancesDto } from './dtos/create-finances.dto'
import { FinancesService } from './finances.service'
import { UpdateFinancesDto } from './dtos/update-finances.dto'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { ResponseDto } from '@common/response.dto'
import { PaginateFinancesDto } from './dtos/paginate-finances.dto'

@ApiTags('Admin Finances')
@Controller('admin/finances')
@Auth(Role.ADMIN, Role.STAFF)
@ApiBearerAuth()
export class AdminFinancesController {
  constructor(private readonly financesService: FinancesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a finance' })
  async createFinances(@Body() createFinancesDto: CreateFinancesDto): Promise<ResponseDto> {
    const finance = await this.financesService.createFinances(createFinancesDto)
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'FINANCE_CREATED_SUCCESSFULLY',
      data: finance,
    })
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a finance' })
  async updateFinances(@Param('id') id: number, @Body() updateFinancesDto: UpdateFinancesDto): Promise<ResponseDto> {
    await this.financesService.updateFinances(id, updateFinancesDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'FINANCE_UPDATED_SUCCESSFULLY',
    })
  }

  @Get()
  @ApiOperation({ summary: 'Get all finances' })
  async getFinances(@Query() paginateDto: PaginateFinancesDto): Promise<ResponseDto> {
    const finances = await this.financesService.getFinances(paginateDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'FINANCES_FETCHED_SUCCESSFULLY',
      data: finances.data,
      meta: {
        ...finances.meta,
        total_amount_received: finances.total_amount_received,
        total_amount_spent: finances.total_amount_spent,
        total_total_amount: finances.total_total_amount,
      },
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a finance' })
  async getFinancesById(@Param('id') id: number): Promise<ResponseDto> {
    const finance = await this.financesService.getFinancesById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'FINANCE_FETCHED_SUCCESSFULLY',
      data: finance,
    })
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a finance' })
  async deleteFinances(@Param('id') id: number): Promise<ResponseDto> {
    await this.financesService.deleteFinances(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'FINANCE_DELETED_SUCCESSFULLY',
    })
  }
}
