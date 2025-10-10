import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { ClassActivitiesEntity } from '../class-activities/class-activities.entity'
import { Role } from '@enums/role.enum'
import { User } from '@modules/users/user.entity'

@Entity('comments')
export class CommentEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'enum', enum: Role, default: Role.STUDENT })
  role: Role

  @Column()
  user_id: number

  @ManyToOne(() => User, user => user.comments, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column()
  class_activities_id: number

  @ManyToOne(() => ClassActivitiesEntity, activity => activity.comments, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'class_activities_id' })
  class_activities: ClassActivitiesEntity

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
