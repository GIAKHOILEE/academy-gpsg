import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Enrollments } from '@modules/enrollments/enrollments.entity'
import { RevenueStatisticsDto } from './dtos/dashboard.dto'
import { ClassStatus, PaymentStatus } from '@enums/class.enum'
import { StatusEnrollment } from '@enums/class.enum'
import { Voucher } from '@modules/voucher/voucher.entity'
import { Classes } from '@modules/class/class.entity'
import { Student } from '@modules/students/students.entity'
import { Teacher } from '@modules/teachers/teachers.entity'
@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Enrollments)
    private readonly enrollmentsRepository: Repository<Enrollments>,
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(Classes)
    private readonly classRepository: Repository<Classes>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
  ) {}

  async revenueStatistics(revenueStatisticsDto: RevenueStatisticsDto): Promise<{
    totalRevenue: number // Tổng doanh thu
    paidRevenue: number // Đã thanh toán
    unpaidRevenue: number // Chưa thanh toán
    totalEnrollment: number // Tổng số đơn
  }> {
    const { start_date, end_date } = revenueStatisticsDto

    const queryBuilder = this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      // Tổng doanh thu (sau giảm giá)
      .select('SUM(enrollment.total_fee - enrollment.discount)', 'total_revenue')

      // Đã thanh toán (prepaid)
      .addSelect(
        `
        SUM(
          CASE
            WHEN enrollment.payment_status = :paid THEN enrollment.total_fee - enrollment.discount
            WHEN enrollment.status = :debt AND enrollment.prepaid > 0 THEN enrollment.prepaid
            ELSE 0
          END
        )
      `,
        'paid_revenue',
      )

      // Chưa thanh toán
      .addSelect(
        `
        SUM(
          CASE
            WHEN enrollment.payment_status = :unpaid AND enrollment.status = :debt THEN enrollment.debt
            WHEN enrollment.payment_status = :unpaid AND enrollment.status <> :debt THEN (enrollment.total_fee - enrollment.discount)
            ELSE 0
          END
        )
      `,
        'unpaid_revenue',
      )

      // Tổng số đơn
      .addSelect('COUNT(enrollment.id)', 'total_enrollment')
      .setParameters({
        paid: PaymentStatus.PAID,
        unpaid: PaymentStatus.UNPAID,
        debt: StatusEnrollment.DEBT,
      })

    if (start_date) {
      queryBuilder.andWhere('enrollment.registration_date >= :start_date', { start_date })
    }

    if (end_date) {
      queryBuilder.andWhere('enrollment.registration_date <= :end_date', { end_date })
    }

    const result = await queryBuilder.getRawOne()

    return {
      totalRevenue: Number(result.total_revenue) || 0,
      paidRevenue: Number(result.paid_revenue) || 0,
      unpaidRevenue: Number(result.unpaid_revenue) || 0,
      totalEnrollment: Number(result.total_enrollment) || 0,
    }
  }

  async voucherStatistics(): Promise<{
    totalVoucher: number
    totalUsedVoucher: number
    totalActualDiscount: number
  }> {
    const query = this.voucherRepository.createQueryBuilder('voucher')

    const totalVoucher = await query.getCount()

    const usedQuery = query.clone().andWhere('voucher.is_used = :used', { used: true })

    const totalUsedVoucher = await usedQuery.getCount()

    const discountQuery = query.clone().andWhere('voucher.is_used = :used', { used: true })

    const { totalActualDiscount } = await discountQuery.select('COALESCE(SUM(voucher.actual_discount), 0)', 'totalActualDiscount').getRawOne()

    return {
      totalVoucher: Number(totalVoucher),
      totalUsedVoucher: Number(totalUsedVoucher),
      totalActualDiscount: Number(totalActualDiscount),
    }
  }

  // thống kê lớp học và theo từng status
  async classStatistics(): Promise<{
    totalClass: number
    totalClassEnrolling: number
    totalClassEndEnrolling: number
    totalClassHasBegun: number
    totalClassEnded: number
  }> {
    const result = await this.classRepository
      .createQueryBuilder('class')
      .select('COUNT(*)', 'totalClass')
      .addSelect(`SUM(CASE WHEN class.status = :enrolling THEN 1 ELSE 0 END)`, 'totalClassEnrolling')
      .addSelect(`SUM(CASE WHEN class.status = :end_enrolling THEN 1 ELSE 0 END)`, 'totalClassEndEnrolling')
      .addSelect(`SUM(CASE WHEN class.status = :has_begun THEN 1 ELSE 0 END)`, 'totalClassHasBegun')
      .addSelect(`SUM(CASE WHEN class.status = :ended THEN 1 ELSE 0 END)`, 'totalClassEnded')
      .setParameters({
        enrolling: ClassStatus.ENROLLING,
        end_enrolling: ClassStatus.END_ENROLLING,
        has_begun: ClassStatus.HAS_BEGUN,
        ended: ClassStatus.END_CLASS,
      })
      .getRawOne<{
        totalClass: string
        totalClassEnrolling: string
        totalClassEndEnrolling: string
        totalClassHasBegun: string
        totalClassEnded: string
      }>()

    return {
      totalClass: Number(result.totalClass),
      totalClassEnrolling: Number(result.totalClassEnrolling),
      totalClassEndEnrolling: Number(result.totalClassEndEnrolling),
      totalClassHasBegun: Number(result.totalClassHasBegun),
      totalClassEnded: Number(result.totalClassEnded),
    }
  }

  // thống kê student đã tốt nghiệp
  async graduateStudentStatistics(): Promise<{
    totalStudent: number
    totalGraduateStudent: number
    totalNotGraduateStudent: number
  }> {
    const result = await this.studentRepository
      .createQueryBuilder('student')
      .select('COUNT(*)', 'totalStudent')
      .addSelect(`SUM(CASE WHEN student.graduate = true THEN 1 ELSE 0 END)`, 'totalGraduateStudent')
      .addSelect(`SUM(CASE WHEN student.graduate = false THEN 1 ELSE 0 END)`, 'totalNotGraduateStudent')
      .getRawOne<{
        totalStudent: string
        totalGraduateStudent: string
        totalNotGraduateStudent: string
      }>()

    return {
      totalStudent: Number(result.totalStudent),
      totalGraduateStudent: Number(result.totalGraduateStudent),
      totalNotGraduateStudent: Number(result.totalNotGraduateStudent),
    }
  }

  // thống kê teacher nội trú/ngoại trú, có chứng chỉ/ không có chứng chỉ
  async teacherStatistics(): Promise<{
    totalTeacher: number
    totalBoarding: number
    totalNotBoarding: number
    totalHasProfessionalCertificate: number
    totalNoProfessionalCertificate: number
    totalHasTeacherCertificate: number
    totalNoTeacherCertificate: number
  }> {
    const result = await this.teacherRepository
      .createQueryBuilder('teacher')
      .select('COUNT(*)', 'totalTeacher')
      .addSelect(`SUM(CASE WHEN teacher.boarding = true THEN 1 ELSE 0 END)`, 'totalBoarding')
      .addSelect(`SUM(CASE WHEN teacher.boarding = false OR teacher.boarding IS NULL THEN 1 ELSE 0 END)`, 'totalNotBoarding')
      .addSelect(`SUM(CASE WHEN teacher.professional_certificate IS NOT NULL THEN 1 ELSE 0 END)`, 'totalHasProfessionalCertificate')
      .addSelect(`SUM(CASE WHEN teacher.professional_certificate IS NULL THEN 1 ELSE 0 END)`, 'totalNoProfessionalCertificate')
      .addSelect(`SUM(CASE WHEN teacher.teacher_certificate IS NOT NULL THEN 1 ELSE 0 END)`, 'totalHasTeacherCertificate')
      .addSelect(`SUM(CASE WHEN teacher.teacher_certificate IS NULL THEN 1 ELSE 0 END)`, 'totalNoTeacherCertificate')
      .getRawOne<{
        totalTeacher: string
        totalBoarding: string
        totalNotBoarding: string
        totalHasProfessionalCertificate: string
        totalNoProfessionalCertificate: string
        totalHasTeacherCertificate: string
        totalNoTeacherCertificate: string
      }>()

    return {
      totalTeacher: Number(result.totalTeacher),
      totalBoarding: Number(result.totalBoarding),
      totalNotBoarding: Number(result.totalNotBoarding),
      totalHasProfessionalCertificate: Number(result.totalHasProfessionalCertificate),
      totalNoProfessionalCertificate: Number(result.totalNoProfessionalCertificate),
      totalHasTeacherCertificate: Number(result.totalHasTeacherCertificate),
      totalNoTeacherCertificate: Number(result.totalNoTeacherCertificate),
    }
  }
}
