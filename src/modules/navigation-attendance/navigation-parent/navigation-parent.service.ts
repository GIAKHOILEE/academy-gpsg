import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { NavigationParentAttendance } from './navigation-parent.entity'
import { CreateNavigationAttendanceDto, FilterNavigationAttendanceDto } from '../dtos/navigation.dto'
import { UpdateNavigationAttendanceDto } from '../dtos/navigation.dto'
import { INavigationAttendance } from '../navigation.interface'
import { convertToSlug, throwAppException } from 'src/common/utils'
import { paginate } from 'src/common/pagination'
import { ErrorCode } from '@enums/error-codes.enum'
@Injectable()
export class NavigationParentAttendanceService {
  constructor(
    @InjectRepository(NavigationParentAttendance)
    private navigationRepository: Repository<NavigationParentAttendance>,
  ) {}

  async findAll(filterNavigationDto: FilterNavigationAttendanceDto, isAdmin: boolean): Promise<INavigationAttendance[]> {
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
          id: sub.id,
          index: sub.index,
          slug: sub.slug,
          title: sub.title,
          // content: sub.content,
          link: sub.link,
          is_active: sub.is_active,
          navigationId: navigation.id,
        })),
    }))
    return navigationsWithSubNavigations
  }

  async findOne(id: number, isAdmin: boolean): Promise<INavigationAttendance> {
    const queryBuilder = this.navigationRepository
      .createQueryBuilder('navigation')
      .leftJoinAndSelect('navigation.subNavigations', 'subNavigations')
      .where('navigation.id = :id', { id })
    if (!isAdmin) {
      queryBuilder.andWhere('navigation.is_active = :isActive', { isActive: true })
    }
    const navigation = await queryBuilder.getOne()

    if (!navigation) {
      throwAppException('NAVIGATION_ATTENDANCE_NOT_FOUND', ErrorCode.NAVIGATION_ATTENDANCE_NOT_FOUND)
    }
    const navigationWithSubNavigations = {
      ...navigation,
      subNavigations: navigation.subNavigations
        .sort((a, b) => a.index - b.index)
        .map(sub => ({
          ...sub,
          navigationId: navigation.id,
        })),
    } as INavigationAttendance
    return navigationWithSubNavigations
  }

  async create(createNavigationDto: CreateNavigationAttendanceDto): Promise<INavigationAttendance> {
    const { title, link, content } = createNavigationDto
    const navigation = await this.navigationRepository.createQueryBuilder('navigation').select('MAX(navigation.`index`) as maxIndex').getRawOne()

    let maxIndex = 1.001
    if (navigation?.maxIndex) {
      maxIndex = navigation.maxIndex + 100
    }
    createNavigationDto.index = maxIndex

    const existingNavigation = await this.navigationRepository.findOne({ where: { title } })
    if (existingNavigation) {
      throwAppException('NAVIGATION_ATTENDANCE_ALREADY_EXISTS', ErrorCode.NAVIGATION_ATTENDANCE_ALREADY_EXISTS)
    }

    const newNavigation = {
      title,
      link,
      content,
      index: maxIndex,
      slug: convertToSlug(title),
      is_active: true,
    } as INavigationAttendance

    return this.navigationRepository.save(newNavigation)
  }

  async update(id: number, updateNavigationDto: UpdateNavigationAttendanceDto): Promise<INavigationAttendance> {
    const navigation = await this.findOne(id, true)
    Object.assign(navigation, { ...updateNavigationDto, slug: convertToSlug(updateNavigationDto.title) })
    return this.navigationRepository.save(navigation)
  }

  async updateIndex(id: number, index: number): Promise<INavigationAttendance> {
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
      throwAppException('NAVIGATION_ATTENDANCE_NOT_FOUND', ErrorCode.NAVIGATION_ATTENDANCE_NOT_FOUND)
    }
    await this.navigationRepository.delete(id)
  }
}
