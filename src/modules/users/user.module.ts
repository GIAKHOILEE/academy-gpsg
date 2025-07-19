import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from './user.entity'
import { UserService } from './user.service'
import { AdminStaffController, AdminUsersController, UsersController } from './user.controller'
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserService],
  exports: [UserService],
  controllers: [AdminUsersController, AdminStaffController, UsersController],
})
export class UsersModule {}
