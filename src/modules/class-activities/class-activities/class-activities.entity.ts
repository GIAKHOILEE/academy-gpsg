import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, JoinColumn, ManyToOne } from 'typeorm'
import { CommentEntity } from '../comment/comment.entity'
import { Teacher } from '@modules/teachers/teachers.entity'

@Entity('class_activities')
export class ClassActivitiesEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar', length: 255 })
  title: string

  @Column({ type: 'varchar', length: 255 })
  description: string

  @Column({ type: 'text' })
  content: string

  @Column()
  class_id: number

  @Column()
  teacher_id: number

  @ManyToOne(() => Teacher, teacher => teacher.class_activities, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher

  @OneToMany(() => CommentEntity, comment => comment.class_activities_id, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  comments: CommentEntity[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
