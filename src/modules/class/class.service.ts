import { paginate, PaginationMeta } from '@common/pagination'
import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { Department } from '@modules/departments/departments.entity'
import { Subject } from '@modules/subjects/subjects.entity'
import { Teacher } from '@modules/teachers/teachers.entity'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Scholastic } from './_scholastic/scholastic.entity'
import { Semester } from './_semester/semester.entity'
import { Classes } from './class.entity'
import { IClasses } from './class.interface'
import { CreateClassDto } from './dtos/create-class.dto'
import { GetStudentsOfClassDto, PaginateClassDto } from './dtos/paginate-class.dto'
import { UpdateClassDto } from './dtos/update-class.dto'
import { IStudent } from '@modules/students/students.interface'
import { ClassStudents } from './class-students/class-student.entity'

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
    @InjectRepository(ClassStudents)
    private classStudentsRepository: Repository<ClassStudents>,
  ) {}

  async createClass(createClassDto: CreateClassDto): Promise<IClasses> {
    const { code, subject_id, teacher_id, department_id, scholastic_id, semester_id, ...rest } = createClassDto

    const existingClass = await this.classRepository.findOne({ where: { code } })
    if (existingClass) throwAppException('CLASS_CODE_ALREADY_EXISTS', ErrorCode.CLASS_CODE_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)

    const subject = await this.subjectRepository
      .createQueryBuilder('subjects')
      .select(['subjects.id', 'subjects.code', 'subjects.name', 'subjects.credit'])
      .where('subjects.id = :id', { id: subject_id })
      .getOne()
    if (!subject) throwAppException('SUBJECT_NOT_FOUND', ErrorCode.SUBJECT_NOT_FOUND, HttpStatus.NOT_FOUND)
    const teacher = await this.teacherRepository
      .createQueryBuilder('teachers')
      .leftJoinAndSelect('teachers.user', 'user')
      .select(['teachers.id', 'user.code', 'user.full_name', 'user.email'])
      .where('teachers.id = :id', { id: teacher_id })
      .getOne()
    if (!teacher) throwAppException('TEACHER_NOT_FOUND', ErrorCode.TEACHER_NOT_FOUND, HttpStatus.NOT_FOUND)
    const department = await this.departmentRepository
      .createQueryBuilder('departments')
      .select(['departments.id', 'departments.code', 'departments.name'])
      .where('departments.id = :id', { id: department_id })
      .getOne()
    if (!department) throwAppException('DEPARTMENT_NOT_FOUND', ErrorCode.DEPARTMENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    const scholastic = await this.scholasticRepository
      .createQueryBuilder('scholastics')
      .select(['scholastics.id', 'scholastics.name'])
      .where('scholastics.id = :id', { id: scholastic_id })
      .getOne()
    if (!scholastic) throwAppException('SCHOLASTIC_NOT_FOUND', ErrorCode.SCHOLASTIC_NOT_FOUND, HttpStatus.NOT_FOUND)
    const semester = await this.semesterRepository
      .createQueryBuilder('semesters')
      .select(['semesters.id', 'semesters.name'])
      .where('semesters.id = :id', { id: semester_id })
      .getOne()
    if (!semester) throwAppException('SEMESTER_NOT_FOUND', ErrorCode.SEMESTER_NOT_FOUND, HttpStatus.NOT_FOUND)

    const classEntity = this.classRepository.create({ ...rest, code, subject, teacher, department, scholastic, semester })
    const savedClass = await this.classRepository.save(classEntity)

    const formattedClass: IClasses = {
      id: savedClass.id,
      name: subject.name, // tên lớp là tên môn học
      code: savedClass.code,
      image: savedClass.image,
      status: savedClass.status,
      classroom: savedClass.classroom,
      credit: subject.credit,
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
        credit: subject.credit,
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
    if (!existingClass) throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)

    if (subject_id) {
      const subject = await this.subjectRepository.exists({ where: { id: subject_id } })
      if (!subject) throwAppException('SUBJECT_NOT_FOUND', ErrorCode.SUBJECT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    if (teacher_id) {
      const teacher = await this.teacherRepository.exists({ where: { id: teacher_id } })
      if (!teacher) throwAppException('TEACHER_NOT_FOUND', ErrorCode.TEACHER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    if (department_id) {
      const department = await this.departmentRepository.exists({ where: { id: department_id } })
      if (!department) throwAppException('DEPARTMENT_NOT_FOUND', ErrorCode.DEPARTMENT_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    if (scholastic_id) {
      const scholastic = await this.scholasticRepository.exists({ where: { id: scholastic_id } })
      if (!scholastic) throwAppException('SCHOLASTIC_NOT_FOUND', ErrorCode.SCHOLASTIC_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    if (semester_id) {
      const semester = await this.semesterRepository.exists({ where: { id: semester_id } })
      if (!semester) throwAppException('SEMESTER_NOT_FOUND', ErrorCode.SEMESTER_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    await this.classRepository.update(id, { ...rest, code, subject_id, teacher_id, department_id, scholastic_id, semester_id })
  }

  async updateIsActive(id: number): Promise<void> {
    const existingClass = await this.classRepository.findOne({ where: { id }, select: ['id', 'is_active'] })
    if (!existingClass) throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)

    await this.classRepository.update(id, { is_active: !existingClass.is_active })
  }

  async deleteClass(id: number): Promise<void> {
    const existingClass = await this.classRepository.exists({ where: { id } })
    if (!existingClass) throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)

    await this.classRepository.delete(id)
  }

  async getClassById(id: number): Promise<IClasses> {
    const classEntity = await this.classRepository
      .createQueryBuilder('classes')
      .leftJoinAndSelect('classes.subject', 'subject')
      .leftJoinAndSelect('classes.teacher', 'teacher')
      .leftJoinAndSelect('teacher.user', 'user')
      .leftJoinAndSelect('classes.department', 'department')
      .leftJoinAndSelect('classes.scholastic', 'scholastic')
      .leftJoinAndSelect('classes.semester', 'semester')
      .where('classes.id = :id', { id })
      .getOne()
    if (!classEntity) throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)

    const formattedClass: IClasses = {
      id: classEntity.id,
      name: classEntity.name,
      code: classEntity.code,
      image: classEntity.image,
      status: classEntity.status,
      classroom: classEntity.classroom,
      credit: classEntity.subject.credit,
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
        credit: classEntity.subject.credit,
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
      .leftJoinAndSelect('teacher.user', 'user')
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
    const formattedClasses: IClasses[] = data.map(classEntity => ({
      id: classEntity.id,
      name: classEntity.name,
      code: classEntity.code,
      image: classEntity.image,
      status: classEntity.status,
      classroom: classEntity.classroom,
      credit: classEntity.subject.credit,
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
        credit: classEntity.subject.credit,
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

  //lấy danh sách học sinh của lớp
  async getStudentsOfClass(class_id: number, getStudentsOfClassDto: GetStudentsOfClassDto): Promise<{ data: IStudent[]; meta: PaginationMeta }> {
    const { name, code, ...rest } = getStudentsOfClassDto

    const classEntity = await this.classRepository.findOne({ where: { id: class_id }, select: ['id'] })
    if (!classEntity) throwAppException('CLASS_NOT_FOUND', ErrorCode.CLASS_NOT_FOUND, HttpStatus.NOT_FOUND)

    const classStudents = await this.classStudentsRepository
      .createQueryBuilder('class_students')
      .select([
        'class_students.id',
        'student.id',
        'user.code',
        'user.gender',
        'user.avatar',
        'class_students.full_name',
        'class_students.email',
        'class_students.saint_name',
        'class_students.phone_number',
        'class_students.address',
        'class_students.birth_place',
        'class_students.birth_date',
        'class_students.parish',
        'class_students.deanery',
        'class_students.diocese',
        'class_students.congregation',
      ])
      .leftJoin('class_students.student', 'student')
      .leftJoin('student.user', 'user')
      .where('class_students.class_id = :class_id', { class_id })

    if (name) {
      classStudents.andWhere('user.full_name ILIKE :name', { name: `%${name}%` })
    }
    if (code) {
      classStudents.andWhere('user.code = :code', { code })
    }

    const { data, meta } = await paginate(classStudents, rest)
    const formattedStudents: IStudent[] = data.map(classStudent => ({
      id: classStudent.student.id,
      code: classStudent.student.user.code,
      gender: classStudent.student.user.gender,
      avatar: classStudent.student.user.avatar,
      full_name: classStudent.full_name,
      email: classStudent.email,
      saint_name: classStudent.saint_name,
      phone_number: classStudent.phone_number,
      address: classStudent.address,
      birth_place: classStudent.birth_place,
      birth_date: classStudent.birth_date,
      parish: classStudent.parish,
      deanery: classStudent.deanery,
      diocese: classStudent.diocese,
      congregation: classStudent.congregation,
    }))
    return { data: formattedStudents, meta }
  }
}
