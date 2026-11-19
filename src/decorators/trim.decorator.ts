import { Transform } from 'class-transformer'

/** Xóa khoảng trắng ở hai đầu nếu giá trị đầu vào là chuỗi. */
export function Trim(): PropertyDecorator {
  return Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
}
