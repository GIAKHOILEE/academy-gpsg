import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToOne, OneToMany } from 'typeorm'
import { JoinColumn } from 'typeorm'
import { User } from '../users/user.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { Enrollments } from '@modules/enrollments/enrollments.entity'
@Entity({ name: 'students' })
export class Student {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  card_code: string

  @OneToOne(() => User, user => user.id, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column()
  user_id: number

  @Column({ nullable: true })
  image_4x6: string

  // học bạ
  @Column({ nullable: true })
  diploma_image: string

  // bằng tốt nghiệp
  @Column({ nullable: true })
  transcript_image: string

  // tài liệu khác
  @Column({ nullable: true })
  other_document: string

  // tốt nghiệp
  @Column({ nullable: true, default: false })
  graduate: boolean

  // năm tốt nghiệp
  @Column({ nullable: true, default: null })
  graduate_year: number

  // bảng tạm
  // @Column({ default: false })
  // is_temporary: boolean

  // danh sách lớp học
  @OneToMany(() => ClassStudents, classStudents => classStudents.student, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  class_students: ClassStudents[]

  // danh sách đăng ký
  @OneToMany(() => Enrollments, enrollments => enrollments.student)
  enrollments: Enrollments[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
