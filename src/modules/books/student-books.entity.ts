import { BookDeliveryStatus } from '@enums/class.enum'
import { Student } from '@modules/students/students.entity'
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm'
import { Book } from './books.entity'

@Entity({ name: 'student_books' })
@Unique('uniq_student_book', ['student_id', 'book_id'])
export class StudentBook {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Student, student => student.student_books, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student

  @Column()
  student_id: number

  @ManyToOne(() => Book, book => book.student_books, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  book: Book

  @Column()
  book_id: number

  @Column({ type: 'enum', enum: BookDeliveryStatus, default: BookDeliveryStatus.NOT_SENT })
  book_status: BookDeliveryStatus

  @Column({ type: 'text', nullable: true })
  shipping_address: string

  @Column({ type: 'text', nullable: true })
  book_delivery_note: string

  @Column({ nullable: true })
  book_received_date: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}

