import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { StudyLink } from './study-link.entity'
import { CreateStudyLinkDto } from './dtos/create-study-link.dto'
import { UpdateStudyLinkDto } from './dtos/update-study-link.dto'
import { PaginateStudyLinkDto } from './dtos/paginate-study-link.dto'
import { paginate, PaginationMeta } from 'src/common/pagination'
import { IStudyLink } from './study-link.interface'
@Injectable()
export class StudyLinkService {
  constructor(
    @InjectRepository(StudyLink)
    private readonly studyLinkRepository: Repository<StudyLink>,
  ) {}

  async createStudyLink(createStudyLinkDto: CreateStudyLinkDto): Promise<IStudyLink> {
    const studyLink = this.studyLinkRepository.create(createStudyLinkDto)
    const savedStudyLink = await this.studyLinkRepository.save(studyLink)
    const formatStudyLink = {
      id: savedStudyLink.id,
      title: savedStudyLink.title,
      content: savedStudyLink.content,
      icon: savedStudyLink.icon,
      image: savedStudyLink.image,
      url: savedStudyLink.url,
    }
    return formatStudyLink
  }

  async getManyStudyLink(params: PaginateStudyLinkDto): Promise<{ data: IStudyLink[]; meta: PaginationMeta }> {
    const queryBuilder = this.studyLinkRepository
      .createQueryBuilder('study_link')
      .select(['study_link.id', 'study_link.title', 'study_link.content', 'study_link.icon', 'study_link.image', 'study_link.url'])

    const { data, meta } = await paginate(queryBuilder, params)

    const formatStudyLink = data.map(studyLink => {
      return {
        id: studyLink.id,
        title: studyLink.title,
        content: studyLink.content,
        icon: studyLink.icon,
        image: studyLink.image,
        url: studyLink.url,
      }
    })

    return {
      data: formatStudyLink,
      meta,
    }
  }

  async getStudyLinkById(id: number): Promise<IStudyLink> {
    const studyLink = await this.studyLinkRepository.findOne({ where: { id } })
    if (!studyLink) {
      throw new NotFoundException('Study link not found')
    }

    const formatStudyLink = {
      id: studyLink.id,
      title: studyLink.title,
      content: studyLink.content,
      icon: studyLink.icon,
      image: studyLink.image,
      url: studyLink.url,
    }
    return formatStudyLink
  }

  async updateStudyLink(id: number, updateStudyLinkDto: UpdateStudyLinkDto): Promise<void> {
    const isExist = await this.studyLinkRepository.exists({ where: { id } })
    if (!isExist) {
      throw new NotFoundException('STUDY_LINK_NOT_FOUND')
    }
    await this.studyLinkRepository.update(id, updateStudyLinkDto)
  }

  async deleteStudyLink(id: number): Promise<void> {
    const isExist = await this.studyLinkRepository.exists({ where: { id } })
    if (!isExist) {
      throw new NotFoundException('STUDY_LINK_NOT_FOUND')
    }
    await this.studyLinkRepository.delete(id)
  }
}
