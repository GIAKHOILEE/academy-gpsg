import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsBoolean, IsOptional, IsString, Matches, MaxLength } from 'class-validator'

export class UpdateHvmMeetSettingDto {
  @ApiPropertyOptional({ description: 'Địa chỉ HVM Meet, ví dụ https://meet.hvmvsaigon.edu.vn', example: 'https://meet.hvmvsaigon.edu.vn' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  base_url?: string

  @ApiPropertyOptional({
    description: 'API key của ứng dụng academy trên HVM Meet (hvmm_<slug>_...). Gửi lại chuỗi đang che (••••) = giữ nguyên, chuỗi rỗng = xoá.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  api_key?: string

  @ApiPropertyOptional({ description: 'Secret ký webhook. Gửi lại chuỗi đang che = giữ nguyên, chuỗi rỗng = xoá.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  webhook_secret?: string

  @ApiPropertyOptional({ description: 'Bật = cấp vé vào phòng HVM Meet cho buổi học' })
  @IsOptional()
  @IsBoolean()
  is_enabled?: boolean

  @ApiPropertyOptional({ description: 'Mẫu phòng mặc định bên HVM Meet', example: 'class' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  @Matches(/^[A-Za-z0-9._-]*$/, { message: 'Mẫu phòng chỉ gồm chữ, số, dấu chấm, gạch ngang, gạch dưới' })
  default_template_key?: string
}

/** Kiểm tra cấu hình trên form (chưa lưu). Trường bỏ trống / còn che thì lấy giá trị đã lưu. */
export class TestHvmMeetSettingDto extends UpdateHvmMeetSettingDto {}
