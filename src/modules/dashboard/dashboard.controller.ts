import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { Controller, Get } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ResponseDto } from 'src/common/response.dto'
import { VisitorService } from '../visitor/visitor.service'
@ApiTags('Admin Dashboard')
@Controller('admin/dashboard')
@Auth(Role.ADMIN)
@ApiBearerAuth()
export class DashboardController {}

@Controller('dashboard')
export class DashboardControllerUser {
  constructor(private readonly visitorService: VisitorService) {}

  @Get('/analytics')
  async getDashboardData(): Promise<ResponseDto> {
    const currentOnline = await this.visitorService.countCurrentlyOnline()
    const today = await this.visitorService.countToday()
    const week = await this.visitorService.countThisWeek()
    const month = await this.visitorService.countThisMonth()
    const total = await this.visitorService.countTotal()
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'DASHBOARD_GET_DATA_SUCCESS',
      data: {
        currentOnline,
        today,
        week,
        month,
        total,
      },
    })
  }
}
