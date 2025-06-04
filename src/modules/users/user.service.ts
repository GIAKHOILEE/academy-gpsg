import { paginate, PaginationMeta } from '@common/pagination'
import { hashPassword, validateHash } from '@common/utils'
import { Role } from '@enums/role.enum'
import { UserStatus } from '@enums/status.enum'
import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CreateUserDto } from './dtos/create-user.dto'
import { PaginateUserDto } from './dtos/paginate-user.dto'
import { User } from './user.entity'
import { IUser } from './user.interface'
import { UpdatePasswordDto } from './dtos/update-user.dto'

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto, role: Role): Promise<User> {
    const { username, password, status } = createUserDto
    const existingUser = await this.usersRepository.createQueryBuilder('users').where('users.username = :username', { username }).getOne()
    if (existingUser) {
      throw new ConflictException('Username already exists')
    }

    const hashedPassword = await hashPassword(password)
    const user = this.usersRepository.create({
      username,
      password: hashedPassword,
      role,
      status,
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
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
      }
    })
    return {
      data: users,
      meta,
    }
  }

  async findOne(username: string): Promise<IUser> {
    const user = await this.usersRepository.findOne({ where: { username } })
    if (!user) {
      throw new UnauthorizedException('User not found')
    }
    const userData: IUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
    }
    return userData
  }

  async getMe(userId: number): Promise<IUser> {
    const user = await this.usersRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new UnauthorizedException('User not found')
    }
    const userData: IUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
    }
    return userData
  }

  async updateStatus(userId: number, status: UserStatus): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new UnauthorizedException('User not found')
    }
    user.status = status
    return this.usersRepository.save(user)
  }

  async updatePassword(userId: number, updatePasswordDto: UpdatePasswordDto): Promise<void> {
    const { old_password, new_password } = updatePasswordDto
    const user = await this.usersRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new NotFoundException('User not found')
    }

    // kiểm tra oldPassword có giống với password hiện tại không
    const isOldPasswordMatch = await validateHash(old_password, user.password)
    if (!isOldPasswordMatch) {
      throw new BadRequestException('Old password is incorrect')
    }

    // kiểm tra newPassword có trùng với oldPassword không
    const isPasswordMatch = await validateHash(new_password, user.password)
    if (isPasswordMatch) {
      throw new BadRequestException('New password cannot be the same as the old password')
    }
    const hashedPassword = await hashPassword(new_password)
    user.password = hashedPassword

    await this.usersRepository.save(user)
  }
}
