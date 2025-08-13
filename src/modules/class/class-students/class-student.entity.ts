import { Student } from '@modules/students/students.entity'
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Classes } from '../class.entity'

@Entity({ name: 'class_students' })
export class ClassStudents {
  @PrimaryGeneratedColumn()
  id: number

  // Điểm số
  @Column({ type: 'float', nullable: true })
  score: number

  @ManyToOne(() => Classes, classes => classes.class_students, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Classes

  @Column()
  class_id: number

  @ManyToOne(() => Student, student => student.class_students, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student

  @Column()
  student_id: number

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
