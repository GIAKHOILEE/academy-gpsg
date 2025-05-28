import { IUser } from '@modules/users/user.interface'
import { TokenPayloadDto } from './token-payload.dto'
import { IsObject } from 'class-validator'
export class LoginPayloadDto {
  @IsObject()
  user: IUser

  @IsObject()
  token?: TokenPayloadDto

  constructor(user: IUser, token?: TokenPayloadDto) {
    this.user = user
    this.token = token
  }
}
