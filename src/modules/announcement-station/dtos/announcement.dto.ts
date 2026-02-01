import { Role } from '@enums/role.enum'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class AnnouncementDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Tiêu đề',
    example: 'Thông báo',
  })
  title: string

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Nội dung',
    example: 'Thông báo',
  })
  content: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({
    description: 'URL của các file',
    example: ['https://example.com/file1.pdf', 'https://example.com/file2.pdf'],
    type: [String],
  })
  file_url: string[]

  @IsEnum(Role)
  @IsNotEmpty()
  @ApiProperty({
    description: 'Chỉ nhận role student hoặc teacher',
    example: Role.STUDENT,
  })
  role: Role

  @IsArray()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Danh sách id người nhận',
    example: [1, 2, 3],
  })
  userIds: number[]
}
