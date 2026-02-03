import { Module } from '@nestjs/common'
import { ExamScoreService } from './exam-scores.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ExamScore } from './exam-scores.entity'
import { ExamScoreServiceV2 } from './exam-scores.service'
import { AdminExamScoreControllerV2, StudentExamScoreController, TeacherExamScoreControllerV2 } from './exam-scores.controller'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { Classes } from '@modules/class/class.entity'
import { Student } from '@modules/students/students.entity'

@Module({
  imports: [TypeOrmModule.forFeature([ExamScore, ClassStudents, Classes, Student])],
  controllers: [
    // ExamScoreController,
    // TeacherExamScoreController,
    AdminExamScoreControllerV2,
    TeacherExamScoreControllerV2,
    StudentExamScoreController,
  ],
  providers: [ExamScoreService, ExamScoreServiceV2],
  exports: [ExamScoreService, ExamScoreServiceV2],
})
export class ExamScoreModule {}
