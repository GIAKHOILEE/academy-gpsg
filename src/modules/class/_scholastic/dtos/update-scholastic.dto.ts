import { Trim } from '@decorators/trim.decorator'
import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class UpdateScholasticDto {
  @Trim()
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'Tên niên khóa',
    example: '2020-2021',
  })
  name: string
}
