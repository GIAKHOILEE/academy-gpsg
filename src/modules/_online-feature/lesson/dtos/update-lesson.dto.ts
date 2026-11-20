import { Type } from 'class-transformer'
import { LessonMeetPolicyDto } from '@modules/hvm-meet/dtos/hvm-meet-room-policy.dto'
import { IsArray, IsEnum, IsObject, ValidateNested, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator'
import { MeetingProvider } from '@enums/meeting.enum'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IFile } from '@common/file'

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Tiêu đề của bài học',
    example: 'Bài học 1',
  })
  title?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Ngày bắt đầu học',
    example: '01/01/2025',
  })
  start_date?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Thời gian học',
    example: '10:00',
  })
  schedule?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Thời gian bắt đầu',
    example: '10:00',
  })
  start_time?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Thời gian kết thúc',
    example: '10:00',
  })
  end_time?: string

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Mô tả của bài học',
    example: 'Mô tả bài học 1',
  })
  description?: string

  @IsOptional()
  @IsArray()
  @ApiPropertyOptional({
    description: 'URL của video',
    example: ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'],
  })
  video_url?: string[]

  @IsOptional()
  @IsArray()
  @ApiPropertyOptional({
    description: 'URL của slide',
    example: [
      { id: 1, name: 'slide1.pdf', path: 'https://www.google.com' },
      { id: 2, name: 'slide2.pdf', path: 'https://www.google.com' },
    ],
  })
  slide_url?: IFile[]

  @IsOptional()
  @IsArray()
  @ApiPropertyOptional({
    description: 'URL của tài liệu',
    example: [
      { id: 1, name: 'document1.pdf', path: 'https://www.google.com' },
      { id: 2, name: 'document2.pdf', path: 'https://www.google.com' },
    ],
  })
  document_url?: IFile[]

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'URL của cuộc họp',
    example: 'https://www.google.com',
  })
  meeting_url?: string

  @IsOptional()
  @IsEnum(MeetingProvider)
  @ApiPropertyOptional({
    description: 'Phòng học của buổi: external = link ngoài (meeting_url), hvm_meet = phòng HVM Meet tích hợp',
    enum: MeetingProvider,
    example: MeetingProvider.EXTERNAL,
  })
  meeting_provider?: MeetingProvider

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional({
    description: 'ID buổi điểm danh liên kết (attendance_rule_id)',
    example: 1,
  })
  attendance_rule_id?: number

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @ApiPropertyOptional({
    description: 'Tỷ lệ % thời lượng xem video tối thiểu để được tính điểm danh (mặc định 50%)',
    example: 50,
  })
  attendance_percent?: number

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => LessonMeetPolicyDto)
  @ApiPropertyOptional({
    type: LessonMeetPolicyDto,
    nullable: true,
    description:
      'Chỉ cho buổi HVM Meet: ghi đè cách vào phòng / điểm danh tự động cho riêng buổi này (từng phần, null = theo cấu hình chung). ' +
      'Không gửi = giữ nguyên; null = bỏ cả hai phần ghi đè.',
  })
  meet_policy?: LessonMeetPolicyDto | null
}
