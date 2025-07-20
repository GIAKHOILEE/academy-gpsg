import { Role } from '@/enums/role.enum'
import { JwtAuthGuard } from '@/guards/jwt-auth.guard'
import { RolesGuard } from '@/guards/roles.guard'
import { applyDecorators, UseGuards } from '@nestjs/common'
import { Roles } from './roles.decorator'
export function Auth(...roles: Role[]) {
  return applyDecorators(UseGuards(JwtAuthGuard, RolesGuard), Roles(...roles))
}
