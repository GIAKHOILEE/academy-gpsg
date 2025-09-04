import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class CreateAttendanceDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'ID lớp', example: 1 })
  class_id: number

  @IsNotEmpty()
  @IsString()
  @ApiProperty({ description: 'Mã thẻ học viên', example: '123456' })
  card_code: string
}
