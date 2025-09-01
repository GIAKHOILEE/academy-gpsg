import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { AttendanceStatus } from '@enums/class.enum'
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity({ name: 'attendances' })
export class Attendance {
  @PrimaryGeneratedColumn()
  id: number

  // Ngày điểm danh (mỗi buổi học)
  @Column({ type: 'date' })
  attendance_date: string

  // Trạng thái: Có mặt / Vắng / Đi trễ
  @Column({ type: 'enum', enum: AttendanceStatus, default: AttendanceStatus.PRESENT })
  status: AttendanceStatus

  // Ghi chú nếu cần
  @Column({ type: 'text', nullable: true })
  note: string

  // Liên kết tới học viên trong lớp
  @ManyToOne(() => ClassStudents, classStudent => classStudent.attendances, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'class_student_id' })
  class_student: ClassStudents

  @Column()
  class_student_id: number

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
