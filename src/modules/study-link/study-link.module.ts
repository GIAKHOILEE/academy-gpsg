import { Module } from '@nestjs/common'
import { StudyLinkController, StudyLinkControllerUser } from './study-link.controller'
import { StudyLinkService } from './study-link.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { StudyLink } from './study-link.entity'

@Module({
  imports: [TypeOrmModule.forFeature([StudyLink])],
  controllers: [StudyLinkController, StudyLinkControllerUser],
  providers: [StudyLinkService],
})
export class StudyLinkModule {}
