import { Body, Controller, HttpStatus, Post } from '@nestjs/common'
import { AnnouncementStationService } from './announcement-station.service'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { AnnouncementDto } from './dtos/announcement.dto'
import { ResponseDto } from '@common/response.dto'

@Controller('admin/announcement-station')
@ApiTags('Admin Announcement Station')
@ApiBearerAuth()
@Auth(Role.ADMIN, Role.STAFF)
export class AdminAnnouncementStationController {
  constructor(private readonly announcementStationService: AnnouncementStationService) {}

  @Post('send-mail')
  @ApiOperation({ summary: 'Send mail' })
  async sendAnnouncement(@Body() announcementDto: AnnouncementDto): Promise<ResponseDto> {
    await this.announcementStationService.sendAnnouncement(announcementDto)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'ANNOUNCEMENT_SENT_SUCCESSFULLY',
    })
  }
}
