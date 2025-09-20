import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Exam } from './exam.entity'
import { ExamService } from './exam.service'
import { AdminExamController, TeacherExamController, UserExamController } from './exam.controller'
import { ExamScore } from '../exam-scores/exam-scores.entity'
import { Classes } from '@modules/class/class.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Exam, ExamScore, Classes])],
  providers: [ExamService],
  controllers: [AdminExamController, TeacherExamController, UserExamController],
  exports: [ExamService],
})
export class ExamModule {}
