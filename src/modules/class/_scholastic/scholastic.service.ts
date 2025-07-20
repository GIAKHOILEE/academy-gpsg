import { paginate, PaginationMeta } from '@common/pagination'
import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Classes } from '../class.entity'
import { CreateScholasticDto } from './dtos/create-scholastic.dto'
import { PaginateScholasticDto } from './dtos/paginate-scholastic.dto'
import { UpdateScholasticDto } from './dtos/update-scholastic.dto'
import { Scholastic } from './scholastic.entity'
import { IScholastic } from './scholastic.interface'

@Injectable()
export class ScholasticService {
  constructor(
    @InjectRepository(Scholastic)
    private readonly scholasticRepository: Repository<Scholastic>,
    @InjectRepository(Classes)
    private readonly classRepository: Repository<Classes>,
  ) {}

  async create(createScholasticDto: CreateScholasticDto): Promise<IScholastic> {
    const scholastic = await this.scholasticRepository.findOne({
      where: {
        name: createScholasticDto.name,
      },
    })
    if (scholastic) throwAppException('SCHOLASTIC_ALREADY_EXISTS', ErrorCode.SCHOLASTIC_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)

    const newScholastic = this.scholasticRepository.create(createScholasticDto)
    const savedScholastic = await this.scholasticRepository.save(newScholastic)
    return {
      id: savedScholastic.id,
      name: savedScholastic.name,
    }
  }

  async update(id: number, updateScholasticDto: UpdateScholasticDto): Promise<void> {
    const scholastic = await this.scholasticRepository.exists({ where: { id } })
    if (!scholastic) throwAppException('SCHOLASTIC_NOT_FOUND', ErrorCode.SCHOLASTIC_NOT_FOUND, HttpStatus.NOT_FOUND)

    const existingScholastic = await this.scholasticRepository.exists({ where: { name: updateScholasticDto.name } })
    if (existingScholastic) throwAppException('SCHOLASTIC_ALREADY_EXISTS', ErrorCode.SCHOLASTIC_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)

    await this.scholasticRepository.update(id, updateScholasticDto)
  }

  async delete(id: number): Promise<void> {
    const scholastic = await this.scholasticRepository.exists({ where: { id } })
    if (!scholastic) throwAppException('SCHOLASTIC_NOT_FOUND', ErrorCode.SCHOLASTIC_NOT_FOUND, HttpStatus.NOT_FOUND)

    const classes = await this.classRepository.exists({ where: { scholastic_id: id } })
    if (classes) throwAppException('SCHOLASTIC_HAS_CLASSES', ErrorCode.SCHOLASTIC_HAS_CLASSES, HttpStatus.BAD_REQUEST)

    await this.scholasticRepository.delete(id)
  }

  async findAll(paginateScholasticDto: PaginateScholasticDto): Promise<{ data: IScholastic[]; meta: PaginationMeta }> {
    const queryBuilder = this.scholasticRepository.createQueryBuilder('scholastic')

    const { data, meta } = await paginate(queryBuilder, paginateScholasticDto)

    const formattedData = data.map(scholastic => ({
      id: scholastic.id,
      name: scholastic.name,
    }))
    return { data: formattedData, meta }
  }

  async findOne(id: number): Promise<IScholastic> {
    const scholastic = await this.scholasticRepository.findOne({ where: { id } })
    if (!scholastic) throwAppException('SCHOLASTIC_NOT_FOUND', ErrorCode.SCHOLASTIC_NOT_FOUND, HttpStatus.NOT_FOUND)

    return {
      id: scholastic.id,
      name: scholastic.name,
    }
  }
}
