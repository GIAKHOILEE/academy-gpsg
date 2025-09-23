import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { Enrollments } from '@modules/enrollments/enrollments.entity'
import { RevenueStatisticsDto, SemesterRevenueDto } from './dtos/dashboard.dto'
import { ClassStatus, PaymentStatus } from '@enums/class.enum'
import { StatusEnrollment } from '@enums/class.enum'
import { Voucher } from '@modules/voucher/voucher.entity'
import { Classes } from '@modules/class/class.entity'
import { Student } from '@modules/students/students.entity'
import { Teacher } from '@modules/teachers/teachers.entity'
import { SemesterRevenueSummary } from './dashboard.interface'
import { arrayToObject } from '@common/utils'
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
    private readonly dataSource: DataSource,
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

  async semesterRevenue(semesterRevenueDto: SemesterRevenueDto): Promise<SemesterRevenueSummary> {
    const { semester_id, scholastic_id, department_id } = semesterRevenueDto

    // 1. Build conditions động
    let conditions = `e.status = ${StatusEnrollment.DONE}`
    const params: any[] = []

    if (semester_id) {
      conditions += ` AND c.semester_id = ${semester_id}`
    }
    if (scholastic_id) {
      conditions += ` AND c.scholastic_id = ${scholastic_id}`
    }
    if (department_id) {
      conditions += ` AND s.department_id = ${department_id}`
    }

    // 2. Query: enrollment expand -> mỗi class trong enrollment
    const classEnrollmentSql = `
      SELECT
        e.id AS enrollment_id,
        ec.value AS class_id,
        c.subject_id,
        s.department_id,
        c.price,
        1 AS student_count,
        c.price AS class_revenue
      FROM enrollments e
      CROSS JOIN JSON_TABLE(e.class_ids, '$[*]' COLUMNS(value INT PATH '$')) ec
      JOIN classes c ON c.id = ec.value
      JOIN subjects s ON s.id = c.subject_id
      WHERE ${conditions}
    `
    // const classEnrollment = await this.dataSource.query(classEnrollmentSql, params)

    // 3. Query: tổng revenue / tổng class per enrollment
    const enrollmentTotalsSql = `
      SELECT
        ce.enrollment_id,
        SUM(ce.class_revenue) AS total_revenue,
        COUNT(*) AS total_classes
      FROM (${classEnrollmentSql}) ce
      GROUP BY ce.enrollment_id
    `
    // const enrollmentTotals = await this.dataSource.query(enrollmentTotalsSql, params)
    // const totalsMap = arrayToObject(enrollmentTotals, 'enrollment_id')

    // 4. Query: join voucher + phân bổ discount
    const voucherAllocationSql = `
      SELECT
        ce.enrollment_id,
        ce.class_id,
        ce.department_id,
        ce.subject_id,
        ce.price,
        ce.student_count,
        ce.class_revenue,
        e.discount AS enrollment_discount,
        v.actual_discount AS voucher_discount,
        et.total_revenue,
        et.total_classes,
        CASE 
          WHEN et.total_revenue > 0 
          THEN (ce.class_revenue / et.total_revenue) * IFNULL(v.actual_discount,0)
          ELSE 0
        END AS voucher_share,
        (IFNULL(e.discount,0) / NULLIF(et.total_classes,0)) AS enrollment_share
      FROM (${classEnrollmentSql}) ce
      JOIN (${enrollmentTotalsSql}) et ON et.enrollment_id = ce.enrollment_id
      JOIN enrollments e ON e.id = ce.enrollment_id
      LEFT JOIN voucher v ON v.enrollment_id = e.id AND v.is_used = true
    `
    // const voucherAllocation = await this.dataSource.query(voucherAllocationSql, params)

    // 5. Query: tổng hợp theo department + class
    const revenueSql = `
      SELECT
        d.id AS department_id,
        d.name AS department_name,
        c.id AS class_id,
        c.name AS class_name,
        c.price AS price,
        SUM(va.student_count) AS total_students,
        SUM(va.class_revenue) AS total_revenue,
        SUM(va.voucher_share + va.enrollment_share) AS total_discount,
        SUM(va.class_revenue) - SUM(va.voucher_share + va.enrollment_share) AS total_profit,
        COUNT(DISTINCT CASE WHEN (va.voucher_share + va.enrollment_share) > 0 THEN va.enrollment_id END) AS total_student_discount       FROM (${voucherAllocationSql}) va
      JOIN classes c ON c.id = va.class_id
      JOIN subjects s ON s.id = va.subject_id
      JOIN departments d ON d.id = va.department_id
      GROUP BY d.id, d.name, c.id, c.name, c.price
      ORDER BY d.name, c.name
    `
    const rows = await this.dataSource.query(revenueSql, params)
    // 6. Mapping summary
    const summary = {
      total_students: rows.reduce((acc, r) => acc + Number(r.total_students), 0),
      total_revenue: rows.reduce((acc, r) => acc + Number(r.total_revenue), 0),
      total_discount: rows.reduce((acc, r) => acc + Number(r.total_discount), 0),
      total_profit: rows.reduce((acc, r) => acc + Number(r.total_profit), 0),
    }

    // 7. Group theo department
    const departmentsMap: Record<number, SemesterRevenueSummary['departments'][number]> = {}
    for (const r of rows) {
      if (!departmentsMap[r.department_id]) {
        departmentsMap[r.department_id] = {
          department_id: r.department_id,
          department_name: r.department_name,
          total_students: 0,
          total_revenue: 0,
          total_discount: 0,
          total_profit: 0,
          classes: [],
        }
      }
      const dep = departmentsMap[r.department_id]
      dep.total_students += Number(r.total_students)
      dep.total_revenue += Number(r.total_revenue)
      dep.total_discount += Number(r.total_discount)
      dep.total_profit += Number(r.total_profit)
      dep.classes.push({
        class_id: r.class_id,
        class_name: r.class_name,
        price: Number(r.price),
        total_students: Number(r.total_students),
        total_revenue: Number(r.total_revenue),
        total_discount: Number(r.total_discount),
        total_profit: Number(r.total_profit),
        total_student_discount: Number(r.total_student_discount),
      })
    }

    return {
      summary,
      departments: Object.values(departmentsMap),
    }
  }
}
