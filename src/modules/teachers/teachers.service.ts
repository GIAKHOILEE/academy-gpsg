import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'

import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { Teacher } from './teachers.entity'
import { hashPassword } from '@common/utils'
import { User } from '@modules/users/user.entity'
import { Role } from '@enums/role.enum'
import { UserStatus } from '@enums/status.enum'
import { CreateTeachersDto } from './dtos/create-teachers.dto'
import { UpdateTeachersDto } from './dtos/update-teachers.dto'

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
      const { username, password, email, ...rest } = userData

      // Kiểm tra username đã tồn tại
      if (username) {
        const existingUser = await queryRunner.manager
          .getRepository(User)
          .createQueryBuilder('users')
          .where('users.username = :username', { username })
          .getOne()

        if (existingUser) throw new ConflictException('USER_ALREADY_EXISTS')
      }

      const hashedPassword = await hashPassword(password ?? 'giangvien')
      const user = queryRunner.manager.getRepository(User).create({
        username: username ?? email,
        password: hashedPassword,
        role: Role.TEACHER,
        status: UserStatus.ACTIVE,
        email,
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
      const { username, ...rest } = userData

      const teacher = await queryRunner.manager.getRepository(Teacher).findOne({ where: { id } })
      if (!teacher) throw new NotFoundException('Teacher not found')

      const user = await queryRunner.manager.getRepository(User).findOne({ where: { id: teacher.user_id } })
      if (!user) throw new NotFoundException('User not found')

      const updatedUser = queryRunner.manager.getRepository(User).merge(user, {
        username: username ?? user.username,
        ...rest,
      })
      await queryRunner.manager.save(User, updatedUser)

      const updatedTeacher = queryRunner.manager.getRepository(Teacher).merge(teacher, {
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
      await queryRunner.manager.save(Teacher, updatedTeacher)
      await queryRunner.commitTransaction()
    } catch (error) {
      await queryRunner.rollbackTransaction()
      throw error
    } finally {
      await queryRunner.release()
    }
  }
}
