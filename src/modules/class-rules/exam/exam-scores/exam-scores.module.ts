import { Module } from '@nestjs/common'
import { ExamScoreController, TeacherExamScoreController } from './exam-scores.controller'
import { ExamScoreService } from './exam-scores.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ExamScore } from './exam-scores.entity'
import { ExamScoreServiceV2 } from './exam-scores.service'
import { AdminExamScoreControllerV2, TeacherExamScoreControllerV2 } from './exam-scores.controller'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { Classes } from '@modules/class/class.entity'

@Module({
  imports: [TypeOrmModule.forFeature([ExamScore, ClassStudents, Classes])],
  controllers: [
    // ExamScoreController,
    // TeacherExamScoreController,
    AdminExamScoreControllerV2,
    TeacherExamScoreControllerV2,
  ],
  providers: [ExamScoreService, ExamScoreServiceV2],
  exports: [ExamScoreService, ExamScoreServiceV2],
})
export class ExamScoreModule {}
