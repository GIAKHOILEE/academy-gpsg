import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { NavigationParentAttendance } from './navigation-parent/navigation-parent.entity'
import { NavigationSubAttendance } from './navigation-sub/navigation-sub.entity'
import { NavigationParentAttendanceService } from './navigation-parent/navigation-parent.service'
import { NavigationSubAttendanceService } from './navigation-sub/navigation-sub.service'
import { NavigationParentControllerAttendance, NavigationParentControllerAttendanceUser } from './navigation-parent/navigation-parent.controller'
import { NavigationSubControllerAttendance } from './navigation-sub/navigation-sub.controller'
import { NavigationSubControllerAttendanceUser } from './navigation-sub/navigation-sub.controller'
@Module({
  imports: [TypeOrmModule.forFeature([NavigationParentAttendance, NavigationSubAttendance])],
  controllers: [
    NavigationParentControllerAttendance,
    NavigationParentControllerAttendanceUser,
    NavigationSubControllerAttendance,
    NavigationSubControllerAttendanceUser,
  ],
  providers: [NavigationParentAttendanceService, NavigationSubAttendanceService],
  exports: [NavigationParentAttendanceService, NavigationSubAttendanceService],
})
export class NavigationAttendanceModule {}
