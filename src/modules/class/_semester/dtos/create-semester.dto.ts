import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class CreateSemesterDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Tên học kỳ',
    example: 'Học kỳ 1',
  })
  name: string
}
