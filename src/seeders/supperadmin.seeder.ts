import { Role } from '@enums/role.enum'
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import { Repository } from 'typeorm'
import { User } from '../modules/users/user.entity'
import * as dotenv from 'dotenv'
import { UserStatus } from '@enums/status.enum'
import { hashPassword } from '@common/utils'

dotenv.config()
@Injectable()
export class SuperAdminSeeder {
  private readonly logger = new Logger(SuperAdminSeeder.name)

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  onModuleInit() {
    this.seed()
  }
  private async seed() {
    // tạo tài khoản super admin
    const username = process.env.SUPER_ADMIN_USERNAME
    const email = process.env.SUPER_ADMIN_EMAIL
    const password = process.env.SUPER_ADMIN_PASSWORD
    const existingUser = await this.userRepository.findOne({ where: { email } })

    if (existingUser) {
      if (existingUser.role === Role.SUPER_ADMIN) {
        this.logger.log(`Super admin already exists with email ${email}. Skipping seeding.`)
        return
      } else {
        this.logger.warn(`Email ${email} is already used by another role. Manual intervention required.`)
        return
      }
    }

    const user = this.userRepository.create({
      username,
      email,
      password: await hashPassword(password),
      role: Role.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
    })

    await this.userRepository.save(user)
    this.logger.log(`Super admin created with email ${email}.`)
  }
}
