import { Trim } from '@decorators/trim.decorator'
import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class UpdateSemesterDto {
  @Trim()
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Tên học kỳ',
    example: 'Học kỳ 1',
  })
  name: string
}
