import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

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

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
