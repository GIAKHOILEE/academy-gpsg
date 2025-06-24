import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Classes } from '../class.entity'
import { Student } from '@modules/students/students.entity'
import { PaymentMethod, PaymentStatus, StatusEnrollment } from '@enums/class.enum'

@Entity({ name: 'class_students' })
export class ClassStudents {
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

  // Tổng học phí
  @Column({ type: 'float', nullable: true })
  total_fee: number

  // Tiền đặt cọc
  @Column({ type: 'float', nullable: true })
  prepaid: number

  // Nợ học phí
  @Column({ type: 'float', nullable: true })
  debt: number

  // Ghi chú
  @Column({ type: 'text', nullable: true })
  note: string

  // Đã ghi danh và có đăng nhập
  @Column({ default: false })
  is_logged: boolean

  // Điểm số
  @Column({ type: 'float', nullable: true })
  score: number

  @ManyToOne(() => Classes, classes => classes.class_students, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Classes

  @Column()
  class_id: number

  @ManyToOne(() => Student, student => student.class_students, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student

  @Column()
  student_id: number

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
