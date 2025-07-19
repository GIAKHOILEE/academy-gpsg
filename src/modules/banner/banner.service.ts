import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { PaginationMeta, paginate } from 'src/common/pagination'
import { Repository } from 'typeorm'
import { Banner } from './banner.entity'
import { IBanner } from './banner.interface'
import { CreateBannerDto } from './dtos/create-banner.dto'
import { PaginateBannerDto } from './dtos/paginate-banner.dto'
import { UpdateBannerDto } from './dtos/update-banner.dto'

@Injectable()
export class BannerService {
  constructor(
    @InjectRepository(Banner)
    private readonly bannerRepository: Repository<Banner>,
  ) {}

  async createBanner(createBannerDto: CreateBannerDto): Promise<IBanner> {
    const bannerMaxIndex = await this.bannerRepository.createQueryBuilder('banner').select('MAX(banner.index) as maxIndex').getRawOne()

    let maxIndex = 1.0001
    if (bannerMaxIndex?.maxIndex) {
      maxIndex = bannerMaxIndex.maxIndex + 100
    }

    const banner = this.bannerRepository.create({
      ...createBannerDto,
      index: maxIndex,
    })

    return this.bannerRepository.save(banner)
  }

  async getManyBanner(params: PaginateBannerDto, isAdmin: boolean): Promise<{ data: IBanner[]; meta: PaginationMeta }> {
    const queryBuilder = this.bannerRepository
      .createQueryBuilder('banner')
      .select(['banner.id', 'banner.image', 'banner.url', 'banner.index', 'banner.isActive'])

    if (!isAdmin) {
      queryBuilder.where('banner.isActive = :isActive', { isActive: true })
    }

    const { data, meta } = await paginate(queryBuilder, params)

    const formatBanner = data.map(banner => {
      return {
        id: banner.id,
        image: banner.image,
        url: banner.url,
        index: banner.index,
        isActive: banner.isActive,
      }
    })

    return {
      data: formatBanner,
      meta,
    }
  }

  async getBannerById(id: number): Promise<IBanner> {
    const banner = await this.bannerRepository.findOne({ where: { id } })
    if (!banner) {
      throwAppException('BANNER_NOT_FOUND', ErrorCode.BANNER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const formatBanner = {
      id: banner.id,
      image: banner.image,
      url: banner.url,
      index: banner.index,
      isActive: banner.isActive,
    }
    return formatBanner
  }

  async updateIsActive(id: number): Promise<void> {
    const banner = await this.bannerRepository.findOne({ where: { id } })
    if (!banner) {
      throwAppException('BANNER_NOT_FOUND', ErrorCode.BANNER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    await this.bannerRepository.createQueryBuilder('banner').update(Banner).set({ isActive: !banner.isActive }).where('id = :id', { id }).execute()
  }

  async updateIndex(id: number, index: number): Promise<void> {
    const banner = await this.bannerRepository.findOne({ where: { id } })
    if (!banner) {
      throwAppException('BANNER_NOT_FOUND', ErrorCode.BANNER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    await this.bannerRepository.createQueryBuilder('banner').update(Banner).set({ index }).where('id = :id', { id }).execute()
  }

  async updateBanner(id: number, updateBannerDto: UpdateBannerDto): Promise<IBanner> {
    const banner = await this.bannerRepository.findOne({ where: { id } })
    if (!banner) {
      throwAppException('BANNER_NOT_FOUND', ErrorCode.BANNER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const updatedBanner = this.bannerRepository.merge(banner, updateBannerDto)
    return this.bannerRepository.save(updatedBanner)
  }

  async deleteBanner(id: number): Promise<void> {
    const banner = await this.bannerRepository.findOne({ where: { id } })
    if (!banner) throwAppException('BANNER_NOT_FOUND', ErrorCode.BANNER_NOT_FOUND, HttpStatus.NOT_FOUND)
    await this.bannerRepository.delete(id)
  }
}
