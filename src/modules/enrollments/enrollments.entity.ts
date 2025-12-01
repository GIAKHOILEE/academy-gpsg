import { LearnType, PaymentMethod, PaymentStatus, StatusEnrollment } from '@enums/class.enum'
import { Student } from '@modules/students/students.entity'
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('enrollments')
export class Enrollments {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true })
  code: string

  @CreateDateColumn()
  registration_date: Date

  @Column({ type: 'enum', enum: PaymentMethod, default: PaymentMethod.CASH })
  payment_method: PaymentMethod

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.UNPAID })
  payment_status: PaymentStatus

  @Column({ type: 'enum', enum: StatusEnrollment, default: StatusEnrollment.PENDING })
  status: StatusEnrollment

  @Column({ nullable: true })
  voucher_code: string

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number

  // List mã lớp đăng ký
  @Column({ type: 'json', nullable: true })
  class_ids: { class_id: number; learn_type: LearnType }[]

  // Tổng học phí
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_fee: number

  // Tiền đặt cọc
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  prepaid: number

  // Nợ học phí
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  debt: number

  // Ghi chú
  @Column({ type: 'text', nullable: true })
  note: string

  @Column({ type: 'text', nullable: true })
  user_note: string

  @Column({ nullable: true })
  is_read_note: boolean

  // Đã ghi danh và có đăng nhập
  @Column({ default: false })
  is_logged: boolean

  // Tên thánh
  @Column({ nullable: true })
  saint_name: string

  @Column({ nullable: true })
  full_name: string

  @Column({ nullable: true })
  email: string

  @Column({ nullable: true })
  phone_number: string

  // ngày sinh
  @Column({ nullable: true })
  birth_date: string

  @Column({ nullable: true })
  address: string

  // nơi sinh
  @Column({ nullable: true })
  birth_place: string

  // giáo xứ
  @Column({ nullable: true })
  parish: string

  // giáo hat
  @Column({ nullable: true })
  deanery: string

  // giáo phận
  @Column({ nullable: true })
  diocese: string

  // dòng tu
  @Column({ nullable: true })
  congregation: string

  @ManyToOne(() => Student, student => student.enrollments, { nullable: true })
  @JoinColumn({ name: 'student_id' })
  student: Student

  @Column({ nullable: true })
  student_id: number

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
