import { StorageService } from '@modules/storage/services/storage.service'
import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common'
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { ICloudinary } from './cloudinary.provider'

/**
 * Cửa upload file dùng chung của toàn hệ thống.
 *
 * Từ khi có module quản lý lưu trữ, service này chỉ còn là lớp chuyển tiếp: nó
 * đẩy việc cho StorageService để file mới được ghi vào danh mục, được chia tải
 * giữa các dịch vụ đang bật, và quản lý được trên trang admin.
 *
 * Toàn bộ phương thức cũ (uploadFile, uploadFileV2, deleteFileV2...) được giữ
 * nguyên tên và nguyên kiểu trả về, nên hơn 40 module đang gọi không phải sửa gì.
 *
 * Khi chưa cấu hình dịch vụ nào trong DB, service tự dùng lại đường cũ qua biến
 * môi trường - nhờ vậy bật tính năng này lên không gây gián đoạn.
 */
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name)

  private readonly storagePath = process.env.STORAGE_PATH
  private readonly env = process.env.NODE_ENV
  private readonly fileDomain = process.env.FILE_DOMAIN

  constructor(
    @Inject('CLOUDINARY') private cloudinary: ICloudinary,
    private readonly storageService: StorageService,
  ) {}

  /** Khởi tạo lười: chỉ dựng S3 client khi thật sự phải chạy đường cũ. */
  private legacyS3Client: S3Client | null = null

  private getLegacyS3Client(): S3Client {
    if (!this.legacyS3Client) {
      this.legacyS3Client = new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
      })
    }
    return this.legacyS3Client
  }

  /* ==================== API dùng chung ==================== */

  async uploadFile(file: Express.Multer.File): Promise<string> {
    return this.uploadFileV2(file)
  }

  async uploadPdf(file: Express.Multer.File, subFolder: string = ''): Promise<string> {
    return this.uploadPdfV2(file, subFolder)
  }

  async uploadMultipleFiles(files: Express.Multer.File[]): Promise<string[]> {
    return this.uploadMultipleFilesV2(files)
  }

  async deleteFile(url: string): Promise<void> {
    return this.deleteFileV2(url)
  }

  async uploadFileV2(file: Express.Multer.File): Promise<string> {
    if (await this.storageService.isReady()) {
      return this.storageService.uploadAndGetUrl(file)
    }
    return this.legacyUpload(file)
  }

  async uploadPdfV2(file: Express.Multer.File, subFolder: string = ''): Promise<string> {
    if (await this.storageService.isReady()) {
      return this.storageService.uploadAndGetUrl(file, subFolder || undefined)
    }
    return this.legacyUpload(file, subFolder)
  }

  async uploadMultipleFilesV2(files: Express.Multer.File[]): Promise<string[]> {
    if (await this.storageService.isReady()) {
      return this.storageService.uploadManyAndGetUrls(files)
    }
    return Promise.all(files.map(file => this.legacyUpload(file)))
  }

  async deleteFileV2(url: string): Promise<void> {
    if (!url || typeof url !== 'string') {
      throw new BadRequestException(`URL phải là chuỗi, nhận được: ${JSON.stringify(url)}`)
    }

    if (await this.storageService.isReady()) {
      await this.storageService.deleteByUrl(url)
      return
    }
    await this.legacyDelete(url)
  }

  /* ==================== Đường cũ theo biến môi trường ====================
   * Chỉ chạy khi chưa cấu hình dịch vụ lưu trữ nào trong DB. Giữ lại để lần
   * deploy đầu tiên (trước khi seeder kịp chạy, hoặc khi mọi dịch vụ bị tắt)
   * việc upload vẫn hoạt động đúng như trước.
   * ===================================================================== */

  private async legacyUpload(file: Express.Multer.File, subFolder = ''): Promise<string> {
    if (process.env.R2_BUCKET_NAME && process.env.R2_ENDPOINT) {
      return this.legacyUploadToR2(file, subFolder)
    }
    if (this.env === 'production' && this.storagePath) {
      return this.legacyUploadToDisk(file)
    }
    return this.legacyUploadToCloudinary(file)
  }

  private async legacyUploadToR2(file: Express.Multer.File, subFolder = ''): Promise<string> {
    try {
      const extension = path.extname(file.originalname || '') || ''
      const fileName = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}${extension}`
      const objectKey = subFolder ? `${subFolder}/${fileName}` : fileName

      await this.getLegacyS3Client().send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: objectKey,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      )

      return `${process.env.R2_PUBLIC_URL}/${objectKey}`
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Upload file lên R2 thất bại')
    }
  }

  private async legacyUploadToDisk(file: Express.Multer.File): Promise<string> {
    try {
      await fs.promises.mkdir(this.storagePath, { recursive: true })

      const extension = path.extname(file.originalname || '') || ''
      const fileName = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}${extension}`
      await fs.promises.writeFile(path.join(this.storagePath, fileName), file.buffer)

      return `${this.fileDomain}/${fileName}`
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Upload file vào ổ đĩa thất bại')
    }
  }

  private async legacyUploadToCloudinary(file: Express.Multer.File): Promise<string> {
    return new Promise((resolve, reject) => {
      this.cloudinary.uploader
        .upload_stream({ resource_type: 'auto', folder: process.env.CLOUDINARY_FOLDER }, (error: any, result: any) => {
          if (error) return reject(new BadRequestException(error.message || 'Cloudinary upload error'))
          resolve(result.secure_url)
        })
        .end(file.buffer)
    })
  }

  private async legacyDelete(url: string): Promise<void> {
    try {
      // Cloudinary nhận ra qua dạng URL /upload/v<version>/<public_id>
      const cloudinaryMatch = url.match(/\/upload\/v\d+\/([^.]+)/)
      if (cloudinaryMatch) {
        await this.cloudinary.uploader.destroy(cloudinaryMatch[1])
        return
      }

      if (process.env.R2_PUBLIC_URL && url.startsWith(process.env.R2_PUBLIC_URL)) {
        const objectKey = decodeURIComponent(url.slice(process.env.R2_PUBLIC_URL.replace(/\/+$/, '').length + 1))
        await this.getLegacyS3Client().send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: objectKey }))
        return
      }

      if (this.storagePath) {
        const filePath = path.join(this.storagePath, path.basename(url))
        await fs.promises.rm(filePath, { force: true })
        return
      }

      this.logger.warn(`Không xác định được nơi lưu file để xoá: ${url}`)
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Xoá file thất bại')
    }
  }
}
