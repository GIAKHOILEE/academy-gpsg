import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { ICloudinary } from './cloudinary.provider'
@Injectable()
export class CloudinaryService {
  constructor(@Inject('CLOUDINARY') private cloudinary: ICloudinary) {}

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
    try {
      return new Promise((resolve, reject) => {
        this.cloudinary.uploader
          .upload_stream({ resource_type: 'auto', folder: process.env.CLOUDINARY_FOLDER }, (error, result) => {
            if (error) {
              return reject(new BadRequestException(error.message))
            }
            resolve(result.secure_url)
          })
          .end(file.buffer)
      })
    } catch (error) {
      throw new BadRequestException(error.message)
    }
  }

  async uploadMultipleFiles(files: Express.Multer.File[]) {
    const urls = await Promise.all(files.map(file => this.uploadFile(file)))
    return urls
  }

  async deleteFile(url: string) {
    try {
      console.log('Received URL:', url)
      console.log('Type of URL:', typeof url)

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
    } catch (error) {
      throw new BadRequestException(error.message)
    }
  }
}
