import { Auth } from '@decorators/auth.decorator'
import { Body, Controller, Delete, Get, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ResponseDto } from 'src/common/response.dto'
import { DeleteHubFileDto } from './storage-hub.dto'
import { StorageHubService } from './storage-hub.service'

@Controller('storage-hub')
@Auth()
@ApiBearerAuth()
@ApiTags('Storage Hub')
export class StorageHubController {
  constructor(private readonly hubService: StorageHubService) {}

  @Get('session')
  @ApiOperation({ summary: 'Lấy hub token để trình duyệt duyệt/upload thẳng lên hvm-storage' })
  async getSession(@Req() req): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'STORAGE_HUB_SESSION_SUCCESS',
      data: await this.hubService.getSession(req.user),
    })
  }

  @Delete('files')
  @ApiOperation({ summary: 'Xoá file theo URL (tương đương admin/upload/delete-file)' })
  async deleteFile(@Body() dto: DeleteHubFileDto): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'DELETE_FILE_SUCCESS',
      data: { deleted: await this.hubService.deleteByUrl(dto.url) },
    })
  }
}
