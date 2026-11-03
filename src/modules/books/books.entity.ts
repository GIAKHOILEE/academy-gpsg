import { Classes } from '@modules/class/class.entity'
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinTable, ManyToMany, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { StudentBook } from './student-books.entity'

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar', length: 100, nullable: true })
  code: string

  @Column({ type: 'varchar', length: 255 })
  name: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  author: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  publisher: string

  @Column({ type: 'int', nullable: true })
  publication_year: number

  @Column({ type: 'text', nullable: true })
  image: string

  @Column({ type: 'text', nullable: true })
  description: string

  @ManyToMany(() => Classes, classes => classes.books, { cascade: true })
  @JoinTable({
    name: 'class_books',
    joinColumn: { name: 'book_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'class_id', referencedColumnName: 'id' },
  })
  classes: Classes[]

  @OneToMany(() => StudentBook, studentBook => studentBook.book, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  student_books: StudentBook[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
