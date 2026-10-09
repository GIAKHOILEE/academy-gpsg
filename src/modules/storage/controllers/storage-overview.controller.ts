import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { Controller, Get, HttpStatus } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { StorageReferenceService } from '../services/storage-reference.service'
import { StorageUsageService } from '../services/storage-usage.service'

@ApiTags('Admin Storage Overview')
@ApiBearerAuth()
@Auth(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
@Controller('admin/storage')
export class StorageOverviewController {
  constructor(
    private readonly usageService: StorageUsageService,
    private readonly referenceService: StorageReferenceService,
  ) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Tổng quan dung lượng toàn hệ thống',
    description: 'Đọc từ số liệu đã cache nên trả về nhanh. Muốn số liệu mới nhất thì gọi POST /admin/storage/providers/refresh-usage trước.',
  })
  async getOverview(): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_OVERVIEW_FETCHED_SUCCESSFULLY',
      data: await this.usageService.getOverview(),
    })
  }

  @Get('scanned-columns')
  @ApiOperation({
    summary: 'Các cột trong DB đang được tra ngược khi tìm "file dùng ở đâu"',
    description: 'Danh sách này được tự dò từ metadata nên luôn khớp với schema hiện tại.',
  })
  async getScannedColumns(): Promise<ResponseDto> {
    const columns = this.referenceService.getScannedColumns()
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_SCANNED_COLUMNS_FETCHED_SUCCESSFULLY',
      data: { total: columns.length, columns },
    })
  }
}
