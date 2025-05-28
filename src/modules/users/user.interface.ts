import { Role } from '@enums/role.enum'
import { UserStatus } from '@enums/status.enum'

export interface IUser {
  id: number
  username: string
  email: string
  //   password?: string;
  role: Role
  status: UserStatus
}
