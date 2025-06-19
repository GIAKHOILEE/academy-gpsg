import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Classes } from './class.entity'
import { CreateClassDto } from './dtos/create-class.dto'
import { Subject } from '@modules/subjects/subjects.entity'
import { Teacher } from '@modules/teachers/teachers.entity'
import { Department } from '@modules/departments/departments.entity'
import { IClasses } from './class.interface'
import { UpdateClassDto } from './dtos/update-class.dto'
import { PaginateClassDto } from './dtos/paginate-class.dto'
import { paginate, PaginationMeta } from '@common/pagination'

@Injectable()
export class ClassService {
  constructor(
    @InjectRepository(Classes)
    private classRepository: Repository<Classes>,
    @InjectRepository(Subject)
    private subjectRepository: Repository<Subject>,
    @InjectRepository(Teacher)
    private teacherRepository: Repository<Teacher>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
  ) {}

  async createClass(createClassDto: CreateClassDto): Promise<IClasses> {
    const { code, subject_id, teacher_id, department_id, ...rest } = createClassDto

    const existingClass = await this.classRepository.findOne({ where: { code } })
    if (existingClass) throw new BadRequestException('CLASS_CODE_ALREADY_EXISTS')

    const subject = await this.subjectRepository
      .createQueryBuilder('subjects')
      .select(['subjects.id', 'subjects.code', 'subjects.name'])
      .where('subjects.id = :id', { id: subject_id })
      .getOne()
    if (!subject) throw new NotFoundException('SUBJECT_NOT_FOUND')
    const teacher = await this.teacherRepository
      .createQueryBuilder('teachers')
      .leftJoinAndSelect('teachers.user', 'user')
      .select(['teachers.id', 'teachers.user.code', 'teachers.user.full_name'])
      .where('teachers.id = :id', { id: teacher_id })
      .getOne()
    if (!teacher) throw new NotFoundException('TEACHER_NOT_FOUND')
    const department = await this.departmentRepository
      .createQueryBuilder('departments')
      .select(['departments.id', 'departments.code', 'departments.name'])
      .where('departments.id = :id', { id: department_id })
      .getOne()
    if (!department) throw new NotFoundException('DEPARTMENT_NOT_FOUND')

    const classEntity = this.classRepository.create({ ...rest, code, subject, teacher, department })
    const savedClass = await this.classRepository.save(classEntity)

    const formattedClass: IClasses = {
      id: savedClass.id,
      name: savedClass.name,
      code: savedClass.code,
      status: savedClass.status,
      classroom: savedClass.classroom,
      scholastic: savedClass.scholastic,
      semester: savedClass.semester,
      opening_day: savedClass.opening_day,
      closing_day: savedClass.closing_day,
      subject: {
        id: subject.id,
        code: subject.code,
        name: subject.name,
      },
      teacher: {
        id: teacher.id,
        code: teacher.user.code,
        full_name: teacher.user.full_name,
        email: teacher.user.email,
      },
      department: {
        id: department.id,
        code: department.code,
        name: department.name,
      },
    }
    return formattedClass
  }

  async updateClass(id: number, updateClassDto: UpdateClassDto): Promise<void> {
    const { code, subject_id, teacher_id, department_id, ...rest } = updateClassDto

    const existingClass = await this.classRepository.findOne({ where: { id } })
    if (!existingClass) throw new NotFoundException('CLASS_NOT_FOUND')

    if (subject_id) {
      const subject = await this.subjectRepository.exists({ where: { id: subject_id } })
      if (!subject) throw new NotFoundException('SUBJECT_NOT_FOUND')
    }
    if (teacher_id) {
      const teacher = await this.teacherRepository.exists({ where: { id: teacher_id } })
      if (!teacher) throw new NotFoundException('TEACHER_NOT_FOUND')
    }
    if (department_id) {
      const department = await this.departmentRepository.exists({ where: { id: department_id } })
      if (!department) throw new NotFoundException('DEPARTMENT_NOT_FOUND')
    }

    await this.classRepository.update(id, { ...rest, code, subject_id, teacher_id, department_id })
  }

  async deleteClass(id: number): Promise<void> {
    const existingClass = await this.classRepository.exists({ where: { id } })
    if (!existingClass) throw new NotFoundException('CLASS_NOT_FOUND')

    await this.classRepository.delete(id)
  }

  async getClassById(id: number): Promise<IClasses> {
    const classEntity = await this.classRepository
      .createQueryBuilder('classes')
      .leftJoinAndSelect('classes.subject', 'subject')
      .leftJoinAndSelect('classes.teacher', 'teacher')
      .leftJoinAndSelect('classes.department', 'department')
      .where('classes.id = :id', { id })
      .getOne()
    if (!classEntity) throw new NotFoundException('CLASS_NOT_FOUND')

    const formattedClass: IClasses = {
      id: classEntity.id,
      name: classEntity.name,
      code: classEntity.code,
      status: classEntity.status,
      classroom: classEntity.classroom,
      scholastic: classEntity.scholastic,
      semester: classEntity.semester,
      opening_day: classEntity.opening_day,
      closing_day: classEntity.closing_day,
      subject: {
        id: classEntity.subject.id,
        code: classEntity.subject.code,
        name: classEntity.subject.name,
      },
      teacher: {
        id: classEntity.teacher.id,
        code: classEntity.teacher.user.code,
        full_name: classEntity.teacher.user.full_name,
        email: classEntity.teacher.user.email,
      },
      department: {
        id: classEntity.department.id,
        code: classEntity.department.code,
        name: classEntity.department.name,
      },
    }
    return formattedClass
  }

  async getAllClasses(paginateClassDto: PaginateClassDto, is_admin: boolean): Promise<{ data: IClasses[]; meta: PaginationMeta }> {
    const { subject_id, teacher_id, department_id, ...rest } = paginateClassDto

    const query = this.classRepository
      .createQueryBuilder('classes')
      .leftJoinAndSelect('classes.subject', 'subject')
      .leftJoinAndSelect('classes.teacher', 'teacher')
      .leftJoinAndSelect('classes.department', 'department')

    if (subject_id) {
      query.andWhere('subject.id = :subject_id', { subject_id })
    }
    if (teacher_id) {
      query.andWhere('teacher.id = :teacher_id', { teacher_id })
    }
    if (department_id) {
      query.andWhere('department.id = :department_id', { department_id })
    }

    if (!is_admin) {
      query.andWhere('classes.is_active = :is_active', { is_active: true })
    }

    const { data, meta } = await paginate(query, rest)

    const formattedClasses: IClasses[] = data.map((classEntity: Classes) => ({
      id: classEntity.id,
      name: classEntity.name,
      code: classEntity.code,
      status: classEntity.status,
      classroom: classEntity.classroom,
      scholastic: classEntity.scholastic,
      semester: classEntity.semester,
      opening_day: classEntity.opening_day,
      closing_day: classEntity.closing_day,
      subject: {
        id: classEntity.subject.id,
        code: classEntity.subject.code,
        name: classEntity.subject.name,
      },
      teacher: {
        id: classEntity.teacher.id,
        code: classEntity.teacher.user.code,
        full_name: classEntity.teacher.user.full_name,
        email: classEntity.teacher.user.email,
      },
      department: {
        id: classEntity.department.id,
        code: classEntity.department.code,
        name: classEntity.department.name,
      },
    }))
    return { data: formattedClasses, meta }
  }
}
