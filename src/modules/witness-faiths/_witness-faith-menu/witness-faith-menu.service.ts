import { HttpStatus, Injectable } from '@nestjs/common'

import { Repository } from 'typeorm'
import { WitnessFaithMenu } from './witness-faith-menu.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { IWitnessFaithMenu } from './witness-faith-menu.interface'
import { CreateWitnessFaithMenuDto } from './dtos/create-witness-faith-menu.dto'
import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { UpdateWitnessFaithMenuDto } from './dtos/update-witness-faith-menu.dto'
import { WitnessFaith } from '../../witness-faiths/witness-faith.entity'
import { PaginateWitnessFaithMenuDto } from './dtos/paginate-witness-faith-menu.dto'
import { paginate, PaginationMeta } from '@common/pagination'

@Injectable()
export class WitnessFaithMenuService {
  constructor(
    @InjectRepository(WitnessFaithMenu)
    private readonly witnessFaithMenuRepository: Repository<WitnessFaithMenu>,
    @InjectRepository(WitnessFaith)
    private readonly witnessFaithRepository: Repository<WitnessFaith>,
  ) {}

  async createWitnessFaithMenu(createWitnessFaithMenuDto: CreateWitnessFaithMenuDto): Promise<IWitnessFaithMenu> {
    const witnessFaithMenu = this.witnessFaithMenuRepository.create(createWitnessFaithMenuDto)
    const existingWitnessFaithMenu = await this.witnessFaithMenuRepository.findOne({ where: { name: createWitnessFaithMenuDto.name } })
    if (existingWitnessFaithMenu) {
      throwAppException('WITNESS_FAITH_MENU_ALREADY_EXISTS', ErrorCode.WITNESS_FAITH_MENU_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
    }
    const savedWitnessFaithMenu = await this.witnessFaithMenuRepository.save(witnessFaithMenu)
    const formattedWitnessFaithMenu = {
      ...savedWitnessFaithMenu,
      witness_faiths: [],
    }
    return formattedWitnessFaithMenu
  }

  async updateWitnessFaithMenu(id: number, updateWitnessFaithMenuDto: UpdateWitnessFaithMenuDto): Promise<IWitnessFaithMenu> {
    const witnessFaithMenu = await this.witnessFaithMenuRepository.findOne({ where: { id } })
    if (!witnessFaithMenu) {
      throwAppException('WITNESS_FAITH_MENU_NOT_FOUND', ErrorCode.WITNESS_FAITH_MENU_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    const updatedWitnessFaithMenu = await this.witnessFaithMenuRepository.save({ ...witnessFaithMenu, ...updateWitnessFaithMenuDto })
    const formattedWitnessFaithMenu = {
      ...updatedWitnessFaithMenu,
      witness_faiths: [],
    }
    return formattedWitnessFaithMenu
  }

  async deleteWitnessFaithMenu(id: number): Promise<void> {
    const witnessFaithMenu = await this.witnessFaithMenuRepository.findOne({ where: { id } })
    if (!witnessFaithMenu) {
      throwAppException('WITNESS_FAITH_MENU_NOT_FOUND', ErrorCode.WITNESS_FAITH_MENU_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    const witnessFaith = await this.witnessFaithRepository.findOne({ where: { witness_faith_menu: { id } } })
    if (witnessFaith) {
      throwAppException('WITNESS_FAITH_MENU_HAS_WITNESS_FAITH', ErrorCode.WITNESS_FAITH_MENU_HAS_WITNESS_FAITH, HttpStatus.BAD_REQUEST)
    }
    await this.witnessFaithMenuRepository.delete(id)
  }

  async getWitnessFaithMenus(paginateWitnessFaithMenuDto: PaginateWitnessFaithMenuDto): Promise<{ data: IWitnessFaithMenu[]; meta: PaginationMeta }> {
    const queryBuilder = this.witnessFaithMenuRepository.createQueryBuilder('witness_faith_menu')

    const { data, meta } = await paginate(queryBuilder, paginateWitnessFaithMenuDto)

    const formattedData = data.map(witnessFaithMenu => ({
      id: witnessFaithMenu.id,
      name: witnessFaithMenu.name,
    }))
    return { data: formattedData, meta }
  }

  async getDetailWitnessFaithMenu(id: number): Promise<IWitnessFaithMenu> {
    const witnessFaithMenu = await this.witnessFaithMenuRepository.findOne({ where: { id }, relations: ['witness_faiths'] })
    if (!witnessFaithMenu) {
      throwAppException('WITNESS_FAITH_MENU_NOT_FOUND', ErrorCode.WITNESS_FAITH_MENU_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    const formattedWitnessFaithMenu = {
      id: witnessFaithMenu.id,
      name: witnessFaithMenu.name,
      witness_faiths: witnessFaithMenu.witness_faiths.map(witnessFaith => ({
        id: witnessFaith.id,
        name: witnessFaith.name,
        image: witnessFaith.image,
        description: witnessFaith.description,
        content: witnessFaith.content,
      })),
    }

    return formattedWitnessFaithMenu
  }
}
