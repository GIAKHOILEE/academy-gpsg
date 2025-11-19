import { Role } from '@enums/role.enum'
import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsEnum, IsNotEmpty, IsString } from 'class-validator'

export class AnnouncementDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Tiêu đề',
    example: 'Thông báo',
  })
  title: string

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'Nội dung',
    example: 'Thông báo',
  })
  content: string

  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ description: 'URL của các file', example: ['https://example.com/file1.pdf', 'https://example.com/file2.pdf'], type: [String] })
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
