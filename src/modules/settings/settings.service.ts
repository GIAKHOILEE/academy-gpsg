import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Settings } from './settings.entity'
import { UpdateSettingDto } from './dtos/update-setting.dto'
import { ErrorCode } from '@enums/error-codes.enum'
import { throwAppException } from '@common/utils'

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Settings)
    private settingsRepository: Repository<Settings>,
  ) {}

  async updateSettings(updateSettingsDto: UpdateSettingDto): Promise<Settings> {
    const settings = await this.settingsRepository.findOne({ where: { id: 1 } })
    if (!settings) {
      throwAppException('SETTINGS_NOT_FOUND', ErrorCode.SETTINGS_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    Object.assign(settings, updateSettingsDto)
    return this.settingsRepository.save(settings)
  }

  async getSettings(): Promise<Settings> {
    const settings = await this.settingsRepository.findOne({ where: { id: 1 } })
    if (!settings) {
      throwAppException('SETTINGS_NOT_FOUND', ErrorCode.SETTINGS_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    return settings
  }
}
