import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToMany } from 'typeorm'
import { UserStatus } from '@enums/status.enum'
import { Gender, Role } from '@enums/role.enum'
import { CommentEntity } from '@modules/class-activities/comment/comment.entity'
import { MailboxesEntity } from '@modules/mailboxes/mailboxes.entity'

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  full_name: string

  @Column({ unique: true, nullable: true })
  username: string

  @Column({ nullable: true, unique: true })
  code: string

  @Column({ nullable: true })
  email: string

  @Column({ nullable: true })
  password: string

  @Column({ nullable: true })
  saint_name: string

  @Column({ nullable: true, default: Gender.OTHER })
  gender: Gender

  @Column({ nullable: true })
  phone_number: string

  @Column({ nullable: true })
  address: string

  @Column({ nullable: true })
  avatar: string

  // nơi sinh
  @Column({ nullable: true })
  birth_place: string

  @Column({ nullable: true })
  birth_date: string

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

  @Column({
    type: 'tinyint',
    default: Role.STUDENT,
  })
  role: Role

  @Column({
    type: 'tinyint',
    default: UserStatus.ACTIVE,
  })
  status: UserStatus

  @OneToMany(() => CommentEntity, comment => comment.user, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  comments: CommentEntity[]

  // @Column({ default: false, nullable: true })
  // is_temporary: boolean

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
