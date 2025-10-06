import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { ClassActivitiesEntity } from '../class-activities/class-activities.entity'
import { Student } from '@modules/students/students.entity'

@Entity('comments')
export class CommentEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'text' })
  content: string

  @Column()
  student_id: number

  @ManyToOne(() => Student, student => student.comments, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student

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
