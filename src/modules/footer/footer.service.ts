import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Footer } from './footer.entity'
import { CreateFooterDto } from './dtos/craete-footer.dto'
import { UpdateFooterDto } from './dtos/update-footer.dto'
import { FooterEnum } from '@enums/footer.enum'
import { IFooter } from './footer.interface'

@Injectable()
export class FooterService {
  constructor(
    @InjectRepository(Footer)
    private readonly footerRepository: Repository<Footer>,
  ) {}

  async createFooter(footerData: CreateFooterDto): Promise<Footer> {
    const { type, ...rest } = footerData
    const existingFooter = await this.footerRepository.findOne({
      where: { type },
    })

    if (existingFooter) {
      const updateFooter = await this.updateFooter(Number(existingFooter.id), rest)
      return updateFooter
    }

    const newFooter = this.footerRepository.create(footerData)
    return this.footerRepository.save(newFooter)
  }

  async updateFooter(id: number, footerData: UpdateFooterDto): Promise<Footer> {
    const footerToUpdate = await this.footerRepository.findOne({
      where: { id },
    })

    if (!footerToUpdate) {
      throw new NotFoundException(`Footer with ID ${id} not found.`)
    }

    await this.footerRepository.update(id, footerData)

    return this.footerRepository.findOne({ where: { id } })
  }

  async getFooter(): Promise<IFooter[]> {
    return this.footerRepository.find()
  }

  async getFooterByType(type: FooterEnum): Promise<IFooter> {
    return this.footerRepository.findOne({ where: { type } })
  }
}
