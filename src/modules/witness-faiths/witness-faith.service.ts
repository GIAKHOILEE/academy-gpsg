import { paginate, PaginationMeta } from '@common/pagination'
import { AiStatus } from '@enums/ai-content.enum'
import { ErrorCode } from '@enums/error-codes.enum'
import { AiContentService } from '@modules/ai-content/ai-content.service'
import { CreateWitnessFaithAiBatchDto } from '@modules/ai-content/dtos/create-ai-batch.dto'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { throwAppException } from 'src/common/utils'
import { Repository } from 'typeorm'
import { WitnessFaithMenu } from './_witness-faith-menu/witness-faith-menu.entity'
import { CreateWitnessFaithDto } from './dtos/create-witness-faith.dto'
import { PaginateWitnessFaithDto } from './dtos/paginate-witness-faith.dto'
import { UpdateWitnessFaithDto } from './dtos/update-witness-faith.dto'
import { WitnessFaith } from './witness-faith.entity'
import { IWitnessFaith } from './witness-faith.interface'

@Injectable()
export class WitnessFaithService {
  constructor(
    @InjectRepository(WitnessFaith)
    private readonly witnessFaithRepository: Repository<WitnessFaith>,
    @InjectRepository(WitnessFaithMenu)
    private readonly witnessFaithMenuRepository: Repository<WitnessFaithMenu>,
    private readonly aiContentService: AiContentService,
  ) {}

  async generateWitnessFaithsByAi(dto: CreateWitnessFaithAiBatchDto) {
    return this.aiContentService.createWitnessFaithBatch(dto)
  }

  async createWitnessFaith(createWitnessFaithDto: CreateWitnessFaithDto): Promise<IWitnessFaith> {
    const { witness_faith_menu_id, ...rest } = createWitnessFaithDto
    const witnessFaithMenu = await this.witnessFaithMenuRepository.findOne({ where: { id: witness_faith_menu_id } })
    if (!witnessFaithMenu) {
      throwAppException('WITNESS_FAITH_MENU_NOT_FOUND', ErrorCode.WITNESS_FAITH_MENU_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    const witnessFaith = this.witnessFaithRepository.create({
      ...rest,
      witness_faith_menu: witnessFaithMenu,
    })
    const savedWitnessFaith = await this.witnessFaithRepository.save(witnessFaith)
    const formattedWitnessFaith: IWitnessFaith = {
      id: savedWitnessFaith.id,
      name: savedWitnessFaith.name,
      image: savedWitnessFaith.image,
      description: savedWitnessFaith.description,
      content: savedWitnessFaith.content,
      witness_faith_menu_id: savedWitnessFaith.witness_faith_menu_id,
      ai_status: savedWitnessFaith.ai_status,
      ai_batch_id: savedWitnessFaith.ai_batch_id,
      witness_faith_menu: {
        id: witnessFaithMenu.id,
        name: witnessFaithMenu.name,
        ai_status: witnessFaithMenu.ai_status,
      },
    }
    return formattedWitnessFaith
  }

  async updateWitnessFaith(id: number, updateWitnessFaithDto: UpdateWitnessFaithDto): Promise<void> {
    const { witness_faith_menu_id, ...rest } = updateWitnessFaithDto

    const witnessFaith = await this.witnessFaithRepository.findOne({ where: { id } })
    if (!witnessFaith) {
      throwAppException('WITNESS_FAITH_NOT_FOUND', ErrorCode.WITNESS_FAITH_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    if (witness_faith_menu_id) {
      const witnessFaithMenu = await this.witnessFaithMenuRepository.findOne({ where: { id: witness_faith_menu_id } })
      if (!witnessFaithMenu) {
        throwAppException('WITNESS_FAITH_MENU_NOT_FOUND', ErrorCode.WITNESS_FAITH_MENU_NOT_FOUND, HttpStatus.NOT_FOUND)
      }
      witnessFaith.witness_faith_menu = witnessFaithMenu
    }
    await this.witnessFaithRepository.update(id, {
      ...rest,
      witness_faith_menu: witnessFaith.witness_faith_menu,
    })
  }

  async deleteWitnessFaith(id: number): Promise<void> {
    const witnessFaith = await this.witnessFaithRepository.findOne({ where: { id } })
    if (!witnessFaith) {
      throwAppException('WITNESS_FAITH_NOT_FOUND', ErrorCode.WITNESS_FAITH_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    await this.witnessFaithRepository.delete(id)
  }

  async getWitnessFaithById(id: number): Promise<IWitnessFaith> {
    const witnessFaith = await this.witnessFaithRepository.findOne({ where: { id }, relations: ['witness_faith_menu'] })
    if (!witnessFaith) {
      throwAppException('WITNESS_FAITH_NOT_FOUND', ErrorCode.WITNESS_FAITH_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    const formattedWitnessFaith: IWitnessFaith = {
      id: witnessFaith.id,
      name: witnessFaith.name,
      image: witnessFaith.image,
      description: witnessFaith.description,
      content: witnessFaith.content,
      witness_faith_menu_id: witnessFaith.witness_faith_menu_id,
      ai_status: witnessFaith.ai_status,
      ai_batch_id: witnessFaith.ai_batch_id,
      witness_faith_menu: witnessFaith.witness_faith_menu,
      created_at: witnessFaith.created_at,
    }
    return formattedWitnessFaith
  }

  async getAllWitnessFaiths(
    paginateWitnessFaithDto: PaginateWitnessFaithDto,
    isAdmin = false,
  ): Promise<{ data: IWitnessFaith[]; meta: PaginationMeta }> {
    const { witness_faith_menu_id, ai_status, ...rest } = paginateWitnessFaithDto
    const queryBuilder = this.witnessFaithRepository
      .createQueryBuilder('witness_faith')
      .select([
        'witness_faith.id',
        'witness_faith.name',
        'witness_faith.image',
        'witness_faith.description',
        'witness_faith.witness_faith_menu_id',
        'witness_faith.ai_status',
        'witness_faith.ai_batch_id',
        'witness_faith.created_at',
      ])
      .leftJoinAndSelect('witness_faith.witness_faith_menu', 'witness_faith_menu')

    if (witness_faith_menu_id) {
      queryBuilder.andWhere('witness_faith.witness_faith_menu_id = :witness_faith_menu_id', { witness_faith_menu_id })
    }

    if (!isAdmin) {
      queryBuilder.andWhere('(witness_faith.ai_status IS NULL OR witness_faith.ai_status = :completedStatus)', {
        completedStatus: AiStatus.COMPLETED,
      })
    } else if (ai_status) {
      queryBuilder.andWhere('witness_faith.ai_status = :ai_status', { ai_status })
    }

    const { data, meta } = await paginate(queryBuilder, rest)

    const formattedData = data.map(item => ({
      id: item.id,
      name: item.name,
      image: item.image,
      description: item.description,
      witness_faith_menu_id: item.witness_faith_menu_id,
      ai_status: item.ai_status,
      ai_batch_id: item.ai_batch_id,
      created_at: item.created_at,
      witness_faith_menu: item.witness_faith_menu
        ? {
            id: item.witness_faith_menu.id,
            name: item.witness_faith_menu.name,
            ai_status: item.witness_faith_menu.ai_status,
          }
        : undefined,
    }))
    return { data: formattedData, meta }
  }
}
