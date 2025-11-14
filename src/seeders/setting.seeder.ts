import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Settings } from '../modules/settings/settings.entity'

@Injectable()
export class SettingSeeder {
  private readonly logger = new Logger(SettingSeeder.name)

  constructor(
    @InjectRepository(Settings)
    private settingsRepository: Repository<Settings>,
  ) {}

  // tự tạo 1 row settings/ nếu có thì không tạo
  async onModuleInit() {
    const count = await this.settingsRepository.count()
    if (count === 0) {
      const settings = this.settingsRepository.create({ is_evaluate: false })
      await this.settingsRepository.save(settings)
      this.logger.log('Settings created')
    } else {
      this.logger.log('Settings already exists')
    }
  }
}
