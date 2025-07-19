import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ResponseDto } from 'src/common/response.dto'
import { VisitorService } from '../visitor/visitor.service'
import { DashboardService } from './dashboard.service'
import { RevenueStatisticsDto } from './dtos/dashboard.dto'
@ApiTags('Admin Dashboard')
@Controller('admin/dashboard')
@Auth(Role.ADMIN)
@ApiBearerAuth()
export class DashboardController {}

@Controller('dashboard')
export class DashboardControllerUser {
  constructor(
    private readonly visitorService: VisitorService,
    private readonly dashboardService: DashboardService,
  ) {}

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

  @Get('/revenue')
  @ApiOperation({ summary: 'Lấy thống kê doanh thu' })
  @Auth(Role.ADMIN)
  @ApiBearerAuth()
  async revenueStatistics(@Query() revenueStatisticsDto: RevenueStatisticsDto): Promise<ResponseDto> {
    const revenue = await this.dashboardService.revenueStatistics(revenueStatisticsDto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'DASHBOARD_GET_REVENUE_SUCCESS',
      data: revenue,
    })
  }
}
