import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { ICloudinary } from './cloudinary.provider'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

@Injectable()
export class CloudinaryService {
  constructor(@Inject('CLOUDINARY') private cloudinary: ICloudinary) {}
  private readonly storagePath = process.env.STORAGE_PATH
  private readonly env = process.env.NODE_ENV
  private readonly fileDomain = process.env.FILE_DOMAIN

  async uploadPdf(file: Express.Multer.File, subFolder: string = ''): Promise<string> {
    try {
      return new Promise((resolve, reject) => {
        const isPdf = file.mimetype === 'application/pdf'

        const folderPath = process.env.CLOUDINARY_FOLDER ? `${process.env.CLOUDINARY_FOLDER}/${subFolder}`.replace(/\/$/, '') : 'default_folder'

        let originalFilename = file.originalname.replace(/\.[^/.]+$/, '')
        if (isPdf) originalFilename += '.pdf'

        const publicId = `${folderPath}/${originalFilename}`

        this.cloudinary.uploader
          .upload_stream(
            {
              resource_type: 'raw',
              public_id: publicId,
              format: 'pdf',
              access_mode: 'public',
            },
            (error, result) => {
              if (error) {
                return reject(new BadRequestException(error.message))
              }
              resolve(result.secure_url)
            },
          )
          .end(file.buffer)
      })
    } catch (error) {
      throw new BadRequestException(error.message)
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    // production thì lưu storage path
    // dev thì lưu cloudinary
    if (this.env === 'production') {
      return this.uploadFileToStoragePath(file)
    } else {
      return this.uploadToCloudinary(file)
    }
  }

  async uploadMultipleFiles(files: Express.Multer.File[]) {
    const urls = await Promise.all(files.map(file => this.uploadFile(file)))
    return urls
  }

  async deleteFile(url: string) {
    console.log('Received URL:', url)
    console.log('Type of URL:', typeof url)
    if (this.env === 'production') {
      await this.deleteFileFromStoragePath(url)
    } else {
      await this.deleteFileFromCloudinary(url)
    }
  }

  /* ==================================================== 
  =================== PRIVATE METHODS =================== 
  ======================================================  */
  // upload file to storage path
  private async uploadFileToStoragePath(file: Express.Multer.File) {
    try {
      // tạo folder nếu chưa có
      if (!fs.existsSync(this.storagePath)) {
        fs.mkdirSync(this.storagePath, { recursive: true })
      }

      const ext = path.extname(file.originalname || '') || ''
      // Tên file generate từ timestamp
      const fileName = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`
      const filePath = path.join(this.storagePath, fileName)

      await fs.promises.writeFile(filePath, file.buffer)

      const fileUrl = `${this.fileDomain}/${fileName}`

      return fileUrl
    } catch (err: any) {
      throw new BadRequestException(err?.message || 'Upload file to storage path failed')
    }
  }

  // upload file to cloudinary
  private async uploadToCloudinary(file: Express.Multer.File): Promise<string> {
    try {
      return await new Promise((resolve, reject) => {
        this.cloudinary.uploader
          .upload_stream({ resource_type: 'auto', folder: process.env.CLOUDINARY_FOLDER }, (error: any, result: any) => {
            if (error) {
              return reject(new BadRequestException(error.message || 'Cloudinary upload error'))
            }
            resolve(result.secure_url)
          })
          .end(file.buffer)
      })
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Upload file to cloudinary failed')
    }
  }

  private async deleteFileFromCloudinary(url: string) {
    try {
      if (!url || typeof url !== 'string') {
        throw new BadRequestException(`URL must be a string, received: ${JSON.stringify(url)}`)
      }

      const matches = url.match(/\/upload\/v\d+\/([^\.]+)/)
      if (!matches) {
        throw new BadRequestException('Invalid Cloudinary URL')
      }

      const publicId = matches[1]
      console.log('Deleting:', publicId)

      return await this.cloudinary.uploader.destroy(publicId)
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Delete file from cloudinary failed')
    }
  }

  private async deleteFileFromStoragePath(url: string) {
    try {
      if (!url || typeof url !== 'string') {
        throw new BadRequestException(`URL must be a string, received: ${JSON.stringify(url)}`)
      }

      // URL kiểu: https://file.hvmv.edu.vn/1730135238382_a1b2c3d4.png
      const fileName = path.basename(url) // → "1730135238382_a1b2c3d4.png"
      const filePath = path.join(this.storagePath, fileName)

      // Kiểm tra tồn tại rồi mới xoá
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath)
        console.log('Deleted from storage:', filePath)
      } else {
        console.warn('File not found in storage:', filePath)
      }
    } catch (error: any) {
      throw new BadRequestException(error?.message || 'Delete file from storage path failed')
    }
  }
}
