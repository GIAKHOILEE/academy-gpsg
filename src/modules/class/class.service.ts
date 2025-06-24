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
import { Scholastic } from './_scholastic/scholastic.entity'
import { Semester } from './_semester/semester.entity'

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
    @InjectRepository(Scholastic)
    private scholasticRepository: Repository<Scholastic>,
    @InjectRepository(Semester)
    private semesterRepository: Repository<Semester>,
  ) {}

  async createClass(createClassDto: CreateClassDto): Promise<IClasses> {
    const { code, subject_id, teacher_id, department_id, scholastic_id, semester_id, ...rest } = createClassDto

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
    const scholastic = await this.scholasticRepository
      .createQueryBuilder('scholastics')
      .select(['scholastics.id', 'scholastics.name'])
      .where('scholastics.id = :id', { id: scholastic_id })
      .getOne()
    if (!scholastic) throw new NotFoundException('SCHOLASTIC_NOT_FOUND')
    const semester = await this.semesterRepository
      .createQueryBuilder('semesters')
      .select(['semesters.id', 'semesters.name'])
      .where('semesters.id = :id', { id: semester_id })
      .getOne()
    if (!semester) throw new NotFoundException('SEMESTER_NOT_FOUND')

    const classEntity = this.classRepository.create({ ...rest, code, subject, teacher, department, scholastic, semester })
    const savedClass = await this.classRepository.save(classEntity)

    const formattedClass: IClasses = {
      id: savedClass.id,
      name: savedClass.name,
      code: savedClass.code,
      status: savedClass.status,
      classroom: savedClass.classroom,
      max_students: savedClass.max_students,
      price: savedClass.price,
      current_students: savedClass.current_students,
      schedule: savedClass.schedule,
      start_time: savedClass.start_time,
      end_time: savedClass.end_time,
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
      scholastic: {
        id: scholastic.id,
        name: scholastic.name,
      },
      semester: {
        id: semester.id,
        name: semester.name,
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
    const { code, subject_id, teacher_id, department_id, scholastic_id, semester_id, ...rest } = updateClassDto

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
    if (scholastic_id) {
      const scholastic = await this.scholasticRepository.exists({ where: { id: scholastic_id } })
      if (!scholastic) throw new NotFoundException('SCHOLASTIC_NOT_FOUND')
    }
    if (semester_id) {
      const semester = await this.semesterRepository.exists({ where: { id: semester_id } })
      if (!semester) throw new NotFoundException('SEMESTER_NOT_FOUND')
    }

    await this.classRepository.update(id, { ...rest, code, subject_id, teacher_id, department_id, scholastic_id, semester_id })
  }

  async updateIsActive(id: number): Promise<void> {
    const existingClass = await this.classRepository.findOne({ where: { id }, select: ['id', 'is_active'] })
    if (!existingClass) throw new NotFoundException('CLASS_NOT_FOUND')

    await this.classRepository.update(id, { is_active: !existingClass.is_active })
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
      .leftJoinAndSelect('classes.scholastic', 'scholastic')
      .leftJoinAndSelect('classes.semester', 'semester')
      .where('classes.id = :id', { id })
      .getOne()
    if (!classEntity) throw new NotFoundException('CLASS_NOT_FOUND')

    const formattedClass: IClasses = {
      id: classEntity.id,
      name: classEntity.name,
      code: classEntity.code,
      status: classEntity.status,
      classroom: classEntity.classroom,
      max_students: classEntity.max_students,
      price: classEntity.price,
      current_students: classEntity.current_students,
      schedule: classEntity.schedule,
      start_time: classEntity.start_time,
      end_time: classEntity.end_time,
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
      scholastic: {
        id: classEntity.scholastic.id,
        name: classEntity.scholastic.name,
      },
      semester: {
        id: classEntity.semester.id,
        name: classEntity.semester.name,
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
    const { subject_id, teacher_id, department_id, scholastic_id, semester_id, ...rest } = paginateClassDto

    const query = this.classRepository
      .createQueryBuilder('classes')
      .leftJoinAndSelect('classes.subject', 'subject')
      .leftJoinAndSelect('classes.teacher', 'teacher')
      .leftJoinAndSelect('classes.department', 'department')
      .leftJoinAndSelect('classes.scholastic', 'scholastic')
      .leftJoinAndSelect('classes.semester', 'semester')

    if (subject_id) {
      query.andWhere('subject.id = :subject_id', { subject_id })
    }
    if (teacher_id) {
      query.andWhere('teacher.id = :teacher_id', { teacher_id })
    }
    if (department_id) {
      query.andWhere('department.id = :department_id', { department_id })
    }
    if (scholastic_id) {
      query.andWhere('scholastic.id = :scholastic_id', { scholastic_id })
    }
    if (semester_id) {
      query.andWhere('semester.id = :semester_id', { semester_id })
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
      max_students: classEntity.max_students,
      price: classEntity.price,
      current_students: classEntity.current_students,
      schedule: classEntity.schedule,
      start_time: classEntity.start_time,
      end_time: classEntity.end_time,
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
      scholastic: {
        id: classEntity.scholastic.id,
        name: classEntity.scholastic.name,
      },
      semester: {
        id: classEntity.semester.id,
        name: classEntity.semester.name,
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
