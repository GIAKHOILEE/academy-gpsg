import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Contact } from './contact.entity'
import { CreateContactDto } from './dtos/create-contact.dto'
import { UpdateContactDto } from './dtos/update-contact.dto'
import { IContact } from './contact.interface'

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {}

  async create(createContactDto: CreateContactDto): Promise<Contact> {
    const existingContact = await this.contactRepository.createQueryBuilder('contact').getOne()

    if (existingContact) {
      return this.update(existingContact.id, createContactDto)
    }

    const newContact = this.contactRepository.create(createContactDto)
    return this.contactRepository.save(newContact)
  }

  async update(id: number, updateContactDto: UpdateContactDto): Promise<Contact> {
    await this.contactRepository.update(id, updateContactDto)
    return this.contactRepository.findOne({
      where: { id },
    })
  }

  async getContact(): Promise<IContact> {
    return this.contactRepository.createQueryBuilder('contact').getOne()
  }
}
