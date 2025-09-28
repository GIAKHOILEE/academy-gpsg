import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from './user.entity'
import { UserService } from './user.service'
import { AdminFinanceController, AdminStaffController, AdminUsersController, UsersController } from './user.controller'
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UserService],
  exports: [UserService],
  controllers: [AdminUsersController, AdminStaffController, AdminFinanceController, UsersController],
})
export class UsersModule {}
