export enum ClassStatus {
  ENROLLING = 1, // Đang tuyển sinh
  END_ENROLLING = 2, // Đã kết thúc tuyển sinh
  HAS_BEGUN = 3, // Đã bắt đầu
  END_CLASS = 4, // Đã kết thúc
}

export enum LearnType {
  OFFLINE = 1,
  VIDEO = 2,
  MEETING = 3,
}

export enum Schedule {
  SUNDAY = 1,
  MONDAY = 2,
  TUESDAY = 3,
  WEDNESDAY = 4,
  THURSDAY = 5,
  FRIDAY = 6,
  SATURDAY = 7,
}

export enum PaymentMethod {
  CASH = 1, // Tiền mặt
  TRANSFER = 2, // Chuyển khoản
}

export enum PaymentStatus {
  PAID = 1, // Đã thanh toán
  UNPAID = 2, // Chưa thanh toán
}

export enum StatusEnrollment {
  PENDING = 1, // Chờ thanh toán
  DONE = 2, // Đã hoàn thành
  PAY_LATE = 3, // thanh toán sau
  DEBT = 4, // nợ học phí
}

// Quy tắc đánh giá
export enum RuleType {
  ATTENDANCE_PERCENTAGE = 1,
  TEACHER_EVALUATION = 2,
  SCORE_BASED = 3,
  ATTENDANCE_PERCENTAGE_AND_SCORE_BASED = 4,
}

// Trạng thái điểm danh
export enum AttendanceStatus {
  PRESENT = 1, // Có mặt
  ABSENT = 2, // Vắng
  LATE = 3, // Đi trễ
}

export enum TeacherEvaluationStatus {
  PASS = 1,
  FAIL = 2,
}

export enum AttendanceRuleType {
  REGULAR = 1, // học bình thường
  MAKEUP = 2, // học bù
  EXAM = 3, // thi
  OFF = 4, // nghỉ
}
