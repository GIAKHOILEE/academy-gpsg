import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ArrayMaxSize, IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class UpdateVideoProgressDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @ApiProperty({ description: 'Vị trí hiện tại của video (giây)', example: 125.5 })
  current_time: number

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  @ApiProperty({ description: 'Tổng thời lượng video (giây)', example: 600 })
  duration: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  @ApiPropertyOptional({ description: '(Client cũ) Số giây xem trong nhịp vừa qua — client mới gửi `ranges`', example: 10 })
  watched_delta?: number

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @ApiPropertyOptional({ description: 'Link video đang xem (buổi có nhiều video tính riêng từng video)' })
  video_url?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @ApiPropertyOptional({ description: 'Các đoạn [bắt đầu, kết thúc] (giây) đã phát thật kể từ nhịp trước', example: [[120, 130]] })
  ranges?: [number, number][]

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(16)
  @ApiPropertyOptional({ description: 'Tốc độ phát hiện tại', example: 1 })
  playback_rate?: number

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ description: 'Video vừa phát hết' })
  ended?: boolean
}

export class GetVideoProgressDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @ApiPropertyOptional({ description: 'Link video đang xem' })
  video_url?: string
}

export class AnswerVideoCheckDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(64)
  @ApiProperty({ description: 'id bài kiểm tra server đã phát' })
  check_id: string

  @IsOptional()
  @ApiPropertyOptional({ description: 'Chỉ số đáp án (trắc nghiệm) hoặc chuỗi (tự luận); bỏ trống với kiểu xác nhận' })
  answer?: string | number

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @ApiPropertyOptional({ description: 'Link video đang xem' })
  video_url?: string
}
