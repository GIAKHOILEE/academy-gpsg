import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { Student } from '@modules/students/students.entity'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Classes } from '../class.entity'
import { ClassStudents } from './class-student.entity'
import { CreateClassStudentDto } from './dtos/create-class-student.dto'

@Injectable()
export class ClassStudentService {
  constructor(
    @InjectRepository(ClassStudents)
    private readonly classStudentRepository: Repository<ClassStudents>,
    @InjectRepository(Classes)
    private readonly classRepository: Repository<Classes>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
  ) {}

  async createClassStudent(createClassStudentDto: CreateClassStudentDto) {
    const { class_id, student_id } = createClassStudentDto
    // check class
    const classEntity = await this.classRepository.findOne({ where: { id: class_id } })
    if (!classEntity) throwAppException(ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)
    // check student
    const studentEntity = await this.studentRepository.findOne({ where: { id: student_id } })
    if (!studentEntity) throwAppException(ErrorCode.STUDENT_NOT_FOUND, HttpStatus.NOT_FOUND)

    const classStudent = await this.classStudentRepository.save(createClassStudentDto)
    return classStudent
  }
}
