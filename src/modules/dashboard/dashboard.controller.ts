import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { Body, Controller, Get, Put, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ResponseDto } from 'src/common/response.dto'
import { VisitorService } from '../visitor/visitor.service'
import { DashboardService } from './dashboard.service'
import { RevenueStatisticsDto, SemesterRevenueDto, TeacherRevenueDto } from './dtos/dashboard.dto'
import { UpdateTeacherSalaryDto } from './dtos/update.dto'

@Controller('dashboard')
export class DashboardControllerUser {
  constructor(
    private readonly visitorService: VisitorService,
    private readonly dashboardService: DashboardService,
  ) {}

  @Get('/student/age')
  @ApiOperation({ summary: 'Lấy thống kê tuổi học viên' })
  async studentAgeStatistics(): Promise<ResponseDto> {
    const studentAgeStatistics = await this.dashboardService.studentAgeStatistics()
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'DASHBOARD_GET_STUDENT_AGE_SUCCESS',
      data: studentAgeStatistics,
    })
  }

  @Get('/student')
  @ApiOperation({ summary: 'Lấy thống kê dân số học viên' })
  async studentStatistics(): Promise<ResponseDto> {
    const studentStatistics = await this.dashboardService.studentStatistics()
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'DASHBOARD_GET_STUDENT_SUCCESS',
      data: studentStatistics,
    })
  }

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

  @Get('/voucher')
  @ApiOperation({ summary: 'Lấy thống kê voucher' })
  @Auth(Role.ADMIN)
  @ApiBearerAuth()
  async voucherStatistics(): Promise<ResponseDto> {
    const voucher = await this.dashboardService.voucherStatistics()
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'DASHBOARD_GET_VOUCHER_SUCCESS',
      data: voucher,
    })
  }

  @Get('/class')
  @ApiOperation({ summary: 'Lấy thống kê lớp học' })
  @Auth(Role.ADMIN)
  @ApiBearerAuth()
  async classStatistics(): Promise<ResponseDto> {
    const classStatistics = await this.dashboardService.classStatistics()
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'DASHBOARD_GET_CLASS_SUCCESS',
      data: classStatistics,
    })
  }

  // @Get('/student')
  // @ApiOperation({ summary: 'Lấy thống kê sinh viên' })
  // @Auth(Role.ADMIN)
  // @ApiBearerAuth()
  // async graduateStudentStatistics(): Promise<ResponseDto> {
  //   const graduateStudentStatistics = await this.dashboardService.graduateStudentStatistics()
  //   return new ResponseDto({
  //     statusCode: 200,
  //     messageCode: 'DASHBOARD_GET_STUDENT_SUCCESS',
  //     data: graduateStudentStatistics,
  //   })
  // }

  @Get('/teacher')
  @ApiOperation({ summary: 'Lấy thống kê giáo viên' })
  @Auth(Role.ADMIN)
  @ApiBearerAuth()
  async teacherStatistics(): Promise<ResponseDto> {
    const teacherStatistics = await this.dashboardService.teacherStatistics()
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'DASHBOARD_GET_TEACHER_SUCCESS',
      data: teacherStatistics,
    })
  }
}

@Controller('revenue')
@Auth(Role.FINANCE, Role.ADMIN)
@ApiBearerAuth()
export class RevenueController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('/statistics')
  @ApiOperation({ summary: 'Lấy thống kê doanh thu theo học kỳ' })
  async semesterRevenue(@Query() semesterRevenueDto: SemesterRevenueDto): Promise<ResponseDto> {
    const semesterRevenue = await this.dashboardService.semesterRevenue2(semesterRevenueDto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'DASHBOARD_GET_SEMESTER_REVENUE_SUCCESS',
      data: semesterRevenue,
    })
  }

  @Get('/teacher')
  @ApiOperation({ summary: 'Lấy thống kê doanh thu theo giáo viên' })
  async teacherSalary(@Query() teacherRevenueDto: TeacherRevenueDto): Promise<ResponseDto> {
    const teacherSalary = await this.dashboardService.teacherSalary(teacherRevenueDto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'DASHBOARD_GET_TEACHER_SALARY_SUCCESS',
      data: teacherSalary,
    })
  }
  @Put('/teacher')
  @ApiOperation({ summary: 'chỉnh sửa lương giáo viên' })
  async updateTeacherSalary(@Body() updateTeacherSalaryDto: UpdateTeacherSalaryDto): Promise<ResponseDto> {
    await this.dashboardService.updateTeacherSalary(updateTeacherSalaryDto)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPDATE_TEACHER_SALARY_SUCCESS',
    })
  }
}
