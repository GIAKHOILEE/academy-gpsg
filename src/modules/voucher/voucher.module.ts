import { Module } from '@nestjs/common'
import { VoucherService } from './voucher.service'
import { AminVoucherController, VoucherController } from './voucher.controller'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Voucher } from './voucher.entity'
import { Student } from '@modules/students/students.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Voucher, Student])],
  controllers: [AminVoucherController, VoucherController],
  providers: [VoucherService],
})
export class VoucherModule {}
