import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Department } from './departments.entity'
import { CreateDepartmentDto } from './dtos/create-department.dto'
import { IDepartment } from './department.interface'
import { paginate, PaginationDto, PaginationMeta } from '@common/pagination'
import { UpdateDepartmentDto } from './dtos/update-department.dto'

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
  ) {}

  async create(createDepartmentDto: CreateDepartmentDto): Promise<IDepartment> {
    const { code, name, description } = createDepartmentDto

    const existingCode = await this.departmentRepository.findOne({ where: { code } })
    if (existingCode) {
      throw new BadRequestException('CODE_ALREADY_EXISTS')
    }

    const existingName = await this.departmentRepository.findOne({ where: { name } })
    if (existingName) {
      throw new BadRequestException('NAME_ALREADY_EXISTS')
    }

    const department = this.departmentRepository.create({ code, name, description })
    return this.departmentRepository.save(department)
  }

  async getAll(pagination: PaginationDto): Promise<{ data: IDepartment[]; meta: PaginationMeta }> {
    const query = this.departmentRepository.createQueryBuilder('department')

    const { data, meta } = await paginate(query, pagination)

    const formattedData: IDepartment[] = data.map((department: Department) => ({
      id: department.id,
      code: department.code,
      name: department.name,
      description: department.description,
    }))

    return { data: formattedData, meta }
  }

  async getById(id: number): Promise<IDepartment> {
    const department = await this.departmentRepository.findOne({ where: { id } })
    if (!department) {
      throw new NotFoundException('DEPARTMENT_NOT_FOUND')
    }

    const formattedData: IDepartment = {
      id: department.id,
      code: department.code,
      name: department.name,
      description: department.description,
    }

    return formattedData
  }

  async update(id: number, updateDepartmentDto: UpdateDepartmentDto): Promise<IDepartment> {
    const { code, name } = updateDepartmentDto

    const department = await this.departmentRepository.findOne({ where: { id } })
    if (!department) {
      throw new NotFoundException('DEPARTMENT_NOT_FOUND')
    }

    if (code) {
      const existingCode = await this.departmentRepository
        .createQueryBuilder('department')
        .where('department.code = :code', { code })
        .andWhere('department.id != :id', { id })
        .getOne()
      if (existingCode) {
        throw new BadRequestException('CODE_ALREADY_EXISTS')
      }
    }

    if (name) {
      const existingName = await this.departmentRepository
        .createQueryBuilder('department')
        .where('department.name = :name', { name })
        .andWhere('department.id != :id', { id })
        .getOne()
      if (existingName) {
        throw new BadRequestException('NAME_ALREADY_EXISTS')
      }
    }

    const updatedDepartment = this.departmentRepository.merge(department, updateDepartmentDto)
    return this.departmentRepository.save(updatedDepartment)
  }

  async delete(id: number): Promise<void> {
    const department = await this.departmentRepository.findOne({ where: { id } })
    if (!department) {
      throw new NotFoundException('DEPARTMENT_NOT_FOUND')
    }
    await this.departmentRepository.delete(id)
  }
}
