import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class DeleteHubFileDto {
  @ApiProperty({ description: 'URL file đã lưu trong DB (link /f/..., /embed/... hoặc URL của dịch vụ cũ)' })
  @IsString()
  @IsNotEmpty()
  url: string
}
