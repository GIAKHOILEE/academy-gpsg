import { ApiPropertyOptional } from '@nestjs/swagger'
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsOptional, Max, Min, ValidateIf } from 'class-validator'
import { LearnType } from '@enums/class.enum'
import { IdleCheckMode, MultiVideoRule, VideoAttendanceMode } from '../video-attendance.logic'

/** Mọi trường đều tuỳ chọn: chỉ sửa trường được gửi, còn lại giữ nguyên. */
export class UpdateVideoAttendanceConfigDto {
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ description: 'Bật điểm danh qua video' })
  enabled?: boolean

  @IsOptional()
  @IsEnum(VideoAttendanceMode)
  @ApiPropertyOptional({ enum: VideoAttendanceMode, description: 'PERCENT: xem đủ X%; ANY_VIEW: có xem (tối thiểu N giây) là được' })
  mode?: VideoAttendanceMode

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @ApiPropertyOptional({ description: '% thời lượng phải xem thật (chế độ PERCENT)', example: 50 })
  required_percent?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(3600)
  @ApiPropertyOptional({ description: 'Số giây xem thật tối thiểu (chế độ ANY_VIEW)', example: 60 })
  min_view_seconds?: number

  @IsOptional()
  @IsEnum(MultiVideoRule)
  @ApiPropertyOptional({ enum: MultiVideoRule, description: 'Buổi nhiều video: ANY một video bất kỳ, ALL tất cả' })
  multi_video_rule?: MultiVideoRule

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ description: 'Chặn tua tới phần chưa xem' })
  block_seek_forward?: boolean

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  @ApiPropertyOptional({ description: 'Tốc độ phát tối đa còn được tính', example: 2 })
  max_playback_rate?: number

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ description: 'Tạm dừng & không tính khi rời tab' })
  pause_when_hidden?: boolean

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(3)
  @IsIn([LearnType.OFFLINE, LearnType.VIDEO, LearnType.MEETING], { each: true })
  @ApiPropertyOptional({ description: 'Hình thức học được điểm danh qua video (1 OFFLINE, 2 VIDEO, 3 MEETING)', example: [2, 3] })
  eligible_learn_types?: LearnType[]

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(0)
  @Max(365)
  @ApiPropertyOptional({ description: 'Xem sau ngày học quá N ngày thì ghi "Đi trễ"; null = luôn "Có mặt"', nullable: true })
  late_after_days?: number | null

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt()
  @Min(0)
  @Max(365)
  @ApiPropertyOptional({ description: 'Quá N ngày sau ngày học thì không điểm danh qua video nữa; null = không hạn', nullable: true })
  deadline_days?: number | null

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ description: 'Bật kiểm tra chống treo máy' })
  idle_check_enabled?: boolean

  @IsOptional()
  @IsEnum(IdleCheckMode)
  @ApiPropertyOptional({ enum: IdleCheckMode })
  idle_check_mode?: IdleCheckMode

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(180)
  @ApiPropertyOptional({ description: 'Cứ khoảng N phút xem thì hỏi một lần (±20%)', example: 10 })
  idle_check_interval_minutes?: number

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(900)
  @ApiPropertyOptional({ description: 'Thời gian trả lời (giây)', example: 60 })
  idle_check_timeout_seconds?: number

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @ApiPropertyOptional({ description: 'Số lần được trả lời', example: 2 })
  idle_check_max_attempts?: number

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ description: 'Trả lời sai/không kịp thì huỷ phần đã xem kể từ lần kiểm tra trước' })
  idle_check_discard_on_fail?: boolean
}
