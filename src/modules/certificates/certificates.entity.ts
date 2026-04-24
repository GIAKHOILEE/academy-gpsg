import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Student } from '../students/students.entity'

@Entity({ name: 'certificates' })
export class Certificates {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  code: string

  @Column({ type: 'text', nullable: true })
  image_url: string

  @ManyToOne(() => Student, student => student.certificates, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student

  @Column()
  student_id: number

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
