import { Auth } from '@decorators/auth.decorator'
import { BadRequestException, Body, Controller, Delete, Post, UploadedFile, UploadedFiles, UseInterceptors } from '@nestjs/common'
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ResponseDto } from 'src/common/response.dto'
import { CloudinaryService } from '../cloudinary/cloudinary.service'
@Controller('admin/upload')
@Auth()
@ApiBearerAuth()
@ApiTags('Upload')
export class UploadController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

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
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<ResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded')
    }
    const response = await this.cloudinaryService.uploadFile(file)
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
  @UseInterceptors(FileInterceptor('file'))
  async uploadPdf(@UploadedFile() file: Express.Multer.File): Promise<ResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded')
    }
    const response = await this.cloudinaryService.uploadPdf(file, 'pdf')
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
  @UseInterceptors(FilesInterceptor('files', 100))
  async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded')
    }
    const response = await this.cloudinaryService.uploadMultipleFiles(files)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'UPLOAD_MULTIPLE_FILES_SUCCESS',
      data: response,
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
    const response = await this.cloudinaryService.deleteFile(body.url)
    return new ResponseDto({
      statusCode: 200,
      messageCode: 'DELETE_FILE_SUCCESS',
      data: response,
    })
  }
}
