import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { User } from '@modules/users/user.entity'

@Entity('mailboxes')
export class MailboxesEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  title: string

  @Column({ nullable: true })
  content: string

  @Column({ default: false })
  is_read: boolean

  @Column({ nullable: true })
  full_name: string

  @Column({ nullable: true })
  email: string

  @Column({ nullable: true })
  phone_number: string

  @ManyToOne(() => User, user => user.mailboxes, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  user: User

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
