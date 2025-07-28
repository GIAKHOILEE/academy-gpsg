import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common'
import { VoucherService } from './voucher.service'
import { CreateVoucherDto } from './dtos/create-voucher.dto'
import { UpdateVoucherDto } from './dtos/update-voucher.dto'
import { ResponseDto } from '@common/response.dto'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { Role } from '@enums/role.enum'
import { Auth } from '@decorators/auth.decorator'
import { PaginateVoucherDto } from './dtos/paginate-voucher.dto'

@Controller('admin/vouchers')
@ApiTags('Admin Vouchers')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
export class AminVoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo voucher' })
  async createVoucher(@Body() createVoucherDto: CreateVoucherDto): Promise<ResponseDto> {
    const voucher = await this.voucherService.createVoucher(createVoucherDto)
    return {
      statusCode: 201,
      messageCode: 'VOUCHER_CREATE_SUCCESS',
      data: voucher,
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật voucher' })
  @ApiParam({ name: 'id', type: Number })
  async updateVoucher(@Param('id') id: number, @Body() updateVoucherDto: UpdateVoucherDto): Promise<ResponseDto> {
    await this.voucherService.updateVoucher(id, updateVoucherDto)
    return {
      statusCode: 200,
      messageCode: 'VOUCHER_UPDATE_SUCCESS',
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa voucher' })
  @ApiParam({ name: 'id', type: Number })
  async deleteVoucher(@Param('id') id: number): Promise<ResponseDto> {
    await this.voucherService.deleteVoucher(id)
    return {
      statusCode: 200,
      messageCode: 'VOUCHER_DELETE_SUCCESS',
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy voucher theo id' })
  @ApiParam({ name: 'id', type: Number })
  async getVoucherById(@Param('id') id: number): Promise<ResponseDto> {
    const voucher = await this.voucherService.getVoucherById(id)
    return {
      statusCode: 200,
      messageCode: 'VOUCHER_GET_SUCCESS',
      data: voucher,
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách voucher' })
  async getVouchers(@Query() paginateVoucherDto: PaginateVoucherDto): Promise<ResponseDto> {
    const { data, meta } = await this.voucherService.getAllVouchers(paginateVoucherDto)
    return {
      statusCode: 200,
      messageCode: 'VOUCHER_GET_SUCCESS',
      data: data,
      meta: meta,
    }
  }
}

@Controller('vouchers')
@ApiTags('Vouchers')
export class VoucherController {
  constructor(private readonly voucherService: VoucherService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Lấy voucher theo id' })
  @ApiParam({ name: 'id', type: Number })
  async getVoucherById(@Param('id') id: number): Promise<ResponseDto> {
    const voucher = await this.voucherService.getVoucherById(id)
    return {
      statusCode: 200,
      messageCode: 'VOUCHER_GET_SUCCESS',
      data: voucher,
    }
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách voucher' })
  async getVouchers(@Query() paginateVoucherDto: PaginateVoucherDto): Promise<ResponseDto> {
    const { data, meta } = await this.voucherService.getAllVouchers(paginateVoucherDto)
    return {
      statusCode: 200,
      messageCode: 'VOUCHER_GET_SUCCESS',
      data: data,
      meta: meta,
    }
  }
}
