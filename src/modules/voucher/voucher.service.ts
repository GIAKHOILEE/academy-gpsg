import { paginate, PaginationMeta } from '@common/pagination'
import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CreateVoucherDto } from './dtos/create-voucher.dto'
import { PaginateVoucherDto } from './dtos/paginate-voucher.dto'
import { UpdateVoucherDto } from './dtos/update-voucher.dto'
import { Voucher } from './voucher.entity'
import { IVoucher } from './voucher.interface'
@Injectable()
export class VoucherService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
  ) {}

  async createVoucher(createVoucherDto: CreateVoucherDto): Promise<IVoucher> {
    const codeExists = await this.voucherRepository.findOne({
      where: { code: createVoucherDto.code },
    })
    if (codeExists) {
      throwAppException('VOUCHER_CODE_ALREADY_EXISTS', ErrorCode.VOUCHER_CODE_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
    }
    const voucher = this.voucherRepository.create(createVoucherDto)
    const savedVoucher = await this.voucherRepository.save(voucher)
    const formattedVoucher: IVoucher = {
      id: savedVoucher.id,
      code: savedVoucher.code,
      type: savedVoucher.type,
      discount: savedVoucher.discount,
    }
    return formattedVoucher
  }

  async updateVoucher(id: number, updateVoucherDto: UpdateVoucherDto): Promise<void> {
    const voucher = await this.voucherRepository.findOne({ where: { id } })
    if (!voucher) {
      throwAppException('VOUCHER_NOT_FOUND', ErrorCode.VOUCHER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    if (updateVoucherDto.code) {
      const codeExists = await this.voucherRepository.findOne({ where: { code: updateVoucherDto.code } })
      if (codeExists) {
        throwAppException('VOUCHER_CODE_ALREADY_EXISTS', ErrorCode.VOUCHER_CODE_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
      }
    }
    await this.voucherRepository.update(id, { ...updateVoucherDto })
  }

  async deleteVoucher(id: number): Promise<void> {
    const voucher = await this.voucherRepository.findOne({ where: { id } })
    if (!voucher) {
      throwAppException('VOUCHER_NOT_FOUND', ErrorCode.VOUCHER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    await this.voucherRepository.delete(id)
  }

  async getVoucherById(id: number): Promise<IVoucher> {
    const voucher = await this.voucherRepository.findOne({ where: { id } })
    if (!voucher) {
      throwAppException('VOUCHER_NOT_FOUND', ErrorCode.VOUCHER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const formattedVoucher: IVoucher = {
      id: voucher.id,
      code: voucher.code,
      type: voucher.type,
      discount: voucher.discount,
    }
    return formattedVoucher
  }

  async getAllVouchers(paginateVoucherDto: PaginateVoucherDto): Promise<{ data: IVoucher[]; meta: PaginationMeta }> {
    const query = this.voucherRepository.createQueryBuilder('voucher')

    const { data, meta } = await paginate(query, paginateVoucherDto)

    const formattedData: IVoucher[] = data.map((voucher: Voucher) => ({
      id: voucher.id,
      code: voucher.code,
      type: voucher.type,
      discount: voucher.discount,
    }))

    return { data: formattedData, meta }
  }
}
