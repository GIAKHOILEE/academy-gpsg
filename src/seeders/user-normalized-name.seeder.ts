import { removeVietnameseTones } from '@common/utils'
import { User } from '@modules/users/user.entity'
import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

@Injectable()
export class UserNormalizedNameSeeder {
  private readonly logger = new Logger(UserNormalizedNameSeeder.name)

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    this.seed()
  }

  private async seed() {
    try {
      let totalUpdated = 0

      while (true) {
        const chunk = await this.userRepository
          .createQueryBuilder('user')
          .select(['user.id', 'user.full_name', 'user.full_name_normalized'])
          .where('user.full_name IS NOT NULL AND user.full_name != ""')
          .andWhere('(user.full_name_normalized IS NULL OR user.full_name_normalized = "")')
          .take(1000)
          .getMany()

        if (chunk.length === 0) break

        for (const user of chunk) {
          user.full_name_normalized = removeVietnameseTones(user.full_name).toLowerCase().trim()
        }

        await this.userRepository.save(chunk)
        totalUpdated += chunk.length
        this.logger.log(`Progress: Updated ${totalUpdated} user records with full_name_normalized...`)
      }

      if (totalUpdated > 0) {
        this.logger.log(`Successfully finished updating all ${totalUpdated} user records!`)
      }
    } catch (error) {
      this.logger.error('Failed to migrate full_name_normalized for users:', error)
    }
  }
}
