import { Gender, Role } from '@enums/role.enum'
import { UserStatus } from '@enums/status.enum'

export interface IUser {
  id: number
  full_name?: string
  first_name?: string
  username?: string
  code?: string
  email?: string
  // password?: string
  saint_name?: string
  gender?: Gender
  phone_number?: string
  address?: string
  avatar?: string
  birth_place?: string
  birth_date?: string
  parish?: string
  deanery?: string
  diocese?: string
  congregation?: string
  role?: Role
  status?: UserStatus
}
