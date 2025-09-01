import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { NavigationSub } from './navigation-sub.entity'
import { CreateSubNavigationDto } from '../dtos/sub-navigation.dto'
import { UpdateSubNavigationDto } from '../dtos/sub-navigation.dto'
import { INavigation, ISubNavigation } from '../navigation.interface'
import { NavigationParentService } from '../navigation-parent/navigation-parent.service'
import { FilterSubNavigationDto } from '../dtos/sub-navigation.dto'
import { convertToSlug, throwAppException } from 'src/common/utils'
import { NavigationParent } from '../navigation-parent/navigation-parent.entity'
import { ErrorCode } from '@enums/error-codes.enum'
@Injectable()
export class NavigationSubService {
  constructor(
    @InjectRepository(NavigationSub)
    private subNavigationRepository: Repository<NavigationSub>,
    private navigationService: NavigationParentService,
  ) {}

  async findAll(filterSubNavigationDto: FilterSubNavigationDto, isAdmin: boolean): Promise<ISubNavigation[]> {
    const { title } = filterSubNavigationDto
    const queryBuilder = this.subNavigationRepository.createQueryBuilder('sub_navigation')
    if (title) {
      queryBuilder.andWhere('sub_navigation.title LIKE :title', { title: `%${title}%` })
    }
    if (!isAdmin) {
      queryBuilder.andWhere('sub_navigation.is_active = :isActive', { isActive: true })
    }
    const subNavigations = await queryBuilder.getMany()
    return subNavigations.map(sub => ({
      ...sub,
      // navigationId: sub.navigation.id,
    }))
  }

  async findOne(id: number): Promise<ISubNavigation> {
    const subNavigation = await this.subNavigationRepository
      .createQueryBuilder('sub_navigation')
      .leftJoin('sub_navigation.navigation', 'navigation')
      .select([
        'sub_navigation.id',
        'sub_navigation.index',
        'sub_navigation.slug',
        'sub_navigation.title',
        'sub_navigation.link',
        'sub_navigation.is_active',
        'navigation.id',
      ])
      .where('sub_navigation.id = :id', { id })
      .orderBy('sub_navigation.index', 'ASC')
      .getOne()
    if (!subNavigation) {
      throwAppException('SUB_NAVIGATION_NOT_FOUND', ErrorCode.SUB_NAVIGATION_NOT_FOUND)
    }
    return {
      id: subNavigation.id,
      index: subNavigation.index,
      slug: subNavigation.slug,
      title: subNavigation.title,
      link: subNavigation.link,
      is_active: subNavigation.is_active,
      navigationId: subNavigation.navigation.id,
    }
  }

  async create(createSubNavigationDto: CreateSubNavigationDto): Promise<ISubNavigation> {
    const { title, navigationId } = createSubNavigationDto
    const subNavigation = await this.subNavigationRepository
      .createQueryBuilder('sub_navigation')
      .select('MAX(sub_navigation.`index`) as maxIndex')
      .getRawOne()

    let maxIndex = 1.0001
    if (subNavigation?.maxIndex) {
      maxIndex = subNavigation.maxIndex + 100
    }
    const navigation = await this.navigationService.findOne(navigationId, true)
    if (!navigation) {
      throwAppException('NAVIGATION_NOT_FOUND', ErrorCode.NAVIGATION_NOT_FOUND)
    }
    const existingSubNavigation = await this.subNavigationRepository.findOne({ where: { title } })
    if (existingSubNavigation) {
      throwAppException('SUB_NAVIGATION_ALREADY_EXISTS', ErrorCode.SUB_NAVIGATION_ALREADY_EXISTS)
    }
    const newSubNavigation = this.subNavigationRepository.create({
      ...createSubNavigationDto,
      index: maxIndex,
      slug: convertToSlug(title),
      is_active: true,
      navigation,
    })
    const saved = await this.subNavigationRepository.save(newSubNavigation)
    return {
      ...saved,
      navigationId: saved.navigation.id,
    }
  }

  async update(id: number, updateSubNavigationDto: UpdateSubNavigationDto): Promise<void> {
    const { navigationId, ...rest } = updateSubNavigationDto
    const subNavigation = await this.subNavigationRepository.findOne({ where: { id } })
    if (!subNavigation) {
      throwAppException('SUB_NAVIGATION_NOT_FOUND', ErrorCode.SUB_NAVIGATION_NOT_FOUND)
    }
    let navigation: INavigation = subNavigation.navigation as unknown as INavigation
    if (navigationId) {
      navigation = await this.navigationService.findOne(navigationId, true)
      if (!navigation) {
        throwAppException('NAVIGATION_NOT_FOUND', ErrorCode.NAVIGATION_NOT_FOUND)
      }
    }
    Object.assign(subNavigation, { slug: convertToSlug(rest.title), ...rest })
    if (navigationId) {
      subNavigation.navigation = navigation as unknown as NavigationParent
    }

    await this.subNavigationRepository.save(subNavigation)
  }

  async updateIndex(id: number, index: number): Promise<void> {
    const subNavigation = await this.findOne(id)
    if (!subNavigation) {
      throwAppException('SUB_NAVIGATION_NOT_FOUND', ErrorCode.SUB_NAVIGATION_NOT_FOUND)
    }
    await this.subNavigationRepository.update(id, { index })
  }

  async updateActive(id: number): Promise<void> {
    const subNavigation = await this.findOne(id)
    if (!subNavigation) {
      throwAppException('SUB_NAVIGATION_NOT_FOUND', ErrorCode.SUB_NAVIGATION_NOT_FOUND)
    }
    await this.subNavigationRepository.update(id, { is_active: !subNavigation.is_active })
  }

  async remove(id: number): Promise<void> {
    const subNavigation = await this.subNavigationRepository.findOne({ where: { id } })
    if (!subNavigation) {
      throwAppException('SUB_NAVIGATION_NOT_FOUND', ErrorCode.SUB_NAVIGATION_NOT_FOUND)
    }
    await this.subNavigationRepository.delete(id)
  }
}
