import { throwAppException } from '@common/utils'
import { ClassStatus, PaymentStatus, StatusEnrollment } from '@enums/class.enum'
import { ErrorCode } from '@enums/error-codes.enum'
import { TeacherSpecial } from '@enums/user.enum'
import { Classes } from '@modules/class/class.entity'
import { Enrollments } from '@modules/enrollments/enrollments.entity'
import { Student } from '@modules/students/students.entity'
import { Teacher } from '@modules/teachers/teachers.entity'
import { Voucher } from '@modules/voucher/voucher.entity'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Raw, Repository } from 'typeorm'
import { SemesterRevenueSummary } from './dashboard.interface'
import { RevenueStatisticsDto, SemesterRevenueDto, TeacherRevenueDto } from './dtos/dashboard.dto'
import { UpdateTeacherSalaryDto } from './dtos/update.dto'
import { Gender, Role } from '@enums/role.enum'
import { User } from '@modules/users/user.entity'
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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  // thống kê dân số học viên
  async studentStatistics(): Promise<any> {
    const result = await this.userRepository
      .createQueryBuilder('u')
      .select([
        // Nam
        `SUM(CASE WHEN u.gender = 1 AND u.saint_name IS NOT NULL AND u.congregation IS NULL THEN 1 ELSE 0 END) AS male_giaodan`,
        `SUM(CASE WHEN u.gender = 1 AND u.congregation IS NOT NULL THEN 1 ELSE 0 END) AS male_tusi`,
        `SUM(CASE WHEN u.gender = 1 AND u.saint_name IS NULL THEN 1 ELSE 0 END) AS male_daokhac`,

        // Nữ
        `SUM(CASE WHEN u.gender = 2 AND u.saint_name IS NOT NULL AND u.congregation IS NULL THEN 1 ELSE 0 END) AS female_giaodan`,
        `SUM(CASE WHEN u.gender = 2 AND u.congregation IS NOT NULL THEN 1 ELSE 0 END) AS female_tusi`,
        `SUM(CASE WHEN u.gender = 2 AND u.saint_name IS NULL THEN 1 ELSE 0 END) AS female_daokhac`,

        // Khác / không xác định
        `SUM(CASE WHEN (u.gender = 0 OR u.gender IS NULL) AND u.saint_name IS NOT NULL AND u.congregation IS NULL THEN 1 ELSE 0 END) AS other_giaodan`,
        `SUM(CASE WHEN (u.gender = 0 OR u.gender IS NULL) AND u.congregation IS NOT NULL THEN 1 ELSE 0 END) AS other_tusi`,
        `SUM(CASE WHEN (u.gender = 0 OR u.gender IS NULL) AND u.saint_name IS NULL THEN 1 ELSE 0 END) AS other_daokhac`,
      ])
      .where('u.role = :role', { role: Role.STUDENT })
      .getRawOne()
    const data = {
      male: {
        parishioners: +result.male_giaodan,
        friar: +result.male_tusi,
        otherReligions: +result.male_daokhac,
        total: +result.male_giaodan + +result.male_tusi + +result.male_daokhac,
      },
      female: {
        parishioners: +result.female_giaodan,
        friar: +result.female_tusi,
        otherReligions: +result.female_daokhac,
        total: +result.female_giaodan + +result.female_tusi + +result.female_daokhac,
      },
      other: {
        parishioners: +result.other_giaodan,
        friar: +result.other_tusi,
        otherReligions: +result.other_daokhac,
        total: +result.other_giaodan + +result.other_tusi + +result.other_daokhac,
      },
      total: {
        parishioners: +result.male_giaodan + +result.female_giaodan + +result.other_giaodan,
        friar: +result.male_tusi + +result.female_tusi + +result.other_tusi,
        otherReligions: +result.male_daokhac + +result.female_daokhac + +result.other_daokhac,
        total:
          +result.male_giaodan +
          +result.female_giaodan +
          +result.other_giaodan +
          +result.male_tusi +
          +result.female_tusi +
          +result.other_tusi +
          +result.male_daokhac +
          +result.female_daokhac +
          +result.other_daokhac,
      },
    }

    // tổng số lớp
    const totalClass = await this.classRepository.count()
    // tổng số giảng viên
    const totalTeacher = await this.teacherRepository.count()

    return {
      totalClass,
      totalTeacher,
      ...data,
    }
  }

  // thông kê tuổi học viên
  async studentAgeStatistics(): Promise<any> {
    const today = new Date()

    const ageGroups = [
      { label: 'Từ 1-9', min: 1, max: 9 },
      { label: 'Từ 10-19', min: 10, max: 19 },
      { label: 'Từ 20-29', min: 20, max: 29 },
      { label: 'Từ 30-39', min: 30, max: 39 },
      { label: 'Từ 40-49', min: 40, max: 49 },
      { label: 'Từ 50-59', min: 50, max: 59 },
      { label: 'Từ 60-69', min: 60, max: 69 },
      { label: 'Trên 70', min: 70, max: 200 },
    ]

    const results = []

    for (const group of ageGroups) {
      const minYear = today.getFullYear() - group.max
      const maxYear = today.getFullYear() - group.min

      const male = await this.userRepository.count({
        where: {
          role: Role.STUDENT,
          gender: Gender.MALE,
          birth_date: Raw(
            alias => `
            (
              STR_TO_DATE(${alias}, '%Y-%m-%d') BETWEEN '${minYear}-01-01' AND '${maxYear}-12-31'
              OR STR_TO_DATE(${alias}, '%d-%m-%Y') BETWEEN '${minYear}-01-01' AND '${maxYear}-12-31'
            )
          `,
          ),
        },
      })

      const female = await this.userRepository.count({
        where: {
          role: Role.STUDENT,
          gender: Gender.FEMALE,
          birth_date: Raw(
            alias => `
            (
              STR_TO_DATE(${alias}, '%Y-%m-%d') BETWEEN '${minYear}-01-01' AND '${maxYear}-12-31'
              OR STR_TO_DATE(${alias}, '%d-%m-%Y') BETWEEN '${minYear}-01-01' AND '${maxYear}-12-31'
            )
          `,
          ),
        },
      })

      const other = await this.userRepository.count({
        where: {
          role: Role.STUDENT,
          gender: Raw(alias => `(${alias} = ${Gender.OTHER} OR ${alias} IS NULL)`),
          birth_date: Raw(
            alias => `
            (
              STR_TO_DATE(${alias}, '%Y-%m-%d') BETWEEN '${minYear}-01-01' AND '${maxYear}-12-31'
              OR STR_TO_DATE(${alias}, '%d-%m-%Y') BETWEEN '${minYear}-01-01' AND '${maxYear}-12-31'
            )
          `,
          ),
        },
      })

      results.push({
        ageGroup: group.label,
        male: male,
        female: female,
        other: other,
        total: male + female + other,
      })
    }

    return results
  }

  // Tổng doanh thu
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

  private buildConditions(semester_id?: number, scholastic_id?: number, department_id?: number): string {
    let cond = `e.status = ${StatusEnrollment.DONE}`
    if (semester_id) cond += ` AND c.semester_id = ${+semester_id}`
    if (scholastic_id) cond += ` AND c.scholastic_id = ${+scholastic_id}`
    if (department_id) cond += ` AND s.department_id = ${+department_id}`
    return cond
  }

  async semesterRevenue2(semesterRevenueDto: SemesterRevenueDto): Promise<SemesterRevenueSummary> {
    const { semester_id, scholastic_id, department_id } = semesterRevenueDto

    // 1) build conditions
    const conditions = this.buildConditions(semester_id, scholastic_id, department_id)

    // 2) revenue SQL (CTE) -> trả per-class (chưa trừ lương)
    const revenueSql = `
    WITH class_enrollment AS (
      SELECT
        e.id AS enrollment_id,
        CAST(ec.class_id AS UNSIGNED) AS class_id,
        c.subject_id,
        s.department_id,
        COALESCE(c.price,0) AS price,
        1 AS student_count,
        COALESCE(c.price,0) AS class_revenue
      FROM enrollments e
      CROSS JOIN JSON_TABLE(
        e.class_ids,
        '$[*]' COLUMNS(
          class_id INT PATH '$.class_id',
          learn_type VARCHAR(50) PATH '$.learn_type'
        )
      ) ec
      JOIN classes c ON c.id = ec.class_id
      JOIN subjects s ON s.id = c.subject_id
      WHERE ${conditions}
    ),
    enrollment_totals AS (
      SELECT
        ce.enrollment_id,
        COALESCE(SUM(ce.class_revenue),0) AS total_revenue,
        COUNT(*) AS total_classes
      FROM class_enrollment ce
      GROUP BY ce.enrollment_id
    ),
    voucher_alloc AS (
      SELECT
        ce.enrollment_id,
        ce.class_id,
        ce.subject_id,
        ce.department_id,
        ce.price,
        ce.student_count,
        ce.class_revenue,
        COALESCE(e.discount,0) AS enrollment_discount,
        et.total_revenue,
        et.total_classes,
        CASE WHEN et.total_classes > 0
             THEN (COALESCE(e.discount,0) / et.total_classes)
             ELSE 0 END AS enrollment_share
      FROM class_enrollment ce
      JOIN enrollment_totals et ON et.enrollment_id = ce.enrollment_id
      JOIN enrollments e ON e.id = ce.enrollment_id
    )
    SELECT
      d.id AS department_id,
      d.name AS department_name,
      c.id AS class_id,
      c.code AS class_code,
      c.name AS class_name,
      COALESCE(c.price,0) AS price,
      COALESCE(SUM(va.student_count),0) AS total_students,
      COALESCE(SUM(va.class_revenue),0) AS total_revenue,
      COALESCE(SUM(va.enrollment_share),0) AS total_discount,
      (COALESCE(SUM(va.class_revenue),0) - COALESCE(SUM(va.enrollment_share),0)) AS total_profit,
      COALESCE(COUNT(DISTINCT CASE WHEN va.enrollment_share > 0 THEN va.enrollment_id END),0) AS total_student_discount
    FROM voucher_alloc va
    JOIN classes c ON c.id = va.class_id
    JOIN subjects s ON s.id = va.subject_id
    JOIN departments d ON d.id = va.department_id
    GROUP BY d.id, d.name, c.id, c.name, c.price
    ORDER BY d.name, c.name;
  `

    const rows: any[] = await this.dataSource.query(revenueSql)

    // Nếu không có rows -> trả đầu ra rỗng
    if (!rows || rows.length === 0) {
      return {
        summary: { total_students: 0, total_revenue: 0, total_discount: 0, total_profit: 0, total_salary: 0 },
        departments: [],
      }
    }

    // 3) Chuẩn hoá rows: convert number, tránh null
    const classRows = rows.map(r => ({
      department_id: Number(r.department_id),
      department_name: r.department_name,
      class_id: Number(r.class_id),
      class_code: r.class_code,
      class_name: r.class_name,
      price: Number(r.price || 0),
      total_students: Number(r.total_students || 0),
      total_revenue: Number(r.total_revenue - r.total_discount || 0),
      total_discount: Number(r.total_discount || 0),
      total_profit: Number(r.total_profit || 0), // before subtracting salary
      total_student_discount: Number(r.total_student_discount || 0),
    }))

    // 4) Lấy thông tin lớp + giáo viên (để tính lương). Lấy chỉ những class_id có trong classRows
    const classIds = Array.from(new Set(classRows.map(c => c.class_id)))
    const classInfoById: Record<number, any> = {}
    if (classIds.length > 0) {
      const placeholders = classIds.map(() => '?').join(',')
      const classInfoSql = `
      SELECT c.id AS class_id,
             COALESCE(c.number_periods,0) AS number_periods,
             COALESCE(c.salary,0) AS salary_per_period,
             COALESCE(c.extra_allowance,0) AS extra_allowance,
             c.teacher_id,
             t.special AS teacher_special
      FROM classes c
      LEFT JOIN teachers t ON t.id = c.teacher_id
      WHERE c.id IN (${placeholders})
    `
      const infos: any[] = await this.dataSource.query(classInfoSql, classIds)
      for (const info of infos) {
        classInfoById[Number(info.class_id)] = {
          number_periods: Number(info.number_periods || 0),
          salary_per_period: Number(info.salary_per_period || 0),
          extra_allowance: Number(info.extra_allowance || 0),
          teacher_id: info.teacher_id ? Number(info.teacher_id) : null,
          teacher_special: info.teacher_special,
        }
      }
    }

    // 5) Tính lương cho từng class dựa vào class_profit (profit before salary)
    const classSalaryMap: Record<number, number> = {}
    const deptSalaryMap: Record<number, number> = {}
    let totalSalaryAll = 0

    for (const cls of classRows) {
      const info = classInfoById[cls.class_id] || {
        number_periods: 0,
        salary_per_period: 0,
        extra_allowance: 0,
        teacher_special: null,
      }

      const number_periods = Number(info.number_periods || 0)
      const salary_per_period = Number(info.salary_per_period || 0)
      const extra_allowance = Number(info.extra_allowance || 0)
      const salaryCap = number_periods * salary_per_period

      // classProfit before salary (đã tính ở CTE)
      const classProfit = Number(cls.total_profit || 0)

      // teacher_special mapping (theo code bạn dùng trước: LV1 no special, LV2 tick green, LV3 star)
      let finalSalary = 0
      if (info.teacher_special === TeacherSpecial.LV2) {
        // tick xanh: final = cap + extra
        finalSalary = salaryCap + extra_allowance
      } else if (info.teacher_special === TeacherSpecial.LV3) {
        // star: final = classProfit + extra
        finalSalary = classProfit + extra_allowance
      } else {
        // LV1 or default: no special -> final = min(cap, classProfit) + extra
        finalSalary = (classProfit >= salaryCap ? salaryCap : classProfit) + extra_allowance
      }

      // clamp to >=0
      if (!isFinite(finalSalary) || Number.isNaN(finalSalary)) finalSalary = 0
      finalSalary = Number(finalSalary)

      classSalaryMap[cls.class_id] = finalSalary
      deptSalaryMap[cls.department_id] = (deptSalaryMap[cls.department_id] || 0) + finalSalary
      totalSalaryAll += finalSalary
    }

    // 6) Subtract salary at class level, compute departments and summary
    const departmentsMap: Record<number, any> = {}
    for (const cls of classRows) {
      const clsSalary = Number(classSalaryMap[cls.class_id] || 0)

      // profit after subtracting teacher salary for this class
      const profitAfterSalary = Number(cls.total_profit) - clsSalary

      if (!departmentsMap[cls.department_id]) {
        departmentsMap[cls.department_id] = {
          department_id: cls.department_id,
          department_name: cls.department_name,
          total_students: 0,
          total_revenue: 0,
          total_discount: 0,
          total_salary: 0,
          total_profit: 0,
          classes: [],
        }
      }

      const dep = departmentsMap[cls.department_id]

      dep.total_students += cls.total_students
      dep.total_revenue += cls.total_revenue
      dep.total_discount += cls.total_discount
      dep.total_salary += clsSalary // accumulate dept salary
      dep.total_profit += profitAfterSalary // accumulate profit after salary

      dep.classes.push({
        class_id: cls.class_id,
        class_code: cls.class_code,
        class_name: cls.class_name,
        price: cls.price,
        total_students: cls.total_students,
        total_revenue: cls.total_revenue,
        total_discount: cls.total_discount,
        // **total_profit at class-level after subtracting its teacher salary**
        total_profit: profitAfterSalary,
        total_student_discount: cls.total_student_discount,
        // include teacher salary for transparency
        teacher_salary: clsSalary,
      })
    }

    // 7) Build summary (sums after subtracting all teacher salaries)
    const summary = {
      total_students: Object.values(departmentsMap).reduce((acc: number, d: any) => acc + d.total_students, 0),
      total_revenue: Object.values(departmentsMap).reduce((acc: number, d: any) => acc + d.total_revenue, 0),
      total_discount: Object.values(departmentsMap).reduce((acc: number, d: any) => acc + d.total_discount, 0),
      total_salary: totalSalaryAll,
      total_profit: Object.values(departmentsMap).reduce((acc: number, d: any) => acc + d.total_profit, 0),
    }

    return {
      summary,
      departments: Object.values(departmentsMap),
    }
  }

  async teacherSalary(teacherRevenueDto: TeacherRevenueDto): Promise<any> {
    const { semester_id, scholastic_id, department_id } = teacherRevenueDto

    // 1. Build conditions động
    let conditions = `e.status = ${StatusEnrollment.DONE}`
    const params: any[] = []

    if (semester_id) {
      conditions += ` AND c.semester_id = ?`
      params.push(semester_id)
    }
    if (scholastic_id) {
      conditions += ` AND c.scholastic_id = ?`
      params.push(scholastic_id)
    }
    if (department_id) {
      conditions += ` AND s.department_id = ?`
      params.push(department_id)
    }

    // 2. Query raw data
    const sql = `
      SELECT
        t.id AS teacher_id,
        t.other_name AS teacher_other_name,
        u.full_name AS teacher_name,
        u.saint_name AS teacher_saint_name,
        d.id AS department_id,
        d.name AS department_name,
        c.id AS class_id,
        c.code AS class_code,
        c.name AS class_name,
        c.number_periods,
        c.salary AS salary_per_period,
        c.extra_allowance,
        t.special AS teacher_special,
        COUNT(e.id) AS total_students,
        SUM(c.price) AS total_revenue,
        SUM(e.discount) AS discount
      FROM enrollments e
      JOIN JSON_TABLE(
        e.class_ids,
        '$[*]' COLUMNS (
          class_id INT PATH '$.class_id',
          learn_type VARCHAR(50) PATH '$.learn_type'
        )
      ) jt ON TRUE
      JOIN classes c ON c.id = jt.class_id
      JOIN subjects s ON s.id = c.subject_id
      JOIN departments d ON d.id = s.department_id
      JOIN teachers t ON t.id = c.teacher_id
      JOIN user u ON u.id = t.user_id
      WHERE ${conditions}
      GROUP BY t.id, u.full_name, d.id, d.name, c.id, c.name,
               c.number_periods, c.salary, c.extra_allowance, t.special
      ORDER BY d.name, c.name
    `
    const rawData: any[] = await this.dataSource.query(sql, params)

    // 3. Tính toán từng lớp
    const classRows = rawData.map(row => {
      const totalDiscount = Number(row.discount || 0)
      const totalProfit = Number(row.total_revenue) - totalDiscount

      const salaryCap = Number(row.number_periods) * Number(row.salary_per_period)
      const extraAllowance = Number(row.extra_allowance || 0)

      let finalSalary = 0
      if (row.teacher_special === TeacherSpecial.LV1) {
        // không đặc cách
        finalSalary = (totalProfit >= salaryCap ? salaryCap : totalProfit) + extraAllowance
      } else if (row.teacher_special === TeacherSpecial.LV2) {
        // tích xanh
        finalSalary = salaryCap + extraAllowance
      } else if (row.teacher_special === TeacherSpecial.LV3) {
        // ngôi sao vàng
        finalSalary = totalProfit + extraAllowance
      }

      return {
        class_id: row.class_id,
        class_code: row.class_code,
        class_name: row.class_name,
        teacher_id: row.teacher_id,
        teacher_name: row.teacher_name,
        teacher_other_name: row.teacher_other_name,
        teacher_saint_name: row.teacher_saint_name,
        number_periods: Number(row.number_periods),
        salary: Number(row.salary_per_period), // lương gốc
        extra_allowance: extraAllowance,
        salary_cap: salaryCap, // lương mỗi tiết * số tiết
        teacher_special: row.teacher_special,
        final_salary: finalSalary,
        department_id: row.department_id,
        department_name: row.department_name,
      }
    })

    // 4. Nhóm theo department
    const departmentsMap: Record<number, any> = {}
    let totalSalary = 0

    for (const cls of classRows) {
      if (!departmentsMap[cls.department_id]) {
        departmentsMap[cls.department_id] = {
          department_id: cls.department_id,
          department_name: cls.department_name,
          total_salary: 0,
          classes: [],
        }
      }
      departmentsMap[cls.department_id].classes.push({
        class_id: cls.class_id,
        class_code: cls.class_code,
        class_name: cls.class_name,
        teacher_id: cls.teacher_id,
        teacher_name: cls.teacher_name,
        teacher_other_name: cls.teacher_other_name,
        teacher_saint_name: cls.teacher_saint_name,
        number_periods: cls.number_periods,
        salary: cls.salary,
        extra_allowance: cls.extra_allowance,
        salary_cap: cls.salary_cap,
        teacher_special: cls.teacher_special,
        final_salary: cls.final_salary,
      })

      departmentsMap[cls.department_id].total_salary += cls.final_salary
      totalSalary += cls.final_salary
    }

    // 5. Build final result
    return {
      summary: {
        total_salary: totalSalary,
      },
      departments: Object.values(departmentsMap),
    }
  }

  async updateTeacherSalary(teacherSalaryDto: UpdateTeacherSalaryDto): Promise<void> {
    const { class_id, teacher_id, salary, extra_allowance, teacher_special } = teacherSalaryDto
    console.log(teacherSalaryDto)
    const classEntity = await this.classRepository.exists({ where: { id: class_id } })
    if (!classEntity) {
      throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.BAD_REQUEST)
    }

    const teacherEntity = await this.teacherRepository.exists({ where: { id: teacher_id } })
    if (!teacherEntity) {
      throwAppException('TEACHER_NOT_FOUND', ErrorCode.TEACHER_NOT_FOUND, HttpStatus.BAD_REQUEST)
    }

    await this.classRepository.update(class_id, {
      salary,
      extra_allowance,
    })

    await this.teacherRepository.update(teacher_id, {
      special: teacher_special as TeacherSpecial,
    })
  }
}
