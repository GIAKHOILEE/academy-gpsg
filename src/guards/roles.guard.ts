import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Role } from '../enums/role.enum'
import { ROLES_KEY } from '../decorators/roles.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [context.getHandler(), context.getClass()])

    // Không yêu cầu role cụ thể → cho qua
    if (!requiredRoles) {
      return true
    }

    const { user } = context.switchToHttp().getRequest()

    // SUPER_ADMIN luôn được phép truy cập
    if (user.role === Role.SUPER_ADMIN) {
      return true
    }

    const hasRole = requiredRoles.some(role => user.role === role)

    if (!hasRole) {
      throw new ForbiddenException('You are not authorized to access this resource.')
    }

    return true
  }
}
