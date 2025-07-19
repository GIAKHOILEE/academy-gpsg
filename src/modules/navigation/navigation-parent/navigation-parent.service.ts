import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { NavigationParent } from './navigation-parent.entity'
import { CreateNavigationDto, FilterNavigationDto } from '../dtos/navigation.dto'
import { UpdateNavigationDto } from '../dtos/navigation.dto'
import { INavigation } from '../navigation.interface'
import { convertToSlug } from 'src/common/utils'
import { paginate } from 'src/common/pagination'
@Injectable()
export class NavigationParentService {
  constructor(
    @InjectRepository(NavigationParent)
    private navigationRepository: Repository<NavigationParent>,
  ) {}

  async findAll(filterNavigationDto: FilterNavigationDto, isAdmin: boolean): Promise<INavigation[]> {
    const { title } = filterNavigationDto
    const queryBuilder = this.navigationRepository.createQueryBuilder('navigation').leftJoinAndSelect('navigation.subNavigations', 'subNavigations')
    if (title) {
      queryBuilder.andWhere('navigation.title LIKE :title', { title: `%${title}%` })
    }
    if (!isAdmin) {
      queryBuilder.andWhere('navigation.is_active = :isActive', { isActive: true })
    }
    const navigations = await paginate(queryBuilder, {
      ...filterNavigationDto,
      orderBy: filterNavigationDto.orderBy || 'index',
      orderDirection: filterNavigationDto.orderDirection || 'ASC',
    })
    const navigationsWithSubNavigations = navigations.data.map(navigation => ({
      id: navigation.id,
      index: navigation.index,
      slug: navigation.slug,
      title: navigation.title,
      link: navigation.link,
      is_active: navigation.is_active,
      subNavigations: navigation.subNavigations
        .sort((a, b) => a.index - b.index)
        .map(sub => ({
          ...sub,
          navigationId: navigation.id,
        })),
    }))
    return navigationsWithSubNavigations
  }

  async findOne(id: number, isAdmin: boolean): Promise<INavigation> {
    const queryBuilder = this.navigationRepository
      .createQueryBuilder('navigation')
      .leftJoinAndSelect('navigation.subNavigations', 'subNavigations')
      .where('navigation.id = :id', { id })
    if (!isAdmin) {
      queryBuilder.andWhere('navigation.is_active = :isActive', { isActive: true })
    }
    const navigation = await queryBuilder.getOne()

    if (!navigation) {
      throw new NotFoundException(`Navigation with ID ${id} not found`)
    }
    const navigationWithSubNavigations = {
      ...navigation,
      subNavigations: navigation.subNavigations
        .sort((a, b) => a.index - b.index)
        .map(sub => ({
          ...sub,
          navigationId: navigation.id,
        })),
    } as INavigation
    return navigationWithSubNavigations
  }

  async create(createNavigationDto: CreateNavigationDto): Promise<INavigation> {
    const { title, link } = createNavigationDto
    const navigation = await this.navigationRepository.createQueryBuilder('navigation').select('MAX(navigation.`index`) as maxIndex').getRawOne()

    let maxIndex = 1.0001
    if (navigation?.maxIndex) {
      maxIndex = navigation.maxIndex + 100
    }
    createNavigationDto.index = maxIndex

    const existingNavigation = await this.navigationRepository.findOne({ where: { title } })
    if (existingNavigation) {
      throw new BadRequestException('Navigation already exists')
    }

    const newNavigation = {
      title,
      link,
      index: maxIndex,
      slug: convertToSlug(title),
      is_active: true,
    } as INavigation

    return this.navigationRepository.save(newNavigation)
  }

  async update(id: number, updateNavigationDto: UpdateNavigationDto): Promise<INavigation> {
    const navigation = await this.findOne(id, true)
    Object.assign(navigation, { ...updateNavigationDto, slug: convertToSlug(updateNavigationDto.title) })
    return this.navigationRepository.save(navigation)
  }

  async updateIndex(id: number, index: number): Promise<INavigation> {
    const navigation = await this.findOne(id, true)
    navigation.index = index
    return this.navigationRepository.save(navigation)
  }

  async updateActive(id: number): Promise<void> {
    const navigation = await this.findOne(id, true)
    navigation.is_active = !navigation.is_active
    await this.navigationRepository.save(navigation)
  }

  async remove(id: number): Promise<void> {
    const navigation = await this.navigationRepository.findOne({ where: { id } })
    if (!navigation) {
      throw new BadRequestException('Navigation not found')
    }
    await this.navigationRepository.delete(id)
  }
}
