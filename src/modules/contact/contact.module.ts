import { Module } from '@nestjs/common'
import { ContactAdminController, ContactUserController } from './contact.controller'
import { ContactService } from './contact.service'
import { Contact } from './contact.entity'
import { TypeOrmModule } from '@nestjs/typeorm'

@Module({
  imports: [TypeOrmModule.forFeature([Contact])],
  controllers: [ContactAdminController, ContactUserController],
  providers: [ContactService],
})
export class ContactModule {}
