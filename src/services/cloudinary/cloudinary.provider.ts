import { v2 as cloudinary } from 'cloudinary'
import { Provider } from '@nestjs/common'

export interface ICloudinary {
  uploader: typeof cloudinary.uploader
}

export const CloudinaryProvider: Provider = {
  provide: 'CLOUDINARY',
  useFactory: (): ICloudinary => {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })
    return cloudinary as ICloudinary
  },
}
