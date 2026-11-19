import { convertToSlug, parseFullNameMeta, removeVietnameseTones, trimString } from '@common/utils'
import { LearnType, PaymentMethod, StatusEnrollment } from '@enums/class.enum'
import { Gender, Role } from '@enums/role.enum'
import { BooksService } from '@modules/books/books.service'
import { CertificatesService } from '@modules/certificates/certificates.service'
import { ConsultService } from '@modules/consult/consult.service'
import { Enrollments } from '@modules/enrollments/enrollments.entity'
import { EnrollmentsService } from '@modules/enrollments/enrollments.service'
import { MailboxesService } from '@modules/mailboxes/mailboxes.service'
import { Student } from '@modules/students/students.entity'
import { StudentsService } from '@modules/students/students.service'
import { Teacher } from '@modules/teachers/teachers.entity'
import { TeachersService } from '@modules/teachers/teachers.service'
import { User } from '@modules/users/user.entity'
import { UserService } from '@modules/users/user.service'

describe('Name trimming in utils and services', () => {
  describe('utils', () => {
    it('trims strings safely without touching non-strings', () => {
      expect(trimString('  Nguyễn Văn A  ')).toBe('Nguyễn Văn A')
      expect(trimString('   ')).toBe('')
      expect(trimString(undefined)).toBeUndefined()
      expect(trimString(null)).toBeNull()
    })

    it('removes leading/trailing spaces before normalizing Vietnamese tones and slugs', () => {
      expect(removeVietnameseTones('  Nguyễn Văn An  ')).toBe('Nguyen_Van_An')
      expect(convertToSlug('  Danh mục Tin tức  ')).toBe('danh-muc-tin-tuc')
    })

    it('parses full_name metadata cleanly for normal, blank, and missing values', () => {
      expect(parseFullNameMeta('  Nguyễn   Văn   Bình  ')).toEqual({
        full_name: 'Nguyễn   Văn   Bình',
        first_name: 'Bình',
        full_name_normalized: 'nguyen_van_binh',
      })
      expect(parseFullNameMeta('   ')).toEqual({
        full_name: '',
        first_name: undefined,
        full_name_normalized: null,
      })
      expect(parseFullNameMeta(undefined)).toEqual({
        full_name: undefined,
        first_name: undefined,
        full_name_normalized: null,
      })
    })
  })

  describe('UserService', () => {
    const setup = () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      }
      const userRepo = {
        createQueryBuilder: jest.fn(() => qb),
        create: jest.fn((v: any) => v),
        save: jest.fn(async (v: any) => v),
        findOne: jest.fn(),
      }
      const service = new UserService(userRepo as any)
      return { service, userRepo, qb }
    }

    it('trims username, full_name and saint_name on create and updates normalized fields', async () => {
      const { service, userRepo, qb } = setup()

      const saved = await service.create(
        {
          username: '  staff01  ',
          password: 'password123',
          email: 'staff01@example.com',
          full_name: '  Trần Văn An  ',
          saint_name: '  Giuse  ',
        },
        Role.STAFF,
      )

      expect(qb.where).toHaveBeenCalledWith('users.username = :username', { username: 'staff01' })
      expect(saved.username).toBe('staff01')
      expect(saved.full_name).toBe('Trần Văn An')
      expect(saved.first_name).toBe('An')
      expect(saved.full_name_normalized).toBe('tran_van_an')
      expect(saved.saint_name).toBe('Giuse')
      expect(userRepo.save).toHaveBeenCalledTimes(1)
    })

    it('trims username, full_name and saint_name on updateUser', async () => {
      const { service, userRepo } = setup()
      const existing = { id: 5, username: 'old', full_name: 'Cũ', saint_name: 'Cũ' }
      userRepo.findOne.mockResolvedValue(existing)

      await service.updateUser(5, {
        username: '  newuser  ',
        full_name: '  Lê Thị Hoa  ',
        saint_name: '  Maria  ',
      })

      expect(existing.username).toBe('newuser')
      expect(existing.full_name).toBe('Lê Thị Hoa')
      expect((existing as any).first_name).toBe('Hoa')
      expect((existing as any).full_name_normalized).toBe('le_thi_hoa')
      expect(existing.saint_name).toBe('Maria')
    })
  })

  describe('StudentsService', () => {
    const setup = () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      }
      const savedUsers: any[] = []
      const userRepo = {
        createQueryBuilder: jest.fn(() => qb),
        create: jest.fn((v: any) => ({ ...v })),
        findOne: jest.fn(),
        merge: jest.fn((a: any, b: any) => Object.assign(a, b)),
        save: jest.fn(async (v: any) => v),
      }
      const studentRepo = {
        createQueryBuilder: jest.fn(() => qb),
        create: jest.fn((v: any) => ({ ...v })),
        findOne: jest.fn(),
        exists: jest.fn().mockResolvedValue(false),
        merge: jest.fn((a: any, b: any) => Object.assign(a, b)),
        save: jest.fn(async (v: any) => v),
      }
      const enrollmentsRepo = {
        find: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      }
      const repos = new Map<unknown, any>([
        [User, userRepo],
        [Student, studentRepo],
        [Enrollments, enrollmentsRepo],
      ])
      const queryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          getRepository: (entity: unknown) => repos.get(entity),
          save: jest.fn(async (entity: unknown, obj: any) => {
            if (entity === User) {
              obj.id = 101
              savedUsers.push(obj)
            }
            return obj
          }),
        },
      }
      const dataSource = { createQueryRunner: () => queryRunner }
      const emailService = { sendMail: jest.fn().mockResolvedValue(undefined) }
      const librarySyncService = { syncStudentToLibrary: jest.fn() }
      const service = new StudentsService(dataSource as any, {} as any, emailService as any, librarySyncService as any)
      return { service, userRepo, studentRepo, enrollmentsRepo, savedUsers, emailService, librarySyncService }
    }

    it('trims full_name and saint_name on createStudent and syncs clean names', async () => {
      const { service, savedUsers, emailService, librarySyncService } = setup()

      await service.createStudent({
        code: '2026-0001',
        email: 'hv@example.com',
        full_name: '  Nguyễn Văn An  ',
        saint_name: '  Phêrô  ',
      } as any)

      expect(savedUsers[0]).toMatchObject({
        full_name: 'Nguyễn Văn An',
        first_name: 'An',
        full_name_normalized: 'nguyen_van_an',
        saint_name: 'Phêrô',
      })
      expect(emailService.sendMail).toHaveBeenCalledWith(
        [{ email: 'hv@example.com', name: 'Nguyễn Văn An' }],
        expect.any(String),
        'register-success',
        expect.objectContaining({ name: 'Nguyễn Văn An' }),
      )
      expect(librarySyncService.syncStudentToLibrary).toHaveBeenCalledWith(
        expect.objectContaining({ full_name: 'Nguyễn Văn An', saint_name: 'Phêrô' }),
      )
    })

    it('trims full_name and saint_name on updateStudent and propagates clean values to enrollments', async () => {
      const { service, userRepo, studentRepo, enrollmentsRepo } = setup()
      const user = { id: 10, full_name: 'Cũ', first_name: 'Cũ', full_name_normalized: 'cu', saint_name: 'Cũ', email: 'hv@example.com' }
      const student = { id: 1, user_id: 10, image_4x6: 'img.jpg' }
      studentRepo.findOne.mockResolvedValue(student)
      userRepo.findOne.mockResolvedValue(user)
      enrollmentsRepo.find.mockResolvedValue([{ id: 7 }])

      await service.updateStudent(1, { full_name: '  Phạm Thị Mai  ', saint_name: '  Têrêsa  ' } as any)

      expect(user).toMatchObject({
        full_name: 'Phạm Thị Mai',
        first_name: 'Mai',
        full_name_normalized: 'pham_thi_mai',
        saint_name: 'Têrêsa',
      })
      expect(enrollmentsRepo.update).toHaveBeenCalledWith(7, expect.objectContaining({ full_name: 'Phạm Thị Mai', saint_name: 'Têrêsa' }))
    })
  })

  describe('TeachersService', () => {
    const setup = () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      }
      const savedUsers: any[] = []
      const savedTeachers: any[] = []
      const userRepo = {
        createQueryBuilder: jest.fn(() => qb),
        create: jest.fn((v: any) => ({ ...v })),
        findOne: jest.fn(),
        merge: jest.fn((a: any, b: any) => Object.assign(a, b)),
      }
      const teacherRepo = {
        create: jest.fn((v: any) => ({ ...v })),
        findOne: jest.fn(),
        merge: jest.fn((a: any, b: any) => Object.assign(a, b)),
      }
      const repos = new Map<unknown, any>([
        [User, userRepo],
        [Teacher, teacherRepo],
      ])
      const queryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          getRepository: (entity: unknown) => repos.get(entity),
          save: jest.fn(async (entity: unknown, obj: any) => {
            if (entity === User) {
              obj.id = 202
              savedUsers.push(obj)
            }
            if (entity === Teacher) {
              savedTeachers.push(obj)
            }
            return obj
          }),
        },
      }
      const dataSource = { createQueryRunner: () => queryRunner }
      const service = new TeachersService(dataSource as any, {} as any, {} as any, {} as any, {} as any)
      return { service, userRepo, teacherRepo, savedUsers, savedTeachers }
    }

    it('trims full_name, saint_name, other_name, bank_name and bank_account_name on createTeacher', async () => {
      const { service, savedUsers, savedTeachers } = setup()

      await service.createTeacher({
        code: 'GV01',
        email: 'gv@example.com',
        full_name: '  Nguyễn Minh Tuấn  ',
        saint_name: '  Phaolô  ',
        other_name: '  LM  ',
        bank_name: '  Vietcombank  ',
        bank_account_name: '  NGUYEN MINH TUAN  ',
      } as any)

      expect(savedUsers[0]).toMatchObject({
        full_name: 'Nguyễn Minh Tuấn',
        first_name: 'Tuấn',
        full_name_normalized: 'nguyen_minh_tuan',
        saint_name: 'Phaolô',
      })
      expect(savedTeachers[0]).toMatchObject({
        other_name: 'LM',
        bank_name: 'Vietcombank',
        bank_account_name: 'NGUYEN MINH TUAN',
      })
    })

    it('trims teacher name fields on updateTeacher and does not crash when full_name is omitted', async () => {
      const { service, userRepo, teacherRepo } = setup()
      const user = {
        id: 20,
        code: 'GV01',
        full_name: 'Nguyễn Minh Tuấn',
        first_name: 'Tuấn',
        full_name_normalized: 'nguyen_minh_tuan',
        saint_name: 'Phaolô',
      }
      const teacher = { id: 2, user_id: 20, other_name: 'LM', bank_name: 'ACB', bank_account_name: 'OLD' }
      teacherRepo.findOne.mockResolvedValue(teacher)
      userRepo.findOne.mockResolvedValue(user)

      await expect(
        service.updateTeacher(2, {
          other_name: '  TS  ',
          bank_name: '  Techcombank  ',
          bank_account_name: '  NGUYEN TUAN  ',
        } as any),
      ).resolves.toBeUndefined()

      expect(user.full_name).toBe('Nguyễn Minh Tuấn')
      expect(teacher).toMatchObject({
        other_name: 'TS',
        bank_name: 'Techcombank',
        bank_account_name: 'NGUYEN TUAN',
      })
    })
  })

  describe('EnrollmentsService', () => {
    it('trims saint_name, full_name, shipping_name and full_name_normalized on createEnrollmentV3', async () => {
      const savedEnrollments: any[] = []
      const enrollmentsRepo = {
        create: jest.fn((v: any) => ({ ...v })),
      }
      const classRepo = {
        find: jest.fn().mockResolvedValue([{ id: 1, price: 100000, learn_offline: true }]),
      }
      const queryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          getRepository: (entity: any) => {
            if (entity === Enrollments) return enrollmentsRepo
            if (entity?.name === 'Classes') return classRepo
            return {}
          },
          save: jest.fn(async (_entity: any, obj: any) => {
            savedEnrollments.push(obj)
            return obj
          }),
        },
      }
      const service = new EnrollmentsService(
        { createQueryRunner: () => queryRunner } as any,
        enrollmentsRepo as any,
        {} as any,
        classRepo as any,
        {} as any,
        { sendMail: jest.fn().mockResolvedValue(undefined) } as any,
        {} as any,
        {} as any,
        {} as any,
      )

      const result = await service.createEnrollmentV3(
        {
          class_ids: [{ class_id: 1, learn_type: LearnType.OFFLINE }],
          payment_method: PaymentMethod.CASH,
          gender: Gender.FEMALE,
          saint_name: '  Maria  ',
          full_name: '  Trần Thu Hà  ',
          shipping_name: '  Trần Thu Hương  ',
        } as any,
        false,
      )

      expect(savedEnrollments[0]).toMatchObject({
        saint_name: 'Maria',
        full_name: 'Trần Thu Hà',
        full_name_normalized: 'tran_thu_ha',
        shipping_name: 'Trần Thu Hương',
      })
      expect(result.full_name).toBe('Trần Thu Hà')
      expect(result.shipping_name).toBe('Trần Thu Hương')
    })

    it('trims rest name fields when updating enrollment and creating user', async () => {
      const savedUsers: any[] = []
      const savedEnrollments: any[] = []
      const existingEnrollment = {
        id: 10,
        status: StatusEnrollment.PENDING,
        student_id: null,
        class_ids: [{ class_id: 1, learn_type: LearnType.OFFLINE }],
        total_fee: 100000,
        saint_name: '  Giuse  ',
        full_name: '  Vũ Văn Nam  ',
        full_name_normalized: 'vu_van_nam',
        shipping_name: null,
      }
      const enrollmentsRepo = {
        update: jest.fn(),
        create: jest.fn((v: any) => ({ ...v })),
        save: jest.fn(async (v: any) => {
          savedEnrollments.push(v)
          return v
        }),
        createQueryBuilder: jest.fn(() => ({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          withDeleted: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(existingEnrollment),
        })),
      }
      const userRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((v: any) => ({ ...v })),
        save: jest.fn(async (v: any) => {
          v.id = 88
          savedUsers.push(v)
          return v
        }),
      }
      const studentRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((v: any) => ({ ...v })),
        save: jest.fn(async (v: any) => ({ ...v, id: 99 })),
      }
      const queryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          getRepository: (entity: any) => {
            if (entity === Enrollments) return enrollmentsRepo
            if (entity === User) return userRepo
            if (entity === Student) return studentRepo
            return { find: jest.fn().mockResolvedValue([]), delete: jest.fn() }
          },
        },
      }
      const service = new EnrollmentsService(
        { createQueryRunner: () => queryRunner } as any,
        enrollmentsRepo as any,
        studentRepo as any,
        {} as any,
        {} as any,
        { sendMail: jest.fn().mockResolvedValue(undefined) } as any,
        {} as any,
        {} as any,
        { syncStudentToLibrary: jest.fn() } as any,
      )

      await service.updateEnrollmentV3(10, {
        student_code: '2026-0099',
        saint_name: '  Phêrô  ',
        full_name: '  Vũ Văn Nam Mới  ',
        shipping_name: '  Người nhận  ',
      } as any)

      expect(savedUsers[0]).toMatchObject({
        saint_name: 'Phêrô',
        full_name: 'Vũ Văn Nam Mới',
        first_name: 'Mới',
        full_name_normalized: 'vu_van_nam_moi',
      })
      expect(savedEnrollments[0]).toMatchObject({
        saint_name: 'Phêrô',
        full_name: 'Vũ Văn Nam Mới',
        full_name_normalized: 'vu_van_nam_moi',
        shipping_name: 'Người nhận',
      })
    })
  })

  describe('Books, Consult, Mailboxes, Certificates services', () => {
    it('trims book name and shipping_name in BooksService', async () => {
      const bookRepo = {
        create: jest.fn((v: any) => v),
        save: jest.fn(async (v: any) => ({ id: 1, ...v })),
        exists: jest.fn().mockResolvedValue(true),
      }
      const studentBookRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((v: any) => v),
        save: jest.fn(async (v: any) => ({ id: 2, ...v })),
        update: jest.fn(),
      }
      const studentRepo = { exists: jest.fn().mockResolvedValue(true) }
      const service = new BooksService(bookRepo as any, studentBookRepo as any, {} as any, {} as any, studentRepo as any, {} as any)
      jest.spyOn(service, 'getStudentBookById').mockResolvedValue({ id: 2 } as any)

      const createdBook = await service.create({ name: '  Giáo trình 1  ' })
      expect(createdBook.name).toBe('Giáo trình 1')

      await service.createStudentBook({ student_id: 1, book_id: 1, shipping_name: '  Nguyễn A  ' })
      expect(studentBookRepo.create).toHaveBeenCalledWith(expect.objectContaining({ shipping_name: 'Nguyễn A' }))

      studentBookRepo.findOne.mockResolvedValue({ id: 2 })
      await service.updateStudentBook(2, { shipping_name: '  Nguyễn B  ' })
      expect(studentBookRepo.update).toHaveBeenCalledWith(2, expect.objectContaining({ shipping_name: 'Nguyễn B' }))
    })

    it('trims consult, mailbox and certificate query full_name', async () => {
      const consultRepo = {
        create: jest.fn((v: any) => v),
        save: jest.fn(async (v: any) => ({ id: 1, created_at: new Date(), ...v })),
        exists: jest.fn().mockResolvedValue(true),
        update: jest.fn(),
      }
      const consultService = new ConsultService(consultRepo as any)
      const createdConsult = await consultService.create({
        saint_name: '  Giuse  ',
        full_name: '  Trần An  ',
        email: 'a@b.com',
        phone_number: '0909',
        content: 'test',
      })
      expect(createdConsult.saint_name).toBe('Giuse')
      expect(createdConsult.full_name).toBe('Trần An')
      await consultService.update(1, { saint_name: '  Phêrô  ', full_name: '  Trần Bình  ' })
      expect(consultRepo.update).toHaveBeenCalledWith(1, { saint_name: 'Phêrô', full_name: 'Trần Bình' })

      const mailboxRepo = {
        create: jest.fn((v: any) => v),
        save: jest.fn(),
        findOne: jest.fn().mockResolvedValue({ id: 1 }),
        update: jest.fn(),
      }
      const mailboxService = new MailboxesService(mailboxRepo as any)
      await mailboxService.createMailboxes({ title: 'T', content: 'C', full_name: '  Lê C  ' })
      expect(mailboxRepo.create).toHaveBeenCalledWith(expect.objectContaining({ full_name: 'Lê C' }))

      const certQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      }
      const certService = new CertificatesService({ createQueryBuilder: jest.fn(() => certQb) } as any, {} as any)
      await certService.findAll({ full_name: '  Hoàng Khanh  ', birth_date: '' })
      expect(certQb.andWhere).toHaveBeenCalledWith('user.full_name = :full_name', { full_name: 'Hoàng Khanh' })
    })
  })
})
