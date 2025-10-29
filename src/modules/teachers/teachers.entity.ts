import { Classes } from '@modules/class/class.entity'
import { User } from '@modules/users/user.entity'
import { TeacherSpecial } from '@enums/user.enum'
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { ClassActivitiesEntity } from '@modules/class-activities/class-activities/class-activities.entity'

@Entity({ name: 'teachers' })
export class Teacher {
  @PrimaryGeneratedColumn()
  id: number

  @OneToOne(() => User, user => user.id, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column()
  user_id: number

  // đặc cách giáo viên
  @Column({ default: TeacherSpecial.LV1 })
  special: TeacherSpecial

  // tên khác
  @Column({ nullable: true })
  other_name: string

  // học vị
  @Column({ nullable: true })
  degree: string

  // chuyên ngành
  @Column({ nullable: true })
  specialized: string

  // chứng chỉ chuyên môn
  @Column({ nullable: true })
  professional_certificate: string

  // chứng chỉ giáo viên
  @Column({ nullable: true })
  teacher_certificate: string

  // môn đã và đang giảng dạy
  @Column({ nullable: true })
  subject_teaching: string

  // GV nội trú hay ngoại trú (true: nội trú, false: ngoại trú)
  @Column({ nullable: true, default: false })
  boarding: boolean

  // ngày bắt đầu làm việc
  @Column({ nullable: true })
  start_date: Date

  // CV
  @Column({ nullable: true })
  cv: string

  @OneToMany(() => Classes, classes => classes.teacher, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  classes: Classes[]

  @OneToMany(() => ClassActivitiesEntity, classActivities => classActivities.teacher, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  class_activities: ClassActivitiesEntity[]

  // banking
  @Column({ nullable: true })
  bank_name: string

  @Column({ nullable: true })
  bank_account_number: string

  @Column({ nullable: true })
  bank_account_name: string

  @Column({ nullable: true })
  bank_branch: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
