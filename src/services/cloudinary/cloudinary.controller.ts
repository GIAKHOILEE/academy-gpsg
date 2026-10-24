import { Auth } from '@decorators/auth.decorator'
import { BadRequestException, Body, Controller, Delete, Post, Req, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ResponseDto } from 'src/common/response.dto'
import { CloudinaryService } from '../cloudinary/cloudinary.service'
import { UploadGuardService } from './upload-guard.service'
import { MAX_FILES_PER_BATCH_ADMIN, MULTER_MAX_FILE_SIZE } from './upload-limits'

/**
 * Endpoint upload dùng chung của toàn hệ thống (hvm-home gọi vào đây).
 *
 * Thứ tự kiểm tra mỗi lần upload: kích thước theo vai trò -> tần suất theo người
 * dùng -> trùng nội dung (trả URL cũ) -> upload thật -> ghi nhận. Multer chỉ chặn
 * trần tuyệt đối; mức theo vai trò kiểm tra ở UploadGuardService vì lúc multer chạy
 * chưa biết vai trò.
 */
@Controller('admin/upload')
@Auth()
@ApiBearerAuth()
@ApiTags('Upload')
export class UploadController {
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly guard: UploadGuardService,
  ) {}

  // Upload 1 file
  @Post()
  @ApiOperation({ summary: 'Upload 1 file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MULTER_MAX_FILE_SIZE } }))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Req() req): Promise<ResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded')
    }
    const response = await this.uploadOne(req.user, file, f => this.cloudinaryService.uploadFileV2(f))
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPLOAD_FILE_SUCCESS',
      data: response,
    })
  }

  // Upload pdf
  @Post('pdf')
  @ApiOperation({ summary: 'Upload pdf' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MULTER_MAX_FILE_SIZE } }))
  async uploadPdf(@UploadedFile() file: Express.Multer.File, @Req() req): Promise<ResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded')
    }
    const response = await this.uploadOne(req.user, file, f => this.cloudinaryService.uploadPdfV2(f, 'pdf'))
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPLOAD_PDF_SUCCESS',
      data: response,
    })
  }

  // upload multiple file
  @Post('multiple')
  @ApiOperation({ summary: 'Upload multiple file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', MAX_FILES_PER_BATCH_ADMIN, { limits: { fileSize: MULTER_MAX_FILE_SIZE } }))
  async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[], @Req() req) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded')
    }
    const actor = req.user

    // Số file / kích thước theo vai trò, rồi tần suất - tính cả lô này
    this.guard.assertSizes(actor, files)
    this.guard.assertRate(actor, files)

    // File nào vừa gửi rồi thì dùng lại URL cũ, chỉ upload phần còn lại
    const hashes = files.map(file => this.guard.hashOf(file))
    const urls: string[] = new Array(files.length)
    const pendingIndexes: number[] = []
    for (let index = 0; index < files.length; index++) {
      const previous = this.guard.findDuplicate(actor, hashes[index])
      if (previous) urls[index] = previous
      else pendingIndexes.push(index)
    }

    if (pendingIndexes.length) {
      const uploaded = await this.cloudinaryService.uploadMultipleFilesV2(pendingIndexes.map(index => files[index]))
      pendingIndexes.forEach((index, position) => {
        urls[index] = uploaded[position]
        this.guard.remember(actor, hashes[index], uploaded[position])
      })
      this.guard.record(
        actor,
        pendingIndexes.map(index => files[index]),
      )
    }

    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPLOAD_MULTIPLE_FILES_SUCCESS',
      data: urls,
    })
  }

  // delete file
  @Delete('delete-file')
  @ApiOperation({ summary: 'Xóa file' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { url: { type: 'string' } },
    },
  })
  async deleteFileHandler(@Body() body: { url: string }): Promise<ResponseDto> {
    if (!body.url || typeof body.url !== 'string') {
      throw new BadRequestException('URL must be a string')
    }
    const response = await this.cloudinaryService.deleteFileV2(body.url)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'DELETE_FILE_SUCCESS',
      data: response,
    })
  }

  /* ------------------------------ private ------------------------------ */

  /** Chuỗi kiểm tra chung cho upload 1 file; `doUpload` là lệnh upload thật. */
  private async uploadOne(actor: any, file: Express.Multer.File, doUpload: (file: Express.Multer.File) => Promise<string>): Promise<string> {
    this.guard.assertSizes(actor, [file])
    this.guard.assertRate(actor, [file])

    const hash = this.guard.hashOf(file)
    const previous = this.guard.findDuplicate(actor, hash)
    if (previous) return previous

    const url = await doUpload(file)
    this.guard.remember(actor, hash, url)
    this.guard.record(actor, [file])
    return url
  }
}
