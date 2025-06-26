export enum ClassStatus {
  ENROLLING = 1, // Đang tuyển sinh
  END_ENROLLING = 2, // Đã kết thúc tuyển sinh
  HAS_BEGUN = 3, // Đã bắt đầu
  END_CLASS = 4, // Đã kết thúc
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
