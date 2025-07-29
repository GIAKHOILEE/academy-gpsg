import { paginate, PaginationMeta } from '@common/pagination'
import { arrayToObject, throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { CreateVoucherDto } from './dtos/create-voucher.dto'
import { PaginateVoucherDto } from './dtos/paginate-voucher.dto'
import { UpdateVoucherDto } from './dtos/update-voucher.dto'
import { Voucher } from './voucher.entity'
import { IVoucher } from './voucher.interface'
import { Student } from '@modules/students/students.entity'
import { IStudent } from '@modules/students/students.interface'
@Injectable()
export class VoucherService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
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
      name: savedVoucher.name,
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

  async getVoucherByCode(code: string): Promise<IVoucher> {
    const voucher = await this.voucherRepository.findOne({ where: { code } })
    if (!voucher) {
      throwAppException('VOUCHER_NOT_FOUND', ErrorCode.VOUCHER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    let student: IStudent | null = null
    if (voucher.student_id) {
      student = await this.studentRepository
        .createQueryBuilder('student')
        .select(['student.id', 'user.full_name', 'user.saint_name'])
        .leftJoin('student.user', 'user')
        .where('student.id = :id', { id: voucher.student_id })
        .getRawOne()
    }

    const formattedVoucher: IVoucher = {
      id: voucher.id,
      code: voucher.code,
      name: voucher.name,
      type: voucher.type,
      discount: voucher.discount,
      student_id: voucher?.student_id,
      full_name: student?.full_name,
      saint_name: student?.saint_name,
      enrollment_id: voucher?.enrollment_id,
      actual_discount: voucher?.actual_discount,
      is_used: voucher?.is_used,
      use_at: voucher?.use_at,
    }
    return formattedVoucher
  }

  async getVoucherById(id: number): Promise<IVoucher> {
    const voucher = await this.voucherRepository.findOne({ where: { id } })
    if (!voucher) {
      throwAppException('VOUCHER_NOT_FOUND', ErrorCode.VOUCHER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    let student: IStudent | null = null
    if (voucher.student_id) {
      student = await this.studentRepository
        .createQueryBuilder('student')
        .select([
          'student.id',
          'user.full_name',
          'user.saint_name',
          'user.avatar',
          'user.birth_date',
          'user.gender',
          'user.phone_number',
          'user.address',
        ])
        .leftJoin('student.user', 'user')
        .where('student.id = :id', { id: voucher.student_id })
        .getRawOne()
    }
    console.log(student)

    const formattedVoucher: IVoucher = {
      id: voucher.id,
      code: voucher.code,
      name: voucher.name,
      type: voucher.type,
      discount: voucher.discount,
      student_id: voucher?.student_id,
      full_name: student?.full_name,
      saint_name: student?.saint_name,
      enrollment_id: voucher?.enrollment_id,
      actual_discount: voucher?.actual_discount,
      is_used: voucher?.is_used,
      use_at: voucher?.use_at,
      student: student || null,
    }
    return formattedVoucher
  }

  async getAllVouchers(paginateVoucherDto: PaginateVoucherDto): Promise<{ data: IVoucher[]; meta: PaginationMeta }> {
    const query = this.voucherRepository.createQueryBuilder('voucher')

    const { data, meta } = await paginate(query, paginateVoucherDto)
    const studentIds = data.map(voucher => voucher.student_id)
    let students: IStudent[] = []
    if (studentIds.length > 0) {
      students = await this.studentRepository
        .createQueryBuilder('student')
        .select(['student.id', 'user.full_name', 'user.saint_name'])
        .leftJoin('student.user', 'user')
        .where('student.id IN (:...studentIds)', { studentIds })
        .getMany()
    }

    const arraytoObjectStudent = arrayToObject(students, 'id')

    const formattedData: IVoucher[] = data.map((voucher: Voucher) => ({
      id: voucher.id,
      code: voucher.code,
      name: voucher.name,
      type: voucher.type,
      discount: voucher.discount,
      student_id: voucher?.student_id,
      full_name: arraytoObjectStudent[voucher.student_id]?.user?.full_name,
      saint_name: arraytoObjectStudent[voucher.student_id]?.user?.saint_name,
      enrollment_id: voucher?.enrollment_id,
      actual_discount: voucher?.actual_discount,
      is_used: voucher?.is_used,
      use_at: voucher?.use_at,
    }))

    return { data: formattedData, meta }
  }
}
