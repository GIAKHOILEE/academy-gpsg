import { ResponseDto } from '@common/response.dto'
import { Auth } from '@decorators/auth.decorator'
import { Role } from '@enums/role.enum'
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'
import {
  BulkDeleteStorageFileDto,
  MoveStorageFileDto,
  PaginateStorageFileDto,
  RenameStorageFileDto,
  ScanStorageProviderDto,
  UploadStorageFileDto,
} from '../dtos/storage-file.dto'
import { StorageFileService } from '../services/storage-file.service'

@ApiTags('Admin Storage Files')
@ApiBearerAuth()
@Auth(Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF)
@Controller('admin/storage/files')
export class StorageFileController {
  constructor(private readonly fileService: StorageFileService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách file đang được quản lý' })
  async getFiles(@Query() params: PaginateStorageFileDto): Promise<ResponseDto> {
    const result = await this.fileService.paginateFiles(params)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_FILES_FETCHED_SUCCESSFULLY',
      data: result.data,
      meta: result.meta,
    })
  }

  @Post('upload')
  @ApiOperation({
    summary: 'Upload 1 file',
    description: 'Không truyền provider_id thì hệ thống tự chọn dịch vụ theo chiến lược chia tải đang cấu hình.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        provider_id: { type: 'number' },
        folder_id: { type: 'number' },
      },
      required: ['file'],
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Body() dto: UploadStorageFileDto, @Req() req): Promise<ResponseDto> {
    if (!file) throw new BadRequestException('Chưa chọn file nào')

    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'STORAGE_FILE_UPLOADED_SUCCESSFULLY',
      data: await this.fileService.upload(file, dto, req.user?.userId),
    })
  }

  @Post('upload-multiple')
  @ApiOperation({
    summary: 'Upload nhiều file',
    description: 'File lỗi được báo riêng trong "errors", các file còn lại vẫn upload bình thường.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
        provider_id: { type: 'number' },
        folder_id: { type: 'number' },
      },
      required: ['files'],
    },
  })
  @UseInterceptors(FilesInterceptor('files', 100))
  async uploadFiles(@UploadedFiles() files: Express.Multer.File[], @Body() dto: UploadStorageFileDto, @Req() req): Promise<ResponseDto> {
    if (!files?.length) throw new BadRequestException('Chưa chọn file nào')

    return new ResponseDto({
      statusCode: HttpStatus.CREATED,
      messageCode: 'STORAGE_FILES_UPLOADED_SUCCESSFULLY',
      data: await this.fileService.uploadMany(files, dto, req.user?.userId),
    })
  }

  @Post('scan/:providerId')
  @ApiOperation({
    summary: 'Quét file có sẵn trên dịch vụ vào danh mục',
    description: 'Dùng cho file được upload trước khi có tính năng này. Quét xong mới quản lý được chúng và mới tra được file nào đang dùng ở đâu.',
  })
  async scanProvider(@Param('providerId', ParseIntPipe) providerId: number, @Body() dto: ScanStorageProviderDto): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_PROVIDER_SCANNED_SUCCESSFULLY',
      data: await this.fileService.scanProvider(providerId, dto),
    })
  }

  @Delete('bulk')
  @ApiOperation({
    summary: 'Xoá nhiều file',
    description: 'Mặc định bỏ qua file đang được dùng ở đâu đó. Truyền force = true để xoá bất chấp.',
  })
  async bulkDelete(@Body() dto: BulkDeleteStorageFileDto): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_FILES_DELETED_SUCCESSFULLY',
      data: await this.fileService.bulkDelete(dto),
    })
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết một file' })
  async getFile(@Param('id', ParseIntPipe) id: number): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_FILE_FETCHED_SUCCESSFULLY',
      data: await this.fileService.getFileById(id),
    })
  }

  @Get(':id/references')
  @ApiOperation({
    summary: 'File này đang được dùng ở đâu',
    description:
      'Tra ngược toàn bộ DB trên các cột có khả năng chứa đường dẫn file. Khớp theo cả URL đầy đủ và tên file, nên vẫn tìm ra khi URL đã đổi domain.',
  })
  async getReferences(@Param('id', ParseIntPipe) id: number): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_FILE_REFERENCES_FETCHED_SUCCESSFULLY',
      data: await this.fileService.getFileReferences(id),
    })
  }

  @Get(':id/signed-url')
  @ApiOperation({ summary: 'Link tải tạm thời, cho file nằm trên bucket không công khai' })
  @ApiQuery({ name: 'expires_in', required: false, description: 'Số giây link còn hiệu lực, mặc định 3600' })
  async getSignedUrl(@Param('id', ParseIntPipe) id: number, @Query('expires_in') expiresIn?: string): Promise<ResponseDto> {
    const seconds = Math.min(Math.max(Number(expiresIn) || 3600, 60), 7 * 24 * 3600)
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_SIGNED_URL_CREATED_SUCCESSFULLY',
      data: await this.fileService.getSignedUrl(id, seconds),
    })
  }

  @Patch(':id/rename')
  @ApiOperation({ summary: 'Đổi tên file' })
  async renameFile(@Param('id', ParseIntPipe) id: number, @Body() dto: RenameStorageFileDto): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_FILE_UPDATED_SUCCESSFULLY',
      data: await this.fileService.renameFile(id, dto),
    })
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Di chuyển file sang thư mục khác trong cùng dịch vụ' })
  async moveFile(@Param('id', ParseIntPipe) id: number, @Body() dto: MoveStorageFileDto): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_FILE_UPDATED_SUCCESSFULLY',
      data: await this.fileService.moveFile(id, dto),
    })
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xoá file',
    description: 'Bị chặn nếu file đang được dùng ở đâu đó, trừ khi truyền force=true.',
  })
  @ApiQuery({ name: 'force', required: false, description: 'true = xoá cả khi file đang được dùng' })
  async deleteFile(@Param('id', ParseIntPipe) id: number, @Query('force') force?: string): Promise<ResponseDto> {
    return new ResponseDto({
      statusCode: HttpStatus.OK,
      messageCode: 'STORAGE_FILE_DELETED_SUCCESSFULLY',
      data: await this.fileService.deleteFile(id, force === 'true'),
    })
  }
}
