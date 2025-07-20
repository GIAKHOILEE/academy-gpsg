// cloudinary-response.ts
import { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary'

export type uploadResponse = {
  secure_url: string
}
export type CloudinaryResponse = UploadApiResponse | UploadApiErrorResponse | uploadResponse
