import { Module } from '@nestjs/common'
import { StudentsController } from './students.controller'
import { StudentsService } from './students.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Student } from './students.entity'
import { User } from '../users/user.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Student, User])],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
