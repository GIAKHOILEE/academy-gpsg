import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToOne, OneToMany } from 'typeorm'
import { JoinColumn } from 'typeorm'
import { User } from '../users/user.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { Enrollments } from '@modules/enrollments/enrollments.entity'
import { Answers } from '@modules/evaluation/answers/answers.entity'
import { IFile } from '@common/file'

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

  // đã lấy thẻ
  @Column({ nullable: true, default: false })
  is_card_taken: boolean

  // học bạ
  @Column({ nullable: true, type: 'json' })
  diploma_image: IFile[]

  // bằng tốt nghiệp
  @Column({ nullable: true, type: 'json' })
  transcript_image: IFile[]

  // tài liệu khác
  @Column({ nullable: true, type: 'json' })
  other_document: IFile[]

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

  @OneToMany(() => Answers, answers => answers.student, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  answers: Answers[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
