import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { NavigationSubAttendance } from './navigation-sub.entity'
import { CreateSubNavigationAttendanceDto } from '../dtos/sub-navigation.dto'
import { UpdateSubNavigationAttendanceDto } from '../dtos/sub-navigation.dto'
import { INavigationAttendance, ISubNavigationAttendance } from '../navigation.interface'
import { NavigationParentAttendanceService } from '../navigation-parent/navigation-parent.service'
import { FilterSubNavigationAttendanceDto } from '../dtos/sub-navigation.dto'
import { convertToSlug, throwAppException } from 'src/common/utils'
import { NavigationParentAttendance } from '../navigation-parent/navigation-parent.entity'
import { ErrorCode } from '@enums/error-codes.enum'
@Injectable()
export class NavigationSubAttendanceService {
  constructor(
    @InjectRepository(NavigationSubAttendance)
    private subNavigationRepository: Repository<NavigationSubAttendance>,
    private navigationService: NavigationParentAttendanceService,
  ) {}

  async findAll(filterSubNavigationDto: FilterSubNavigationAttendanceDto, isAdmin: boolean): Promise<ISubNavigationAttendance[]> {
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
      id: sub.id,
      index: sub.index,
      slug: sub.slug,
      title: sub.title,
      // content: sub.content,
      link: sub.link,
      is_active: sub.is_active,
      // navigationId: sub.navigation.id,
    }))
  }

  async findOne(id: number): Promise<ISubNavigationAttendance> {
    const subNavigation = await this.subNavigationRepository
      .createQueryBuilder('sub_navigation')
      .leftJoin('sub_navigation.navigation', 'navigation')
      .select([
        'sub_navigation.id',
        'sub_navigation.index',
        'sub_navigation.slug',
        'sub_navigation.title',
        'sub_navigation.content',
        'sub_navigation.link',
        'sub_navigation.is_active',
        'navigation.id',
      ])
      .where('sub_navigation.id = :id', { id })
      .orderBy('sub_navigation.index', 'ASC')
      .getOne()
    if (!subNavigation) {
      throwAppException('SUB_NAVIGATION_ATTENDANCE_NOT_FOUND', ErrorCode.SUB_NAVIGATION_ATTENDANCE_NOT_FOUND)
    }
    return {
      id: subNavigation.id,
      index: subNavigation.index,
      slug: subNavigation.slug,
      title: subNavigation.title,
      content: subNavigation.content,
      link: subNavigation.link,
      is_active: subNavigation.is_active,
      navigationId: subNavigation.navigation.id,
    }
  }

  async create(createSubNavigationDto: CreateSubNavigationAttendanceDto): Promise<ISubNavigationAttendance> {
    const { title, navigationId, content } = createSubNavigationDto
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
      throwAppException('NAVIGATION_ATTENDANCE_NOT_FOUND', ErrorCode.NAVIGATION_ATTENDANCE_NOT_FOUND)
    }
    const existingSubNavigation = await this.subNavigationRepository.findOne({ where: { title } })
    if (existingSubNavigation) {
      throwAppException('SUB_NAVIGATION_ATTENDANCE_ALREADY_EXISTS', ErrorCode.SUB_NAVIGATION_ATTENDANCE_ALREADY_EXISTS)
    }
    const newSubNavigation = this.subNavigationRepository.create({
      ...createSubNavigationDto,
      content,
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

  async update(id: number, updateSubNavigationDto: UpdateSubNavigationAttendanceDto): Promise<void> {
    const { navigationId, ...rest } = updateSubNavigationDto
    const subNavigation = await this.subNavigationRepository.findOne({ where: { id } })
    if (!subNavigation) {
      throwAppException('SUB_NAVIGATION_ATTENDANCE_NOT_FOUND', ErrorCode.SUB_NAVIGATION_ATTENDANCE_NOT_FOUND)
    }
    let navigation: INavigationAttendance = subNavigation.navigation as unknown as INavigationAttendance
    if (navigationId) {
      navigation = await this.navigationService.findOne(navigationId, true)
      if (!navigation) {
        throwAppException('NAVIGATION_ATTENDANCE_NOT_FOUND', ErrorCode.NAVIGATION_ATTENDANCE_NOT_FOUND)
      }
    }
    Object.assign(subNavigation, { slug: convertToSlug(rest.title), ...rest })
    if (navigationId) {
      subNavigation.navigation = navigation as unknown as NavigationParentAttendance
    }

    await this.subNavigationRepository.save(subNavigation)
  }

  async updateIndex(id: number, index: number): Promise<void> {
    const subNavigation = await this.findOne(id)
    if (!subNavigation) {
      throwAppException('SUB_NAVIGATION_ATTENDANCE_NOT_FOUND', ErrorCode.SUB_NAVIGATION_ATTENDANCE_NOT_FOUND)
    }
    await this.subNavigationRepository.update(id, { index })
  }

  async updateActive(id: number): Promise<void> {
    const subNavigation = await this.findOne(id)
    if (!subNavigation) {
      throwAppException('SUB_NAVIGATION_ATTENDANCE_NOT_FOUND', ErrorCode.SUB_NAVIGATION_ATTENDANCE_NOT_FOUND)
    }
    await this.subNavigationRepository.update(id, { is_active: !subNavigation.is_active })
  }

  async remove(id: number): Promise<void> {
    const subNavigation = await this.subNavigationRepository.findOne({ where: { id } })
    if (!subNavigation) {
      throwAppException('SUB_NAVIGATION_ATTENDANCE_NOT_FOUND', ErrorCode.SUB_NAVIGATION_ATTENDANCE_NOT_FOUND)
    }
    await this.subNavigationRepository.delete(id)
  }
}
