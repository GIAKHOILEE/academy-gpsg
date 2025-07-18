import { ApiProperty } from '@nestjs/swagger'
import { IsNumber, IsOptional, IsString } from 'class-validator'

export class UpdateBookDtoPostCatalogDto {
  @IsOptional()
  @IsString()
  @ApiProperty({ example: 'string', description: 'Ten danh muc' })
  name: string

  @IsOptional()
  @IsNumber()
  @ApiProperty({ example: 1, description: 'Id danh muc cha' })
  parent_id: number

  index: number
}
