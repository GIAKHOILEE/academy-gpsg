import { ClassStatus, Schedule } from '@enums/class.enum'
import { Subject } from '@modules/subjects/subjects.entity'
import { Teacher } from '@modules/teachers/teachers.entity'
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { ClassStudents } from './class-students/class-student.entity'
import { Semester } from './_semester/semester.entity'
import { Scholastic } from './_scholastic/scholastic.entity'
import { ClassRule } from '@modules/class-rules/_class-rules/class-rules.entity'
import { Exam } from '@modules/class-rules/exam/_exam/exam.entity'
import { AttendanceRule } from '@modules/class-rules/attendance-rule/attendance-rule.entity'
import { Lesson } from '@modules/_online-feature/lesson/lesson.entity'
import { ClassNotification } from './notifications/notifications.entity'

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

  // lương/tiết học của giáo viên
  @Column({ type: 'decimal', precision: 10, scale: 0, nullable: true })
  salary: number

  // bồi dưỡng thêm
  @Column({ type: 'decimal', precision: 10, scale: 0, default: 0 })
  extra_allowance: number

  // số tiết học
  @Column({ type: 'float', nullable: true })
  number_periods: number

  // số buổi học
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

  // ngày kết thúc ghi danh
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

  // Bật tắt đánh giá
  @Column({ default: false })
  is_evaluate: boolean

  @Column({ default: false })
  learn_video: boolean

  @Column({ default: false })
  learn_meeting: boolean

  @Column({ default: false })
  is_online: boolean

  @Column({ type: 'text', nullable: true })
  content: string

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

  @OneToOne(() => ClassRule, rule => rule.class)
  rule: ClassRule

  @OneToMany(() => Exam, exam => exam.class, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  exams: Exam[]

  @OneToMany(() => AttendanceRule, attendanceRule => attendanceRule.class, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  attendance_rules: AttendanceRule[]

  @OneToMany(() => Lesson, lesson => lesson.class, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  lessons: Lesson[]

  @OneToMany(() => ClassNotification, notification => notification.class, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  notifications: ClassNotification[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
