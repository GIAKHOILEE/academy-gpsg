import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { NavigationParent } from './navigation-parent/navigation-parent.entity'
import { NavigationSub } from './navigation-sub/navigation-sub.entity'
import { NavigationParentService } from './navigation-parent/navigation-parent.service'
import { NavigationSubService } from './navigation-sub/navigation-sub.service'
import {
  NavigationParentController,
  NavigationParentControllerUser,
} from './navigation-parent/navigation-parent.controller'
import { NavigationSubController } from './navigation-sub/navigation-sub.controller'
import { NavigationSubControllerUser } from './navigation-sub/navigation-sub.controller'
@Module({
  imports: [TypeOrmModule.forFeature([NavigationParent, NavigationSub])],
  controllers: [
    NavigationParentController,
    NavigationParentControllerUser,
    NavigationSubController,
    NavigationSubControllerUser,
  ],
  providers: [NavigationParentService, NavigationSubService],
  exports: [NavigationParentService, NavigationSubService],
})
export class NavigationModule {}
