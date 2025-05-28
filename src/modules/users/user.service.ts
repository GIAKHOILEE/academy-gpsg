import { hashPassword } from '@common/utils'
import { UserStatus } from '@enums/status.enum'
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CreateUserDto } from './dtos/create-user.dto'
import { User } from './user.entity'

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { username, password, role, status } = createUserDto
    const existingUser = await this.usersRepository
      .createQueryBuilder('user')
      .where('user.username = :username', { username })
      .getOne()
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

  async findOne(username: string): Promise<User | undefined> {
    return this.usersRepository.findOne({ where: { username } })
  }

  async updateStatus(userId: number, status: UserStatus): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id: userId } })
    if (!user) {
      throw new UnauthorizedException('User not found')
    }
    user.status = status
    return this.usersRepository.save(user)
  }
}
