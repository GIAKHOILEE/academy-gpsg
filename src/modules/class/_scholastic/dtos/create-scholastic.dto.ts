import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class CreateScholasticDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Tên niên khóa',
    example: '2020-2021',
  })
  name: string
}
