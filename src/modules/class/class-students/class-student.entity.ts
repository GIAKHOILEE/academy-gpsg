import { Student } from '@modules/students/students.entity'
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Classes } from '../class.entity'
import { IEnrollments } from '@modules/enrollments/enrollments.interface'

@Entity({ name: 'class_students' })
export class ClassStudents {
  @PrimaryGeneratedColumn()
  id: number

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

  @Column()
  student_id: number

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
