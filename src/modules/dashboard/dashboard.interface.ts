import { TeacherSpecial } from '@enums/user.enum'

export interface SemesterRevenueSummary {
  summary: {
    total_students: number
    total_revenue: number
    total_discount: number
    total_profit: number
  }
  departments: {
    department_id: number
    department_name: string
    total_students: number
    total_revenue: number
    total_discount: number
    total_profit: number
    classes: {
      class_id: number
      class_name: string
      price: number
      total_students: number
      total_revenue: number
      total_discount: number
      total_profit: number
      total_student_discount: number
    }[]
  }[]
}

export interface TeacherRevenueSummary {
  summary: {
    total_salary: number
  }
  departments: DepartmentRevenue[]
}

export interface DepartmentRevenue {
  department_id: number
  department_name: string
  total_salary: number
  classes: ClassRevenue[]
}

export interface ClassRevenue {
  class_id: number
  class_name: string
  teacher_id: number
  teacher_name: string
  number_periods: number
  salary: number
  extra_allowance: number
  salary_cap: number
  teacher_special: number
  final_salary: number
}
