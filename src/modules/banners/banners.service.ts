import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'

import { Banner } from './banners.entity'
import { IBanner } from './banners.interface'
import { CreateBannerDto } from './dtos/create-banners.dto'
import { UpdateBannerDto } from './dtos/update-banners.dto'
import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { paginate, PaginationMeta } from '@common/pagination'
import { PaginateBannersDto } from './dtos/paginate-banners.dto'

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(Banner)
    private readonly bannersRepository: Repository<Banner>,
  ) {}

  async createBanner(createBannerDto: CreateBannerDto): Promise<IBanner> {
    const banner = this.bannersRepository.create(createBannerDto)
    const bannerSaved = await this.bannersRepository.save(banner)

    const bannerResponse: IBanner = {
      id: bannerSaved.id,
      image: bannerSaved.image,
      name: bannerSaved.name,
      description: bannerSaved.description,
      content: bannerSaved.content,
      link: bannerSaved.link,
    }

    return bannerResponse
  }

  async updateBanner(id: number, updateBannerDto: UpdateBannerDto): Promise<void> {
    const banner = await this.bannersRepository.findOne({ where: { id } })
    if (!banner) {
      throwAppException('BANNER_NOT_FOUND', ErrorCode.BANNER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    await this.bannersRepository.update(id, updateBannerDto)
  }

  async deleteBanner(id: number): Promise<void> {
    const banner = await this.bannersRepository.findOne({ where: { id } })
    if (!banner) {
      throwAppException('BANNER_NOT_FOUND', ErrorCode.BANNER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    await this.bannersRepository.delete(id)
  }

  async getBanners(paginateBannersDto: PaginateBannersDto): Promise<{ data: IBanner[]; meta: PaginationMeta }> {
    const query = this.bannersRepository.createQueryBuilder('banners')
    const { data, meta } = await paginate(query, paginateBannersDto)

    const formattedData: IBanner[] = data.map((banner: Banner) => ({
      id: banner.id,
      image: banner.image,
      name: banner.name,
      description: banner.description,
      link: banner.link,
    }))

    return { data: formattedData, meta }
  }

  async getBannerById(id: number): Promise<IBanner> {
    const banner = await this.bannersRepository.findOne({ where: { id } })
    if (!banner) {
      throwAppException('BANNER_NOT_FOUND', ErrorCode.BANNER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const bannerResponse: IBanner = {
      id: banner.id,
      image: banner.image,
      name: banner.name,
      description: banner.description,
      content: banner.content,
      link: banner.link,
    }

    return bannerResponse
  }
}
