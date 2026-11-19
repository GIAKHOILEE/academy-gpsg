import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { AppException } from '@common/exeption'
import { ErrorCode } from '@enums/error-codes.enum'
import { Classes } from '@modules/class/class.entity'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { Student } from '@modules/students/students.entity'
import { ExamScoreServiceV2 } from './exam-scores.service'

describe('ExamScoreServiceV2 — cập nhật điểm trực tiếp trong class_students', () => {
  let service: ExamScoreServiceV2
  let classRepo: { exists: jest.Mock }
  let txClassStudentRepo: { find: jest.Mock; update: jest.Mock }
  let classStudentRepo: { manager: { transaction: jest.Mock }; upsert: jest.Mock }

  beforeEach(async () => {
    classRepo = {
      exists: jest.fn().mockResolvedValue(true),
    }

    txClassStudentRepo = {
      find: jest.fn().mockResolvedValue([{ id: 901, student_id: 206 }]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    }

    const manager = {
      getRepository: jest.fn(() => txClassStudentRepo),
    }

    classStudentRepo = {
      manager: {
        transaction: jest.fn(async cb => cb(manager)),
      },
      upsert: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamScoreServiceV2,
        { provide: getRepositoryToken(Classes), useValue: classRepo },
        { provide: getRepositoryToken(ClassStudents), useValue: classStudentRepo },
        { provide: getRepositoryToken(Student), useValue: {} },
      ],
    }).compile()

    service = module.get(ExamScoreServiceV2)
  })

  it('cập nhật được điểm 2 chữ số thập phân dạng number (7.75) qua createClassStudentScores mà không dùng upsert', async () => {
    await service.createClassStudentScores({
      class_id: 2251,
      scores: [{ student_id: 206, score: 7.75 as any }],
    })

    expect(classRepo.exists).toHaveBeenCalledWith({ where: { id: 2251 } })
    expect(classStudentRepo.upsert).not.toHaveBeenCalled()
    expect(txClassStudentRepo.update).toHaveBeenCalledWith(901, { score: '7.75' })
  })

  it('cập nhật được điểm 2 chữ số thập phân dạng string ("7.75") qua updateClassStudentScores', async () => {
    await service.updateClassStudentScores({
      class_id: 2251,
      scores: [{ student_id: 206, score: '7.75' }],
    })

    expect(txClassStudentRepo.update).toHaveBeenCalledWith(901, { score: '7.75' })
  })

  it('cho phép xóa điểm về null khi truyền chuỗi rỗng hoặc null', async () => {
    txClassStudentRepo.find.mockResolvedValue([
      { id: 901, student_id: 206 },
      { id: 902, student_id: 207 },
    ])

    await service.updateClassStudentScores({
      class_id: 2251,
      scores: [
        { student_id: 206, score: '' },
        { student_id: 207, score: null as any },
      ],
    })

    expect(txClassStudentRepo.update).toHaveBeenCalledWith(901, { score: null })
    expect(txClassStudentRepo.update).toHaveBeenCalledWith(902, { score: null })
  })

  it('dùng giá trị cuối cùng nếu trùng student_id trong cùng request', async () => {
    await service.updateClassStudentScores({
      class_id: 2251,
      scores: [
        { student_id: 206, score: '7' },
        { student_id: 206, score: '7.75' },
      ],
    })

    expect(txClassStudentRepo.update).toHaveBeenCalledTimes(1)
    expect(txClassStudentRepo.update).toHaveBeenCalledWith(901, { score: '7.75' })
  })

  it('báo lỗi CLASS_NOT_FOUND nếu lớp không tồn tại', async () => {
    classRepo.exists.mockResolvedValue(false)

    let caught: unknown
    try {
      await service.updateClassStudentScores({
        class_id: 9999,
        scores: [{ student_id: 206, score: '7.75' }],
      })
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(AppException)
    expect((caught as AppException).getStatus()).toBe(404)
    expect((caught as AppException).getResponse()).toMatchObject({
      statusCode: ErrorCode.CLASS_NOT_FOUND,
      message: 'Lớp học không tồn tại',
    })
    expect(classStudentRepo.manager.transaction).not.toHaveBeenCalled()
  })

  it('báo lỗi STUDENT_NOT_IN_CLASS nếu học viên chưa nằm trong class_students và không tự chèn mới', async () => {
    txClassStudentRepo.find.mockResolvedValue([])

    let caught: unknown
    try {
      await service.createClassStudentScores({
        class_id: 2251,
        scores: [{ student_id: 206, score: '7.75' }],
      })
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(AppException)
    expect((caught as AppException).getStatus()).toBe(400)
    expect((caught as AppException).getResponse()).toMatchObject({
      statusCode: ErrorCode.STUDENT_NOT_IN_CLASS,
      message: 'Học sinh không có trong lớp học',
    })
    expect(txClassStudentRepo.update).not.toHaveBeenCalled()
  })

  it.each([-0.01, 10.01, 'abc', '7,75', '0x5', undefined])('báo lỗi SCORE_INVALID khi điểm không hợp lệ: %p', async invalidScore => {
    let caught: unknown
    try {
      await service.updateClassStudentScores({
        class_id: 2251,
        scores: [{ student_id: 206, score: invalidScore as any }],
      })
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(AppException)
    expect((caught as AppException).getStatus()).toBe(400)
    expect((caught as AppException).getResponse()).toMatchObject({
      statusCode: ErrorCode.SCORE_INVALID,
      message: 'Điểm phải nằm trong khoảng 0-10',
    })
    expect(txClassStudentRepo.update).not.toHaveBeenCalled()
  })

  it('bỏ qua không query DB khi mảng scores rỗng', async () => {
    await service.updateClassStudentScores({ class_id: 2251, scores: [] })
    expect(classRepo.exists).not.toHaveBeenCalled()
    expect(classStudentRepo.manager.transaction).not.toHaveBeenCalled()
  })
})
