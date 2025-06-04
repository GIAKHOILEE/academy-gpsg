import { SelectQueryBuilder } from 'typeorm'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional } from 'class-validator'
import { removeVietnameseTones } from './utils'

export class PaginationParams {
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

export async function paginate<T>(queryBuilder: SelectQueryBuilder<T>, params: PaginationParams) {
  const { page = 1, limit = 10, orderBy, orderDirection = 'DESC', ...filters } = params

  const mainTableAlias = queryBuilder.alias

  Object.keys(filters).forEach(key => {
    const value = filters[key]
    if (value !== undefined && value !== null && value !== '') {
      // Nếu là số thì search chính xác, còn string thì search tương tự (LIKE)
      if (!isNaN(Number(value)) && typeof value !== 'boolean' && value !== '') {
        // Nếu là number
        queryBuilder.andWhere(`${mainTableAlias}.${key} = :${key}`, {
          [key]: Number(value),
        })
      } else if (typeof value === 'string') {
        // Nếu là string
        const searchValue = removeVietnameseTones(value.toLowerCase().trim())
        queryBuilder.andWhere(`LOWER(${mainTableAlias}.${key}) LIKE :${key}`, {
          [key]: `%${searchValue}%`,
        })
      } else {
        // Các kiểu khác (boolean, v.v.)
        queryBuilder.andWhere(`${mainTableAlias}.${key} = :${key}`, {
          [key]: value,
        })
      }
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
