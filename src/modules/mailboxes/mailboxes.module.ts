import { Module } from '@nestjs/common'
import { AdminMailboxesController, UserMailboxesController } from './mailboxes.controller'
import { MailboxesService } from './mailboxes.service'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MailboxesEntity } from './mailboxes.entity'
import { User } from '@modules/users/user.entity'

@Module({
  imports: [TypeOrmModule.forFeature([MailboxesEntity, User])],
  controllers: [AdminMailboxesController, UserMailboxesController],
  providers: [MailboxesService],
})
export class MailboxesModule {}
