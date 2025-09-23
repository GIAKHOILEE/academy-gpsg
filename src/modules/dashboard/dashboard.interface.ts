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
