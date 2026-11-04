import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsBoolean, IsDefined, IsIn, IsInt, IsObject, IsOptional, Max, Min, ValidateIf, ValidateNested } from 'class-validator'
import { MEET_ACCESS_MODES, MEET_CHECK_MODES, MEET_POLICY_RANGES as R, MeetAccessMode, MeetCheckMode } from '../hvm-meet.policy'

/** Cách vào phòng HVM Meet của buổi học (đăng nhập học viện luôn được; mode chỉ mở thêm link /p/). */
export class MeetAccessPolicyDto {
  @ApiProperty({
    enum: MEET_ACCESS_MODES,
    description:
      'account = chỉ tài khoản học viện; account_or_code_birthdate = thêm link + mã học viên + ngày sinh; ' +
      'account_or_code = thêm link + mã học viên (kém an toàn); account_or_guest = thêm link cho khách nhập tên (không điểm danh)',
    example: 'account',
  })
  @IsIn(MEET_ACCESS_MODES as string[])
  mode: MeetAccessMode

  @ApiProperty({ description: 'Khách vào bằng link mở phải chờ duyệt (chỉ mode account_or_guest)', example: true })
  @IsBoolean()
  guest_waiting_room: boolean

  @ApiProperty({ description: 'Phòng chờ cho mọi người (chủ phòng / trợ giảng bỏ qua)', example: false })
  @IsBoolean()
  waiting_room: boolean

  @ApiProperty({
    description: 'Cho vào sớm trước giờ bắt đầu (phút)',
    minimum: R.join_early_minutes.min,
    maximum: R.join_early_minutes.max,
    example: 15,
  })
  @IsInt()
  @Min(R.join_early_minutes.min)
  @Max(R.join_early_minutes.max)
  join_early_minutes: number

  @ApiProperty({
    description: 'Không cho vào sau giờ kết thúc (phút), 0 = không giới hạn',
    minimum: R.join_cutoff_minutes.min,
    maximum: R.join_cutoff_minutes.max,
    example: 0,
  })
  @IsInt()
  @Min(R.join_cutoff_minutes.min)
  @Max(R.join_cutoff_minutes.max)
  join_cutoff_minutes: number

  @ApiProperty({ description: 'Cho cùng một người vào từ hai thiết bị', example: false })
  @IsBoolean()
  allow_two_devices: boolean
}

/** Điểm danh tự động của HVM Meet. */
export class MeetAttendancePolicyDto {
  @ApiProperty({ description: 'Tự điểm danh khi buổi học kết thúc', example: true })
  @IsBoolean()
  enabled: boolean

  @ApiProperty({ description: 'Có mặt tối thiểu (% thời lượng)', minimum: R.present_percent.min, maximum: R.present_percent.max, example: 70 })
  @IsInt()
  @Min(R.present_percent.min)
  @Max(R.present_percent.max)
  present_percent: number

  @ApiProperty({
    description: 'Vào sau bao nhiêu phút thì tính trễ',
    minimum: R.late_after_minutes.min,
    maximum: R.late_after_minutes.max,
    example: 10,
  })
  @IsInt()
  @Min(R.late_after_minutes.min)
  @Max(R.late_after_minutes.max)
  late_after_minutes: number

  @ApiProperty({
    description: 'Rớt mạng ngắn hơn (giây) vẫn tính là liên tục',
    minimum: R.grace_seconds.min,
    maximum: R.grace_seconds.max,
    example: 120,
  })
  @IsInt()
  @Min(R.grace_seconds.min)
  @Max(R.grace_seconds.max)
  grace_seconds: number

  @ApiProperty({
    description: 'Số lần hỏi điểm danh ngẫu nhiên giữa buổi',
    minimum: R.random_check_count.min,
    maximum: R.random_check_count.max,
    example: 0,
  })
  @IsInt()
  @Min(R.random_check_count.min)
  @Max(R.random_check_count.max)
  random_check_count: number

  @ApiProperty({ enum: MEET_CHECK_MODES, description: 'button = bấm xác nhận, code = nhập mã giảng viên đọc', example: 'button' })
  @IsIn(MEET_CHECK_MODES as string[])
  check_mode: MeetCheckMode

  @ApiProperty({
    description: 'Thời gian trả lời điểm danh giữa buổi (giây)',
    minimum: R.check_duration_seconds.min,
    maximum: R.check_duration_seconds.max,
    example: 60,
  })
  @IsInt()
  @Min(R.check_duration_seconds.min)
  @Max(R.check_duration_seconds.max)
  check_duration_seconds: number

  @ApiProperty({
    description: 'Phải trả lời đủ (% số lần điểm danh giữa buổi), 0 = không bắt buộc',
    minimum: R.min_checks_percent.min,
    maximum: R.min_checks_percent.max,
    example: 0,
  })
  @IsInt()
  @Min(R.min_checks_percent.min)
  @Max(R.min_checks_percent.max)
  min_checks_percent: number
}

/** Mặc định chung: đủ cả hai phần. */
export class HvmMeetRoomPolicyDto {
  @ApiProperty({ type: MeetAccessPolicyDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => MeetAccessPolicyDto)
  access: MeetAccessPolicyDto

  @ApiProperty({ type: MeetAttendancePolicyDto })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => MeetAttendancePolicyDto)
  attendance: MeetAttendancePolicyDto
}

/** PUT /admin/hvm-meet/room-policy. `policy: null` = khôi phục mặc định (meet dùng giá trị kế thừa). */
export class UpdateHvmMeetRoomPolicyDto {
  @ApiProperty({ type: HvmMeetRoomPolicyDto, nullable: true, description: 'null = khôi phục mặc định' })
  // Bắt buộc có key `policy` (thiếu = 400) để body rỗng do lỗi không vô tình xoá cấu hình
  @ValidateIf((_, value) => value !== null)
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => HvmMeetRoomPolicyDto)
  policy: HvmMeetRoomPolicyDto | null
}

/** Ghi đè theo buổi học, từng phần. null / thiếu = theo cấu hình chung. */
export class LessonMeetPolicyDto {
  @ApiPropertyOptional({ type: MeetAccessPolicyDto, nullable: true, description: 'null = theo cấu hình chung' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => MeetAccessPolicyDto)
  access?: MeetAccessPolicyDto | null

  @ApiPropertyOptional({ type: MeetAttendancePolicyDto, nullable: true, description: 'null = theo cấu hình chung' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => MeetAttendancePolicyDto)
  attendance?: MeetAttendancePolicyDto | null
}

/** POST /lessons/:id/meeting/public-link */
export class PublicLinkRequestDto {
  @ApiPropertyOptional({ description: 'true = đổi link (link cũ chết ngay). Chỉ admin / giáo vụ.', example: false })
  @IsOptional()
  @IsBoolean()
  rotate?: boolean
}
