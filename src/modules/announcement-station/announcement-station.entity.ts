import { AnnouncementStatus, AnnouncementType } from '@enums/announcement.enum'
import { Role } from '@enums/role.enum'
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('announcement_station')
export class AnnouncementStation {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  title: string

  @Column({ type: 'text', nullable: true })
  content: string

  @Column({ type: 'json', nullable: true })
  file_url: string[]

  @Column({ type: 'enum', enum: Role })
  role: Role

  @Column({
    type: 'enum',
    enum: AnnouncementType,
    default: AnnouncementType.EMAIL,
  })
  type: AnnouncementType

  @Column({
    type: 'enum',
    enum: AnnouncementStatus,
    default: AnnouncementStatus.PENDING,
  })
  status: AnnouncementStatus

  @Column({ comment: 'ID của Student hoặc Teacher' })
  target_id: number

  @Column({ nullable: true, comment: 'ID của User' })
  user_id: number

  @Column({ nullable: true })
  email: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
