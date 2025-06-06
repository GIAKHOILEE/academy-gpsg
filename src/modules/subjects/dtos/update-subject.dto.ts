import { IsString } from 'class-validator'

export class UpdateSubjectDto {
  @IsString()
  name: string

  @IsString()
  image: string
}
