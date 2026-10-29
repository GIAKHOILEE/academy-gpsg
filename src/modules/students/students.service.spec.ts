import { StudentsService } from './students.service'
import { Student } from './students.entity'
import { User } from '../users/user.entity'
import { Enrollments } from '@modules/enrollments/enrollments.entity'

/**
 * Đổi ảnh đại diện học viên gửi email "thẻ học viên trực tuyến". Email là việc phụ:
 * Brevo lỗi không được làm rollback lần lưu (trước đây admin nhận 500 và ảnh mới mất).
 */
describe('StudentsService.updateStudent — email thẻ học viên', () => {
  const setup = (sendMail: jest.Mock) => {
    const user = { id: 10, email: 'hv@x.vn', full_name: 'Nguyễn Văn A', saint_name: null, avatar: 'old.jpg' }
    const student = { id: 1, user_id: 10, image_4x6: 'old-4x6.jpg' }
    const repos = new Map<unknown, any>([
      [Student, { findOne: jest.fn().mockResolvedValue(student), merge: (a: any, b: any) => Object.assign(a, b), save: jest.fn(), exists: jest.fn() }],
      [User, { findOne: jest.fn().mockResolvedValue(user), merge: (a: any, b: any) => Object.assign(a, b), save: jest.fn() }],
      [Enrollments, { find: jest.fn().mockResolvedValue([]), update: jest.fn() }],
    ])
    const queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: { getRepository: (entity: unknown) => repos.get(entity) },
    }
    const dataSource = { createQueryRunner: () => queryRunner }
    const service = new StudentsService(dataSource as any, {} as any, { sendMail } as any, {} as any)
    return { service, queryRunner }
  }

  const flush = () => new Promise(resolve => setImmediate(resolve))

  it('vẫn commit và không ném lỗi khi gửi email thất bại', async () => {
    const sendMail = jest.fn().mockRejectedValue(new Error('API Key is not enabled'))
    const { service, queryRunner } = setup(sendMail)
    const logSpy = jest.spyOn((service as any).logger, 'error').mockImplementation(() => undefined)

    await expect(service.updateStudent(1, { avatar: 'https://video.example/f/abc/the.jpg' } as any)).resolves.toBeUndefined()
    await flush()

    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1)
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled()
    expect(sendMail).toHaveBeenCalledTimes(1)
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('hv@x.vn'))
  })

  it('gửi email sau khi commit, với ảnh đại diện mới', async () => {
    const order: string[] = []
    const sendMail = jest.fn().mockImplementation(async () => void order.push('mail'))
    const { service, queryRunner } = setup(sendMail)
    queryRunner.commitTransaction.mockImplementation(async () => void order.push('commit'))

    await service.updateStudent(1, { avatar: 'https://video.example/f/abc/the.jpg' } as any)
    await flush()

    expect(order).toEqual(['commit', 'mail'])
    expect(sendMail.mock.calls[0][5]).toContain('https://video.example/f/abc/the.jpg')
  })

  it('không gửi email khi ảnh không đổi', async () => {
    const sendMail = jest.fn()
    const { service } = setup(sendMail)
    await service.updateStudent(1, { address: 'Sài Gòn' } as any)
    await flush()
    expect(sendMail).not.toHaveBeenCalled()
  })
})
