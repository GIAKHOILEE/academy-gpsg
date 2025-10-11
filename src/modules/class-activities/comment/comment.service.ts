import { HttpStatus, Injectable } from '@nestjs/common'

import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CommentEntity } from './comment.entity'
import { CreateCommentDto } from './dtos/create-comment.dto'
import { ClassActivitiesEntity } from '../class-activities/class-activities.entity'
import { ErrorCode } from '@enums/error-codes.enum'
import { throwAppException } from '@common/utils'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { UpdateCommentDto } from './dtos/update-comment.dto'
import { Role } from '@enums/role.enum'
import { User } from '@modules/users/user.entity'
import { Teacher } from '@modules/teachers/teachers.entity'
import { Student } from '@modules/students/students.entity'

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
    @InjectRepository(ClassActivitiesEntity)
    private readonly classActivitiesRepository: Repository<ClassActivitiesEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ClassStudents)
    private readonly classStudentRepository: Repository<ClassStudents>,
    @InjectRepository(Teacher)
    private readonly teacherRepository: Repository<Teacher>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  async createComment(createCommentDto: CreateCommentDto, role: Role, userId: number): Promise<void> {
    const { class_activities_id } = createCommentDto

    if (role !== Role.STUDENT && role !== Role.TEACHER) {
      throwAppException('ONLY_STUDENT_AND_TEACHER_CAN_COMMENT', ErrorCode.ONLY_STUDENT_AND_TEACHER_CAN_COMMENT, HttpStatus.BAD_REQUEST)
    }

    const classActivities = await this.classActivitiesRepository.findOne({ where: { id: class_activities_id } })
    if (!classActivities) {
      throwAppException('CLASS_ACTIVITIES_NOT_FOUND', ErrorCode.CLASS_ACTIVITIES_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throwAppException('USER_NOT_FOUND', ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    // check if student is in class
    if (role === Role.STUDENT) {
      const student = await this.studentRepository.findOne({ where: { user_id: userId } })
      const classStudent = await this.classStudentRepository.findOne({ where: { class_id: classActivities.class_id, student_id: student.id } })
      if (!classStudent) {
        throwAppException('STUDENT_NOT_IN_CLASS', ErrorCode.STUDENT_NOT_IN_CLASS, HttpStatus.BAD_REQUEST)
      }
    } else if (role === Role.TEACHER) {
      const teacher = await this.teacherRepository.findOne({ where: { user_id: userId } })
      if (!teacher) {
        throwAppException('TEACHER_NOT_FOUND', ErrorCode.TEACHER_NOT_FOUND, HttpStatus.NOT_FOUND)
      }
      if (classActivities.teacher_id !== teacher.id) {
        throwAppException('TEACHER_NOT_IN_CLASS', ErrorCode.TEACHER_NOT_IN_CLASS, HttpStatus.BAD_REQUEST)
      }
    }

    const comment = this.commentRepository.create({
      ...createCommentDto,
      class_activities: classActivities,
      user: user,
      user_id: userId,
      role: role,
    })

    await this.commentRepository.save(comment)
  }

  async updateComment(id: number, updateCommentDto: UpdateCommentDto, role: Role, userId: number): Promise<void> {
    const { class_activities_id } = updateCommentDto

    const comment = await this.commentRepository.findOne({ where: { id } })
    if (!comment) {
      throwAppException('COMMENT_NOT_FOUND', ErrorCode.COMMENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    if (class_activities_id) {
      const classActivities = await this.classActivitiesRepository.findOne({ where: { id: class_activities_id } })
      if (!classActivities) {
        throwAppException('CLASS_ACTIVITIES_NOT_FOUND', ErrorCode.CLASS_ACTIVITIES_NOT_FOUND, HttpStatus.NOT_FOUND)
      }

      comment.class_activities = classActivities
    }
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) {
      throwAppException('USER_NOT_FOUND', ErrorCode.USER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    // check if student is in class
    if (role === Role.STUDENT) {
      const student = await this.studentRepository.findOne({ where: { user_id: userId } })
      const classStudent = await this.classStudentRepository.findOne({ where: { class_id: comment.class_activities.id, student_id: student.id } })
      if (!classStudent) {
        throwAppException('STUDENT_NOT_IN_CLASS', ErrorCode.STUDENT_NOT_IN_CLASS, HttpStatus.BAD_REQUEST)
      }
    } else if (role === Role.TEACHER) {
      const teacher = await this.teacherRepository.findOne({ where: { user_id: userId } })
      if (!teacher) {
        throwAppException('TEACHER_NOT_FOUND', ErrorCode.TEACHER_NOT_FOUND, HttpStatus.NOT_FOUND)
      }
      if (comment.class_activities.teacher_id !== teacher.id) {
        throwAppException('TEACHER_NOT_IN_CLASS', ErrorCode.TEACHER_NOT_IN_CLASS, HttpStatus.BAD_REQUEST)
      }
    }

    await this.commentRepository.update(id, {
      ...updateCommentDto,
      class_activities: comment.class_activities,
      user: user,
      user_id: userId,
    })
  }

  async deleteComment(id: number): Promise<void> {
    const comment = await this.commentRepository.findOne({ where: { id } })
    if (!comment) {
      throwAppException('COMMENT_NOT_FOUND', ErrorCode.COMMENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    await this.commentRepository.delete(id)
  }
}
