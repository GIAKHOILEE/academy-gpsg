import { ClassSpecial } from './class.enum'

// đặc cách giáo viên (Deprecated: chuyển sang sử dụng ClassSpecial của từng lớp học)
export const TeacherSpecial = ClassSpecial
export type TeacherSpecial = ClassSpecial


export enum StudentCardStatus {
  NOT_PRINTED = 1, // chưa in thẻ
  PRINTED = 2, // đã in thẻ
  RECEIVED = 3, // đã nhận thẻ
  WAITING_REPRINT = 4, // đợi làm lại thẻ
  REPRINTED = 5, // đã in lại thẻ
}

export enum ReligionType {
  PARISHIONER = 1, // giáo dân
  FRIAR = 2, // tu sĩ
  OTHER_RELIGION = 3, // đạo khác
}
