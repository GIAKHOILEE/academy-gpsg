import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class UpdateWitnessFaithMenuDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'The name of the witness faith menu',
    example: 'Witness Faith Menu',
  })
  name: string
}
