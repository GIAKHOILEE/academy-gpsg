// đặc cách giáo viên
export enum TeacherSpecial {
  LV1 = 1, // dấu -
  LV2 = 2, // dấu tích xanh
  LV3 = 3, // ngôi sao
}

export enum StudentCardStatus {
  NOT_PRINTED = 1, // chưa in thẻ
  PRINTED = 2, // đã in thẻ
  RECEIVED = 3, // đã nhận thẻ
  WAITING_REPRINT = 4, // đợi làm lại thẻ
  REPRINTED = 5, // đã in lại thẻ
}
