import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, DeleteDateColumn, JoinColumn } from 'typeorm'
import { Lesson } from '../lesson/lesson.entity'
import { User } from '@modules/users/user.entity'

@Entity()
export class Discuss {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  parent_id: number

  @Column()
  content: string

  @Column({ default: false })
  admin_responded: boolean

  @Column({ default: false })
  user_responded: boolean

  @ManyToOne(() => User, user => user.discusses, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  @ManyToOne(() => Lesson, lesson => lesson.discusses, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @DeleteDateColumn()
  deletedAt: Date
}
