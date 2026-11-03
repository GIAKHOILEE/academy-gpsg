import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { Body, Controller, Get, HttpStatus, Param, ParseIntPipe, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'
import { AnnouncementStationService } from './announcement-station.service'
import { AnnouncementDto } from './dtos/announcement.dto'
import { PaginateAnnouncementStationDto } from './dtos/paginate-announcement-station.dto'

@Controller('admin/announcement-station')
@ApiTags('Admin Announcement Station')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
export class AdminAnnouncementStationController {
  constructor(private readonly announcementStationService: AnnouncementStationService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách thông báo tại trạm thông báo (có phân trang và bộ lọc theo type, status, role, ...)' })
  async getAnnouncements(@Query() paginateDto: PaginateAnnouncementStationDto): Promise<ResponseDto> {
    const result = await this.announcementStationService.getAnnouncements(paginateDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'ANNOUNCEMENTS_FETCHED_SUCCESSFULLY',
      data: result.data,
      meta: result.meta,
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một thông báo tại trạm thông báo theo ID' })
  @ApiParam({ name: 'id', type: Number })
  async getAnnouncementById(@Param('id', ParseIntPipe) id: number): Promise<ResponseDto> {
    const announcement = await this.announcementStationService.getAnnouncementById(id)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'ANNOUNCEMENT_FETCHED_SUCCESSFULLY',
      data: announcement,
    })
  }

  @Post('send-mail')
  @ApiOperation({ summary: 'Send mail / SMS announcement' })
  async sendAnnouncement(@Body() announcementDto: AnnouncementDto): Promise<ResponseDto> {
    await this.announcementStationService.sendAnnouncement(announcementDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'ANNOUNCEMENT_SENT_SUCCESSFULLY',
    })
  }
}
