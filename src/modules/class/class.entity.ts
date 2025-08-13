import { ClassStatus, Schedule } from '@enums/class.enum'
import { Subject } from '@modules/subjects/subjects.entity'
import { Teacher } from '@modules/teachers/teachers.entity'
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { ClassStudents } from './class-students/class-student.entity'
import { Semester } from './_semester/semester.entity'
import { Scholastic } from './_scholastic/scholastic.entity'

@Entity({ name: 'classes' })
export class Classes {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  name: string

  @Column()
  code: string

  @Column({ default: ClassStatus.ENROLLING })
  status: ClassStatus

  @Column({ nullable: true })
  classroom: string

  // số tiết học
  @Column({ default: 0 })
  number_lessons: number

  @Column({ default: 9999 })
  max_students: number

  @Column()
  price: number

  @Column({ type: 'text', nullable: true })
  condition: string

  //lịch học
  @Column({
    type: 'json',
    nullable: true,
  })
  schedule: Schedule[]

  @Column({ nullable: true })
  end_enrollment_day: string

  // giờ bắt đầu vào học
  @Column({ nullable: true })
  start_time: string

  // giờ kết thúc học
  @Column({ nullable: true })
  end_time: string

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

  // Niên khóa
  @ManyToOne(() => Scholastic, scholastic => scholastic.classes, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'scholastic_id' })
  scholastic: Scholastic

  @Column({ nullable: true })
  scholastic_id: number

  // Học kỳ
  @ManyToOne(() => Semester, semester => semester.classes, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'semester_id' })
  semester: Semester

  @Column({ nullable: true })
  semester_id: number

  // danh sách học sinh
  @OneToMany(() => ClassStudents, classStudents => classStudents.class, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  class_students: ClassStudents[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
