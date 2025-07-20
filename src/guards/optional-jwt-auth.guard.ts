import { Injectable, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(user) {
    // Không throw error nếu không có token → trả undefined
    return user || null
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest()
    const token = request.headers['authorization']
    if (token) {
      // Nếu có token → xử lý như bình thường
      return super.canActivate(context)
    }
    // Nếu không có token → cho qua luôn
    return true
  }
}
