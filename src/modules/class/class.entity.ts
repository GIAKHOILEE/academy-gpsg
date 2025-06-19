import { ClassStatus, Semester } from '@enums/class.enum'
import { Teacher } from '@modules/teachers/teachers.entity'
import { Subject } from '@modules/subjects/subjects.entity'
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Department } from '@modules/departments/departments.entity'
import { ClassStudents } from './class-students/class-students.entity'

@Entity({ name: 'classes' })
export class Classes {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column()
  code: string

  @Column({ default: ClassStatus.ENROLLING })
  status: ClassStatus

  @Column()
  classroom: string

  // Niên khóa
  @Column()
  scholastic: string

  // Học kỳ
  @Column({ nullable: true, default: Semester.FIRST })
  semester: Semester

  // Ngày khai giảng
  @Column({ nullable: true })
  opening_day: string

  // Ngày kết thúc lớp
  @Column({ nullable: true })
  closing_day: string

  @Column({ default: true })
  is_active: boolean

  // môn học
  @ManyToOne(() => Subject, subject => subject.classes, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject

  @Column({ nullable: true })
  subject_id: number

  // giáo viên
  @ManyToOne(() => Teacher, teacher => teacher.classes, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher

  @Column({ nullable: true })
  teacher_id: number

  // khoa
  @ManyToOne(() => Department, department => department.classes, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'department_id' })
  department: Department

  @Column({ nullable: true })
  department_id: number

  // danh sách học sinh
  @OneToMany(() => ClassStudents, classStudents => classStudents.class, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  class_students: ClassStudents[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
