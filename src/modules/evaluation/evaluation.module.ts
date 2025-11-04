import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Questions } from './questions/questions.entity'
import { Answers } from './answers/answers.entity'
import { QuestionsService } from './questions/questions.service'
import { AnswersService } from './answers/answers.service'
import { AdminQuestionsController, TeacherQuestionsController, UserQuestionsController } from './questions/questions.controller'
import { AdminAnswersController, TeacherAnswersController, UserAnswersController } from './answers/answers.controller'
import { Student } from '@modules/students/students.entity'
import { Classes } from '@modules/class/class.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Questions, Answers, Student, Classes])],
  controllers: [
    AdminQuestionsController,
    UserQuestionsController,
    TeacherQuestionsController,
    AdminAnswersController,
    UserAnswersController,
    TeacherAnswersController,
  ],
  providers: [QuestionsService, AnswersService],
})
export class EvaluationModule {}
