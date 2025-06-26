import { paginate, PaginationMeta } from '@common/pagination'
import { hashPassword, throwAppException, validateHash } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { Role } from '@enums/role.enum'
import { UserStatus } from '@enums/status.enum'
import { ConflictException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CreateUserDto } from './dtos/create-user.dto'
import { PaginateUserDto } from './dtos/paginate-user.dto'
import { UpdatePasswordDto, UpdateUserDto } from './dtos/update-user.dto'
import { User } from './user.entity'
import { IUser } from './user.interface'

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto, role: Role): Promise<User> {
    const { username, password, full_name, ...rest } = createUserDto
    const existingUser = await this.usersRepository.createQueryBuilder('users').where('users.username = :username', { username }).getOne()
    if (existingUser) {
      throwAppException(ErrorCode.USERNAME_ALREADY_EXISTS, HttpStatus.CONFLICT)
    }

    const hashedPassword = await hashPassword(password)
    const user = this.usersRepository.create({
      username,
      full_name,
      password: hashedPassword,
      role,
      status: UserStatus.ACTIVE,
      ...rest,
    })

    return this.usersRepository.save(user)
  }

  async getAllUsers(paginateUserDto: PaginateUserDto, role?: Role): Promise<{ data: IUser[]; meta: PaginationMeta }> {
    const queryBuilder = this.usersRepository.createQueryBuilder('users')
    if (role) {
      queryBuilder.where('users.role = :role', { role })
    }

    const { data, meta } = await paginate(queryBuilder, paginateUserDto)
    const users = data.map(user => {
      return {
        id: user.id,
        full_name: user.full_name,
        username: user.username,
        email: user.email,
        gender: user.gender,
        role: user.role,
        status: user.status,
        ...user,
      }
    })
    return {
      data: users,
      meta,
    }
  }

  async findOne(username: string): Promise<IUser> {
    const user = await this.usersRepository
      .createQueryBuilder('users')
      .where('users.username = :username', { username })
      .andWhere('users.is_temporary = :is_temporary', { is_temporary: false })
      .getOne()

    if (!user) {
      throwAppException(ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    const userData: IUser = {
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      gender: user.gender,
      role: user.role,
      status: user.status,
      ...user,
    }
    return userData
  }

  async getMe(userId: number): Promise<IUser> {
    const user = await this.usersRepository
      .createQueryBuilder('users')
      .where('users.id = :userId', { userId })
      .andWhere('users.is_temporary = :is_temporary', { is_temporary: false })
      .getOne()

    if (!user) {
      throwAppException(ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    const userData: IUser = {
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      gender: user.gender,
      role: user.role,
      status: user.status,
      ...user,
    }
    return userData
  }

  async updateUser(userId: number, updateUserDto: UpdateUserDto): Promise<void> {
    const { username, ...dto } = updateUserDto
    const user = await this.usersRepository.findOne({ where: { id: userId } })
    if (!user) {
      throwAppException(ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    if (username) {
      const existingUser = await this.usersRepository
        .createQueryBuilder('users')
        .where('users.username = :username', { username })
        .andWhere('users.id != :userId', { userId })
        .getOne()
      if (existingUser) {
        throw new ConflictException('Username already exists')
      }
      user.username = username
    }
    Object.assign(user, dto)
    await this.usersRepository.save(user)
  }

  async updateStatus(userId: number, status: UserStatus): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new UnauthorizedException('User not found')
    }
    user.status = status
    await this.usersRepository.save(user)
  }

  async updatePassword(userId: number, updatePasswordDto: UpdatePasswordDto): Promise<void> {
    const { old_password, new_password } = updatePasswordDto
    const user = await this.usersRepository.findOne({ where: { id: userId } })
    if (!user) {
      throwAppException(ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    // kiểm tra oldPassword có giống với password hiện tại không
    const isOldPasswordMatch = await validateHash(old_password, user.password)
    if (!isOldPasswordMatch) {
      throwAppException(ErrorCode.OLD_PASSWORD_INCORRECT, HttpStatus.BAD_REQUEST)
    }

    // kiểm tra newPassword có trùng với oldPassword không
    const isPasswordMatch = await validateHash(new_password, user.password)
    if (isPasswordMatch) {
      throwAppException(ErrorCode.NEW_PASSWORD_CANNOT_BE_THE_SAME_AS_THE_OLD_PASSWORD, HttpStatus.BAD_REQUEST)
    }
    const hashedPassword = await hashPassword(new_password)
    user.password = hashedPassword

    await this.usersRepository.save(user)
  }
}
