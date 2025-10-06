import { HttpStatus, Injectable, NotFoundException } from '@nestjs/common'

import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { CommentEntity } from './comment.entity'
import { CreateCommentDto } from './dtos/create-comment.dto'
import { ClassActivitiesEntity } from '../class-activities/class-activities.entity'
import { ErrorCode } from '@enums/error-codes.enum'
import { throwAppException } from '@common/utils'
import { Student } from '@modules/students/students.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { UpdateCommentDto } from './dtos/update-comment.dto'

@Injectable()
export class CommentService {
  constructor(
    @InjectRepository(CommentEntity)
    private readonly commentRepository: Repository<CommentEntity>,
    @InjectRepository(ClassActivitiesEntity)
    private readonly classActivitiesRepository: Repository<ClassActivitiesEntity>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(ClassStudents)
    private readonly classStudentRepository: Repository<ClassStudents>,
  ) {}

  async createComment(createCommentDto: CreateCommentDto): Promise<void> {
    const { class_activities_id, student_id } = createCommentDto

    const classActivities = await this.classActivitiesRepository.findOne({ where: { id: class_activities_id } })
    if (!classActivities) {
      throwAppException('CLASS_ACTIVITIES_NOT_FOUND', ErrorCode.CLASS_ACTIVITIES_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const student = await this.studentRepository.findOne({ where: { id: student_id } })
    if (!student) {
      throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    // check if student is in class
    const classStudent = await this.classStudentRepository.findOne({ where: { class_id: classActivities.class_id, student_id: student_id } })
    console.log(classStudent)
    if (!classStudent) {
      throwAppException('STUDENT_NOT_IN_CLASS', ErrorCode.STUDENT_NOT_IN_CLASS, HttpStatus.BAD_REQUEST)
    }

    const comment = this.commentRepository.create({
      ...createCommentDto,
      class_activities: classActivities,
      student: student,
    })

    await this.commentRepository.save(comment)
  }

  async updateComment(id: number, updateCommentDto: UpdateCommentDto): Promise<void> {
    const { class_activities_id, student_id } = updateCommentDto

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

    // check if student is in class
    const classStudent = await this.classStudentRepository.findOne({
      where: { class_id: comment.class_activities.id, student_id: comment.student.id },
    })
    if (!classStudent) {
      throwAppException('STUDENT_NOT_IN_CLASS', ErrorCode.STUDENT_NOT_IN_CLASS, HttpStatus.BAD_REQUEST)
    }

    if (student_id) {
      const student = await this.studentRepository.findOne({ where: { id: student_id } })
      if (!student) {
        throwAppException('STUDENT_NOT_FOUND', ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)
      }
      comment.student = student
    }

    await this.commentRepository.update(id, {
      ...updateCommentDto,
      class_activities: comment.class_activities,
      student: comment.student,
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
