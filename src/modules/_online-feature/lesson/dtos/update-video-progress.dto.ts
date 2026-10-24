import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator'

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
  @ApiPropertyOptional({ description: 'Số giây xem trong khoảng heartbeat vừa qua (giây)', example: 10 })
  watched_delta?: number
}
