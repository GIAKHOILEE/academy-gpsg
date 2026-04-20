import { HttpService } from '@nestjs/axios'
import { Injectable, Logger } from '@nestjs/common'
import { firstValueFrom } from 'rxjs'

export interface SyncStudentToLibraryDto {
  full_name: string
  code: string
  saint_name?: string
  password: string
  email?: string
  birth_date?: string
  phone?: string
  address?: string
  avatar?: string
}

@Injectable()
export class LibrarySyncService {
  private readonly logger = new Logger(LibrarySyncService.name)
  private readonly libraryApiUrl = process.env.LIBRARY_API_URL || 'https://api.thuvienttmvsg.com'
  private readonly apiKey = process.env.LIBRARY_EXTERNAL_API_KEY || ''

  constructor(private readonly httpService: HttpService) {}

  async syncStudentToLibrary(data: SyncStudentToLibraryDto): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.libraryApiUrl}/external/sync-student`, data, {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
          },
          timeout: 10000,
        }),
      )
      this.logger.log(`Synced student ${data.code} to library successfully: ${JSON.stringify(response.data)}`)
    } catch (error: any) {
      this.logger.error(`Failed to sync student ${data.code} to library: ${error.message}`)
      // Không throw error để không ảnh hưởng đến việc tạo student bên academy
    }
  }
}
