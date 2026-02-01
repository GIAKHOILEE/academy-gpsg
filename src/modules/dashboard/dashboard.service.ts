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
import { FilterDashboardBySemesterDto, RevenueStatisticsDto, SemesterRevenueDto, TeacherRevenueDto } from './dtos/dashboard.dto'
import { UpdateTeacherSalaryDto } from './dtos/update.dto'
import { Gender, Role } from '@enums/role.enum'
import { User } from '@modules/users/user.entity'
import { Department } from '@modules/departments/departments.entity'
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
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly dataSource: DataSource,
  ) {}

  // thống kê dân số học viên
  async studentStatistics(filter: FilterDashboardBySemesterDto): Promise<any> {
    const { semester_id, scholastic_id } = filter

    const queryBuilder = this.userRepository
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

    if (semester_id || scholastic_id) {
      let filterSql = `EXISTS (
        SELECT 1
        FROM students s
        INNER JOIN enrollments e ON e.student_id = s.id
        INNER JOIN JSON_TABLE(e.class_ids, "$[*]" COLUMNS (class_id INT PATH "$.class_id")) ec ON 1=1
        INNER JOIN classes c ON c.id = ec.class_id
        WHERE s.user_id = u.id`

      if (semester_id) {
        filterSql += ` AND c.semester_id = :semester_id`
      }
      if (scholastic_id) {
        filterSql += ` AND c.scholastic_id = :scholastic_id`
      }
      filterSql += ')'

      queryBuilder.andWhere(filterSql)
    }

    const result = await queryBuilder.setParameters({ semester_id, scholastic_id, role: Role.STUDENT }).getRawOne()

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
    const classQb = this.classRepository.createQueryBuilder('c')
    if (semester_id) classQb.andWhere('c.semester_id = :semester_id', { semester_id })
    if (scholastic_id) classQb.andWhere('c.scholastic_id = :scholastic_id', { scholastic_id })
    const totalClass = await classQb.getCount()

    // tổng số giảng viên
    let totalTeacher: number
    if (semester_id || scholastic_id) {
      const teacherQb = this.teacherRepository.createQueryBuilder('t').innerJoin('classes', 'c', 'c.teacher_id = t.id')
      if (semester_id) teacherQb.andWhere('c.semester_id = :semester_id', { semester_id })
      if (scholastic_id) teacherQb.andWhere('c.scholastic_id = :scholastic_id', { scholastic_id })

      const teacherRes = await teacherQb.select('COUNT(DISTINCT t.id)', 'count').getRawOne()
      totalTeacher = Number(teacherRes.count)
    } else {
      totalTeacher = await this.teacherRepository.count()
    }

    // tổng số khoa
    let totalDepartment: number
    if (semester_id || scholastic_id) {
      const departmentQb = this.departmentRepository
        .createQueryBuilder('d')
        .innerJoin('subjects', 's', 's.department_id = d.id')
        .innerJoin('classes', 'c', 'c.subject_id = s.id')

      if (semester_id) departmentQb.andWhere('c.semester_id = :semester_id', { semester_id })
      if (scholastic_id) departmentQb.andWhere('c.scholastic_id = :scholastic_id', { scholastic_id })

      const departmentRes = await departmentQb.select('COUNT(DISTINCT d.id)', 'count').getRawOne()
      totalDepartment = Number(departmentRes.count)
    } else {
      totalDepartment = await this.departmentRepository.count()
    }

    return {
      totalClass,
      totalTeacher,
      totalDepartment,
      ...data,
    }
  }

  // thông kê tuổi học viên
  async studentAgeStatistics(filter: FilterDashboardBySemesterDto): Promise<any> {
    const { semester_id, scholastic_id } = filter
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

    const queryBuilder = this.userRepository.createQueryBuilder('u').select([]).where('u.role = :role', { role: Role.STUDENT })

    if (semester_id || scholastic_id) {
      let filterSql = `EXISTS (
        SELECT 1
        FROM students s
        INNER JOIN enrollments e ON e.student_id = s.id
        INNER JOIN JSON_TABLE(e.class_ids, "$[*]" COLUMNS (class_id INT PATH "$.class_id")) ec ON 1=1
        INNER JOIN classes c ON c.id = ec.class_id
        WHERE s.user_id = u.id`

      if (semester_id) {
        filterSql += ` AND c.semester_id = :semester_id`
      }
      if (scholastic_id) {
        filterSql += ` AND c.scholastic_id = :scholastic_id`
      }
      filterSql += ')'

      queryBuilder.andWhere(filterSql)
    }

    ageGroups.forEach((group, index) => {
      const minYear = today.getFullYear() - group.max
      const maxYear = today.getFullYear() - group.min
      const condition = `(
        STR_TO_DATE(u.birth_date, '%Y-%m-%d') BETWEEN '${minYear}-01-01' AND '${maxYear}-12-31'
        OR STR_TO_DATE(u.birth_date, '%d-%m-%Y') BETWEEN '${minYear}-01-01' AND '${maxYear}-12-31'
      )`

      queryBuilder.addSelect(`SUM(CASE WHEN ${condition} AND u.gender = ${Gender.MALE} THEN 1 ELSE 0 END)`, `male_${index}`)
      queryBuilder.addSelect(`SUM(CASE WHEN ${condition} AND u.gender = ${Gender.FEMALE} THEN 1 ELSE 0 END)`, `female_${index}`)
      queryBuilder.addSelect(`SUM(CASE WHEN ${condition} AND (u.gender = ${Gender.OTHER} OR u.gender IS NULL) THEN 1 ELSE 0 END)`, `other_${index}`)
    })

    const res = await queryBuilder.setParameters({ semester_id, scholastic_id, role: Role.STUDENT }).getRawOne()

    return ageGroups.map((group, index) => {
      const male = Number(res[`male_${index}`]) || 0
      const female = Number(res[`female_${index}`]) || 0
      const other = Number(res[`other_${index}`]) || 0
      return {
        ageGroup: group.label,
        male,
        female,
        other,
        total: male + female + other,
      }
    })
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

  /**
   * Optimized version of semesterRevenue
   * Key optimizations:
   * 1. Single SQL query instead of 2 separate queries
   * 2. Reduced CTE complexity
   * 3. Parameterized queries for security and query plan caching
   * 4. Included class info (teacher, salary) in main query
   */
  async semesterRevenue2(semesterRevenueDto: SemesterRevenueDto): Promise<SemesterRevenueSummary> {
    const { semester_id, scholastic_id, department_id } = semesterRevenueDto

    // Build dynamic conditions with parameterized queries
    const conditions: string[] = [`e.status = ?`]
    const params: any[] = [StatusEnrollment.DONE]

    if (semester_id) {
      conditions.push(`c.semester_id = ?`)
      params.push(semester_id)
    }
    if (scholastic_id) {
      conditions.push(`c.scholastic_id = ?`)
      params.push(scholastic_id)
    }
    if (department_id) {
      conditions.push(`s.department_id = ?`)
      params.push(department_id)
    }

    const whereClause = conditions.join(' AND ')

    // Optimized single query: combines revenue calculation with class/teacher info
    // Uses a more efficient approach:
    // 1. First, get all matching class_ids from enrollments using JSON_EXTRACT
    // 2. Aggregate at class level with all needed info in one pass
    const optimizedSql = `
      SELECT
        d.id AS department_id,
        d.name AS department_name,
        c.id AS class_id,
        c.code AS class_code,
        c.name AS class_name,
        COALESCE(c.price, 0) AS price,
        COALESCE(c.number_periods, 0) AS number_periods,
        COALESCE(c.salary, 0) AS salary_per_period,
        COALESCE(c.extra_allowance, 0) AS extra_allowance,
        c.teacher_id,
        t.special AS teacher_special,
        COUNT(DISTINCT e.id) AS total_students,
        COUNT(DISTINCT e.id) * COALESCE(c.price, 0) AS total_revenue,
        SUM(
          COALESCE(e.discount, 0) / 
          GREATEST(JSON_LENGTH(e.class_ids), 1)
        ) AS total_discount,
        COUNT(DISTINCT CASE WHEN e.discount > 0 THEN e.id END) AS total_student_discount
      FROM enrollments e
      INNER JOIN JSON_TABLE(
        e.class_ids,
        '$[*]' COLUMNS(
          class_id INT PATH '$.class_id'
        )
      ) ec ON TRUE
      INNER JOIN classes c ON c.id = ec.class_id
      INNER JOIN subjects s ON s.id = c.subject_id
      INNER JOIN departments d ON d.id = s.department_id
      LEFT JOIN teachers t ON t.id = c.teacher_id
      WHERE ${whereClause}
      GROUP BY d.id, d.name, c.id, c.code, c.name, c.price, 
               c.number_periods, c.salary, c.extra_allowance, 
               c.teacher_id, t.special
      ORDER BY d.name, c.name
    `

    const rows: any[] = await this.dataSource.query(optimizedSql, params)

    // Return empty result if no data
    if (!rows || rows.length === 0) {
      return {
        summary: { total_students: 0, total_revenue: 0, total_discount: 0, total_profit: 0, total_salary: 0 },
        departments: [],
      }
    }

    // Process rows and calculate salaries in a single pass
    const departmentsMap: Record<number, any> = {}
    let totalSalaryAll = 0
    let summaryTotalStudents = 0
    let summaryTotalRevenue = 0
    let summaryTotalDiscount = 0
    let summaryTotalProfit = 0

    for (const row of rows) {
      const departmentId = Number(row.department_id)
      const classId = Number(row.class_id)
      const price = Number(row.price || 0)
      const totalStudents = Number(row.total_students || 0)
      const totalRevenue = Number(row.total_revenue || 0)
      const totalDiscount = Number(row.total_discount || 0)
      const totalStudentDiscount = Number(row.total_student_discount || 0)

      // Calculate profit before salary
      const totalProfit = totalRevenue - totalDiscount

      // Calculate teacher salary
      const numberPeriods = Number(row.number_periods || 0)
      const salaryPerPeriod = Number(row.salary_per_period || 0)
      const extraAllowance = Number(row.extra_allowance || 0)
      const salaryCap = numberPeriods * salaryPerPeriod
      const teacherSpecial = row.teacher_special

      let finalSalary = 0
      if (teacherSpecial === TeacherSpecial.LV2) {
        // tick xanh: final = cap + extra
        finalSalary = salaryCap + extraAllowance
      } else if (teacherSpecial === TeacherSpecial.LV3) {
        // star: final = profit + extra
        finalSalary = totalProfit + extraAllowance
      } else {
        // LV1 or default: final = min(cap, profit) + extra
        finalSalary = Math.min(salaryCap, totalProfit) + extraAllowance
      }

      // Ensure valid number
      if (!isFinite(finalSalary) || Number.isNaN(finalSalary)) {
        finalSalary = 0
      }

      // Profit after salary
      const profitAfterSalary = totalProfit - finalSalary

      // Initialize department if needed
      if (!departmentsMap[departmentId]) {
        departmentsMap[departmentId] = {
          department_id: departmentId,
          department_name: row.department_name,
          total_students: 0,
          total_revenue: 0,
          total_discount: 0,
          total_salary: 0,
          total_profit: 0,
          classes: [],
        }
      }

      const dept = departmentsMap[departmentId]

      // Update department totals
      dept.total_students += totalStudents
      dept.total_revenue += totalRevenue - totalDiscount
      dept.total_discount += totalDiscount
      dept.total_salary += finalSalary
      dept.total_profit += profitAfterSalary

      // Add class to department
      dept.classes.push({
        class_id: classId,
        class_code: row.class_code,
        class_name: row.class_name,
        price: price,
        total_students: totalStudents,
        total_revenue: totalRevenue - totalDiscount,
        total_discount: totalDiscount,
        total_profit: profitAfterSalary,
        total_student_discount: totalStudentDiscount,
        teacher_salary: finalSalary,
      })

      // Update summary totals
      totalSalaryAll += finalSalary
      summaryTotalStudents += totalStudents
      summaryTotalRevenue += totalRevenue - totalDiscount
      summaryTotalDiscount += totalDiscount
      summaryTotalProfit += profitAfterSalary
    }

    return {
      summary: {
        total_students: summaryTotalStudents,
        total_revenue: summaryTotalRevenue,
        total_discount: summaryTotalDiscount,
        total_salary: totalSalaryAll,
        total_profit: summaryTotalProfit,
      },
      departments: Object.values(departmentsMap),
    }
  }

  /**
   * Optimized teacherSalary method
   * Key optimizations:
   * 1. Fully parameterized queries for security and query plan caching
   * 2. Fixed discount calculation - properly distributed per class
   * 3. Single loop for data processing instead of map() + for loop
   */
  async teacherSalary(teacherRevenueDto: TeacherRevenueDto): Promise<any> {
    const { semester_id, scholastic_id, department_id } = teacherRevenueDto

    // Build parameterized conditions
    const conditions: string[] = ['e.status = ?']
    const params: any[] = [StatusEnrollment.DONE]

    if (semester_id) {
      conditions.push('c.semester_id = ?')
      params.push(semester_id)
    }
    if (scholastic_id) {
      conditions.push('c.scholastic_id = ?')
      params.push(scholastic_id)
    }
    if (department_id) {
      conditions.push('s.department_id = ?')
      params.push(department_id)
    }

    const whereClause = conditions.join(' AND ')

    // Optimized SQL with proper discount distribution
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
        COALESCE(c.number_periods, 0) AS number_periods,
        COALESCE(c.salary, 0) AS salary_per_period,
        COALESCE(c.extra_allowance, 0) AS extra_allowance,
        t.special AS teacher_special,
        COUNT(DISTINCT e.id) AS total_students,
        COUNT(DISTINCT e.id) * COALESCE(c.price, 0) AS total_revenue,
        SUM(COALESCE(e.discount, 0) / GREATEST(JSON_LENGTH(e.class_ids), 1)) AS discount
      FROM enrollments e
      INNER JOIN JSON_TABLE(
        e.class_ids,
        '$[*]' COLUMNS (
          class_id INT PATH '$.class_id'
        )
      ) jt ON TRUE
      INNER JOIN classes c ON c.id = jt.class_id
      INNER JOIN subjects s ON s.id = c.subject_id
      INNER JOIN departments d ON d.id = s.department_id
      INNER JOIN teachers t ON t.id = c.teacher_id
      INNER JOIN user u ON u.id = t.user_id
      WHERE ${whereClause}
      GROUP BY t.id, t.other_name, u.full_name, u.saint_name,
               d.id, d.name, c.id, c.code, c.name,
               c.number_periods, c.salary, c.extra_allowance, t.special
      ORDER BY d.name, c.name
    `

    const rawData: any[] = await this.dataSource.query(sql, params)

    // Return empty result if no data
    if (!rawData || rawData.length === 0) {
      return {
        summary: { total_salary: 0 },
        departments: [],
      }
    }

    // Process data in single loop
    const departmentsMap: Record<number, any> = {}
    let totalSalary = 0

    for (const row of rawData) {
      const departmentId = Number(row.department_id)

      // Calculate salary
      const totalRevenue = Number(row.total_revenue || 0)
      const totalDiscount = Number(row.discount || 0)
      const totalProfit = totalRevenue - totalDiscount

      const numberPeriods = Number(row.number_periods || 0)
      const salaryPerPeriod = Number(row.salary_per_period || 0)
      const extraAllowance = Number(row.extra_allowance || 0)
      const salaryCap = numberPeriods * salaryPerPeriod

      let finalSalary = 0
      if (row.teacher_special === TeacherSpecial.LV1) {
        // không đặc cách
        finalSalary = Math.min(totalProfit, salaryCap) + extraAllowance
      } else if (row.teacher_special === TeacherSpecial.LV2) {
        // tích xanh
        finalSalary = salaryCap + extraAllowance
      } else if (row.teacher_special === TeacherSpecial.LV3) {
        // ngôi sao vàng
        finalSalary = totalProfit + extraAllowance
      } else {
        // default: same as LV1
        finalSalary = Math.min(totalProfit, salaryCap) + extraAllowance
      }

      // Ensure valid number
      if (!isFinite(finalSalary) || Number.isNaN(finalSalary)) {
        finalSalary = 0
      }

      // Initialize department if needed
      if (!departmentsMap[departmentId]) {
        departmentsMap[departmentId] = {
          department_id: departmentId,
          department_name: row.department_name,
          total_salary: 0,
          classes: [],
        }
      }

      // Add class to department
      departmentsMap[departmentId].classes.push({
        class_id: Number(row.class_id),
        class_code: row.class_code,
        class_name: row.class_name,
        teacher_id: Number(row.teacher_id),
        teacher_name: row.teacher_name,
        teacher_other_name: row.teacher_other_name,
        teacher_saint_name: row.teacher_saint_name,
        number_periods: numberPeriods,
        salary: salaryPerPeriod,
        extra_allowance: extraAllowance,
        salary_cap: salaryCap,
        teacher_special: row.teacher_special,
        final_salary: finalSalary,
      })

      departmentsMap[departmentId].total_salary += finalSalary
      totalSalary += finalSalary
    }

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
