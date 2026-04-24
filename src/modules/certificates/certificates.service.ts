import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Certificates } from './certificates.entity'
import { Repository } from 'typeorm'
import { CreateCertificatesDto } from './dtos/create-certificates.dto'
import { Student } from '@modules/students/students.entity'
import { UpdateCertificatesDto } from './dtos/update-certificates.dto'
import { ErrorCode } from '@enums/error-codes.enum'
import { formatStringToDate, throwAppException } from '@common/utils'
import { PaginateCertificatesDto } from './dtos/paginate-certificates.dto'

@Injectable()
export class CertificatesService {
  constructor(
    @InjectRepository(Certificates)
    private readonly certificatesRepository: Repository<Certificates>,

    @InjectRepository(Student)
    private readonly studentsRepository: Repository<Student>,
  ) {}

  async create(createCertificatesDto: CreateCertificatesDto): Promise<Certificates> {
    const { student_id, ...rest } = createCertificatesDto
    const student = await this.studentsRepository.findOne({ where: { id: student_id } })
    if (!student) {
      throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    const certificates = this.certificatesRepository.create(rest)
    certificates.student = student
    return this.certificatesRepository.save(certificates)
  }

  async findAll(dto: PaginateCertificatesDto): Promise<any> {
    const { full_name, birth_date } = dto
    const dateObj = formatStringToDate(birth_date)
    const birthDateQuery = dateObj
      ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
      : birth_date

    const queryBuilder = this.certificatesRepository
      .createQueryBuilder('certificates')
      .leftJoinAndSelect('certificates.student', 'student')
      .leftJoinAndSelect('student.user', 'user')
      .where('user.full_name = :full_name', { full_name })
      .andWhere('user.birth_date = :birth_date', { birth_date: birthDateQuery })

    const data = await queryBuilder.getMany()

    const formatData = data.map((item: Certificates) => {
      return {
        id: item.id,
        code: item.code,
        image_url: item.image_url,
        student_id: item.student_id,
        student: {
          id: item.student.id,
          full_name: item.student.user.full_name,
          birth_date: item.student.user.birth_date,
        },
      }
    })

    return formatData
  }

  async findOne(id: number): Promise<Certificates> {
    const certificates = await this.certificatesRepository.findOne({ where: { id } })
    if (!certificates) {
      throwAppException('CERTIFICATES_NOT_FOUND', ErrorCode.CERTIFICATES_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    return certificates
  }

  async update(id: number, updateCertificatesDto: UpdateCertificatesDto): Promise<Certificates> {
    const certificates = await this.findOne(id)
    if (!certificates) {
      throwAppException('CERTIFICATES_NOT_FOUND', ErrorCode.CERTIFICATES_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    const updatedCertificates = this.certificatesRepository.merge(certificates, updateCertificatesDto)
    return this.certificatesRepository.save(updatedCertificates)
  }

  async remove(id: number): Promise<void> {
    const certificates = await this.findOne(id)
    if (!certificates) {
      throwAppException('CERTIFICATES_NOT_FOUND', ErrorCode.CERTIFICATES_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    await this.certificatesRepository.remove(certificates)
  }
}
