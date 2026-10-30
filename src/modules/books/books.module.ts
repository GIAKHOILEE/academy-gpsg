import { Classes } from '@modules/class/class.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { Enrollments } from '@modules/enrollments/enrollments.entity'
import { Student } from '@modules/students/students.entity'
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { BooksAdminController, BooksController, StudentBooksController } from './books.controller'
import { Book } from './books.entity'
import { BooksService } from './books.service'
import { StudentBook } from './student-books.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Book, StudentBook, Classes, ClassStudents, Student, Enrollments])],
  controllers: [BooksAdminController, BooksController, StudentBooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}
