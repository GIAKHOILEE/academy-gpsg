import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import { Body, Controller, Delete, Get, HttpStatus, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import { CreateStorageFolderDto, RenameStorageFolderDto } from '../dtos/storage-file.dto'
import { StorageFolderService } from '../services/storage-folder.service'

@ApiTags('Admin Storage Folders')
@ApiBearerAuth()
@Auth(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
@Controller('admin/storage/folders')
export class StorageFolderController {
  constructor(private readonly folderService: StorageFolderService) {}

  @Get('tree/:providerId')
  @ApiOperation({ summary: 'Cây thư mục của một dịch vụ, kèm số file và dung lượng từng thư mục' })
  async getTree(@Param('providerId', ParseIntPipe) providerId: number): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_FOLDER_TREE_FETCHED_SUCCESSFULLY',
      data: await this.folderService.getFolderTree(providerId),
    })
  }

  @Post()
  @ApiOperation({ summary: 'Tạo thư mục' })
  async createFolder(@Body() dto: CreateStorageFolderDto): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'STORAGE_FOLDER_CREATED_SUCCESSFULLY',
      data: await this.folderService.createFolder(dto),
    })
  }

  @Patch(':id/rename')
  @ApiOperation({
    summary: 'Đổi tên thư mục',
    description: 'Với dịch vụ dùng prefix (S3, Azure), toàn bộ file bên trong sẽ được di chuyển sang key mới.',
  })
  async renameFolder(@Param('id', ParseIntPipe) id: number, @Body() dto: RenameStorageFolderDto): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_FOLDER_UPDATED_SUCCESSFULLY',
      data: await this.folderService.renameFolder(id, dto),
    })
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xoá thư mục',
    description: 'Mặc định chỉ xoá được thư mục rỗng. Truyền force=true để xoá cả nội dung bên trong.',
  })
  @ApiQuery({ name: 'force', required: false, description: 'true = xoá cả file và thư mục con bên trong' })
  async deleteFolder(@Param('id', ParseIntPipe) id: number, @Query('force') force?: string): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_FOLDER_DELETED_SUCCESSFULLY',
      data: await this.folderService.deleteFolder(id, force === 'true'),
    })
  }
}
