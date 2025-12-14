import { SelectQueryBuilder } from 'typeorm'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional } from 'class-validator'
import { removeVietnameseTones } from './utils'

export class PaginationDto {
  @ApiPropertyOptional({ description: 'Trang hiện tại', example: 1 })
  @IsOptional()
  page?: number

  @ApiPropertyOptional({ description: 'Số lượng mỗi trang', example: 10 })
  @IsOptional()
  limit?: number | 10

  filters?: Record<string, any>

  @ApiPropertyOptional({ description: 'Sắp xếp theo trường nào' })
  @IsOptional()
  orderBy?: string

  @ApiPropertyOptional({ description: 'Chiều sắp xếp', enum: ['ASC', 'DESC'] })
  @IsOptional()
  orderDirection?: 'ASC' | 'DESC'
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export async function paginate<T>(queryBuilder: SelectQueryBuilder<T>, params: PaginationDto) {
  const { page = 1, limit = 10, orderBy, orderDirection = 'DESC', ...filters } = params

  const mainTableAlias = queryBuilder.alias

  Object.keys(filters).forEach(key => {
    const value = filters[key]

    if (value !== undefined && value !== null && value !== '') {
      /** ---- 1. Nếu là boolean string ("true" | "false") ---- */
      if (value === 'true' || value === 'false') {
        // convert về 1 hoặc 0 để query DB
        const boolNumber = value === 'true' ? 1 : 0
        queryBuilder.andWhere(`${mainTableAlias}.${key} = :${key}`, {
          [key]: boolNumber,
        })
        return
      }

      /** ---- 2. Nếu là số ---- */
      if (!isNaN(Number(value)) && typeof value !== 'boolean') {
        queryBuilder.andWhere(`${mainTableAlias}.${key} = :${key}`, {
          [key]: Number(value),
        })
        return
      }

      /** ---- 3. Nếu là text ---- */
      if (typeof value === 'string') {
        const searchValue = removeVietnameseTones(value.toLowerCase().trim())
        queryBuilder.andWhere(`LOWER(${mainTableAlias}.${key}) LIKE :${key}`, {
          [key]: `%${searchValue}%`,
        })
        return
      }

      /** ---- 4. Các kiểu còn lại ---- */
      queryBuilder.andWhere(`${mainTableAlias}.${key} = :${key}`, { [key]: value })
    }
  })

  if (orderBy) {
    queryBuilder.orderBy(`${mainTableAlias}.${orderBy}`, orderDirection)
  }

  const [data, total] = await queryBuilder
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount()

  return {
    data,
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit),
    } as PaginationMeta,
  }
}
