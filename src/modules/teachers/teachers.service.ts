import { HttpStatus, Injectable } from '@nestjs/common'

import { paginate } from '@common/pagination'
import { hashPassword, throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { Role } from '@enums/role.enum'
import { UserStatus } from '@enums/status.enum'
import { User } from '@modules/users/user.entity'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { CreateTeachersDto } from './dtos/create-teachers.dto'
import { PaginateTeachersDto } from './dtos/paginate-teachers.dto'
import { UpdateTeachersDto } from './dtos/update-teachers.dto'
import { Teacher } from './teachers.entity'
import { Classes } from '../class/class.entity'

@Injectable()
export class TeachersService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
  ) {}

  async createTeacher(createTeacherDto: CreateTeachersDto): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const {
        other_name,
        degree,
        specialized,
        professional_certificate,
        teacher_certificate,
        subject_teaching,
        boarding,
        start_date,
        cv,
        ...userData
      } = createTeacherDto
      const { password, email, code, ...rest } = userData

      // Kiểm tra email đã tồn tại
      if (email) {
        const existingUser = await queryRunner.manager
          .getRepository(User)
          .createQueryBuilder('users')
          .where('users.email = :email', { email })
          .getOne()

        if (existingUser) throwAppException('EMAIL_ALREADY_EXISTS', ErrorCode.EMAIL_ALREADY_EXISTS, HttpStatus.CONFLICT)
      }

      // Kiểm tra code đã tồn tại
      if (!code) throwAppException('CODE_IS_REQUIRED', ErrorCode.CODE_IS_REQUIRED, HttpStatus.BAD_REQUEST)
      if (code) {
        const existingUser = await queryRunner.manager.getRepository(User).createQueryBuilder('users').where('users.code = :code', { code }).getOne()

        if (existingUser) throwAppException('CODE_ALREADY_EXISTS', ErrorCode.CODE_ALREADY_EXISTS, HttpStatus.CONFLICT)
      }

      const hashedPassword = await hashPassword(password ?? code)
      const user = queryRunner.manager.getRepository(User).create({
        password: hashedPassword,
        role: Role.TEACHER,
        status: UserStatus.ACTIVE,
        email,
        code,
        ...rest,
      })

      await queryRunner.manager.save(User, user)

      const teacher = queryRunner.manager.getRepository(Teacher).create({
        user_id: user.id,
        other_name,
        degree,
        specialized,
        professional_certificate,
        teacher_certificate,
        subject_teaching,
        boarding,
        start_date,
        cv,
      })

      await queryRunner.manager.save(Teacher, teacher)

      await queryRunner.commitTransaction()
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async updateTeacher(id: number, updateTeacherDto: UpdateTeachersDto): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const {
        other_name,
        degree,
        specialized,
        professional_certificate,
        teacher_certificate,
        subject_teaching,
        boarding,
        start_date,
        cv,
        ...userData
      } = updateTeacherDto
      const { email, ...rest } = userData

      const teacher = await queryRunner.manager.getRepository(Teacher).findOne({ where: { id } })
      if (!teacher) throwAppException('TEACHER_NOT_FOUND', ErrorCode.TEACHER_NOT_FOUND, HttpStatus.NOT_FOUND)

      const user = await queryRunner.manager.getRepository(User).findOne({ where: { id: teacher.user_id } })
      if (!user) throwAppException('USER_NOT_FOUND', ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND)

      // Check duplicate email
      if (email) {
        const existingUser = await queryRunner.manager
          .getRepository(User)
          .createQueryBuilder('users')
          .where('users.email = :email', { email })
          .andWhere('users.id != :id', { id: user.id })
          .getOne()
        if (existingUser) throwAppException('EMAIL_ALREADY_EXISTS', ErrorCode.EMAIL_ALREADY_EXISTS, HttpStatus.CONFLICT)
      }

      const updatedUser = queryRunner.manager.getRepository(User).merge(user, {
        email: email ?? user.email,
        ...rest,
      })
      await queryRunner.manager.save(User, updatedUser)

      const updatedTeacher = queryRunner.manager.getRepository(Teacher).merge(teacher, {
        other_name: other_name ?? teacher.other_name,
        degree: degree ?? teacher.degree,
        specialized: specialized ?? teacher.specialized,
        professional_certificate: professional_certificate ?? teacher.professional_certificate,
        teacher_certificate: teacher_certificate ?? teacher.teacher_certificate,
        subject_teaching: subject_teaching ?? teacher.subject_teaching,
        boarding: boarding ?? teacher.boarding,
        start_date: start_date ?? teacher.start_date,
        cv: cv ?? teacher.cv,
      })
      await queryRunner.manager.save(Teacher, updatedTeacher)
      await queryRunner.commitTransaction()
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async deleteTeacher(id: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner()
    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const classes = await queryRunner.manager.getRepository(Classes).exists({ where: { teacher_id: id } })
      if (classes) throwAppException('TEACHER_HAS_CLASSES', ErrorCode.TEACHER_HAS_CLASSES, HttpStatus.BAD_REQUEST)

      const teacher = await queryRunner.manager.getRepository(Teacher).findOne({ where: { id } })
      if (!teacher) throwAppException('TEACHER_NOT_FOUND', ErrorCode.TEACHER_NOT_FOUND, HttpStatus.NOT_FOUND)

      await queryRunner.manager.getRepository(Teacher).update(id, { deleted_at: new Date() })
      await queryRunner.commitTransaction()
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }

  async getTeacherById(id: number) {
    const teacher = await this.teacherRepository
      .createQueryBuilder('teachers')
      .leftJoinAndSelect('teachers.user', 'user')
      .where('teachers.id = :id', { id })
      .getOne()
    if (!teacher) throwAppException('TEACHER_NOT_FOUND', ErrorCode.TEACHER_NOT_FOUND, HttpStatus.NOT_FOUND)

    const formattedTeacher = {
      id: teacher.id,
      code: teacher.user.code,
      full_name: teacher.user.full_name,
      email: teacher.user.email,
      gender: teacher.user.gender,
      phone_number: teacher.user.phone_number,
      status: teacher.user.status,
      saint_name: teacher.user.saint_name,
      address: teacher.user.address,
      avatar: teacher.user.avatar,
      birth_place: teacher.user.birth_place,
      birth_date: teacher.user.birth_date,
      parish: teacher.user.parish,
      deanery: teacher.user.deanery,
      diocese: teacher.user.diocese,
      congregation: teacher.user.congregation,
      other_name: teacher.other_name,
      degree: teacher.degree,
      specialized: teacher.specialized,
      professional_certificate: teacher.professional_certificate,
      teacher_certificate: teacher.teacher_certificate,
      subject_teaching: teacher.subject_teaching,
      boarding: teacher.boarding,
      start_date: teacher.start_date,
      cv: teacher.cv,
    }
    return formattedTeacher
  }

  async getTeachers(paginateTeachersDto: PaginateTeachersDto) {
    const { full_name, email, phone_number, status, ...rest } = paginateTeachersDto
    const query = this.teacherRepository
      .createQueryBuilder('teachers')
      .leftJoinAndSelect('teachers.user', 'user')
      .where('teachers.deleted_at IS NULL')

    if (full_name) {
      query.andWhere('user.full_name LIKE :full_name', { full_name: `%${full_name}%` })
    }

    if (email) {
      query.andWhere('user.email = :email', { email })
    }

    if (phone_number) {
      query.andWhere('user.phone_number = :phone_number', { phone_number })
    }

    if (status) {
      query.andWhere('user.status = :status', { status })
    }

    const { data, meta } = await paginate(query, rest)

    const formattedTeachers = data.map(teacher => ({
      id: teacher.id,
      code: teacher.user.code,
      full_name: teacher.user.full_name,
      email: teacher.user.email,
      gender: teacher.user.gender,
      phone_number: teacher.user.phone_number,
      status: teacher.user.status,
      saint_name: teacher.user.saint_name,
      address: teacher.user.address,
      avatar: teacher.user.avatar,
      birth_place: teacher.user.birth_place,
      birth_date: teacher.user.birth_date,
      parish: teacher.user.parish,
      deanery: teacher.user.deanery,
      diocese: teacher.user.diocese,
      congregation: teacher.user.congregation,
      other_name: teacher.other_name,
      degree: teacher.degree,
      specialized: teacher.specialized,
      professional_certificate: teacher.professional_certificate,
      teacher_certificate: teacher.teacher_certificate,
      subject_teaching: teacher.subject_teaching,
      boarding: teacher.boarding,
      start_date: teacher.start_date,
      cv: teacher.cv,
    }))

    return {
      data: formattedTeachers,
      meta,
    }
  }
}
