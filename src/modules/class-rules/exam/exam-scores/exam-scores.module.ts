import { Module } from '@nestjs/common'
import { ExamScoreController, TeacherExamScoreController } from './exam-scores.controller'
import { ExamScoreService } from './exam-scores.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ExamScore } from './exam-scores.entity'

@Module({
  imports: [TypeOrmModule.forFeature([ExamScore])],
  controllers: [ExamScoreController, TeacherExamScoreController],
  providers: [ExamScoreService],
  exports: [ExamScoreService],
})
export class ExamScoreModule {}
