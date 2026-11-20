import { LearnType, PaymentMethod, PaymentStatus, StatusEnrollment } from '@enums/class.enum'
import { EnrollmentLogAction, EnrollmentLogActorType } from '@enums/enrollment-log.enum'
import { Gender, Role } from '@enums/role.enum'
import { ClassStudents } from '@modules/class/class-students/class-student.entity'
import { Classes } from '@modules/class/class.entity'
import { Student } from '@modules/students/students.entity'
import { StudentsService } from '@modules/students/students.service'
import { User } from '@modules/users/user.entity'
import { EnrollmentAuditSubscriber } from './enrollment-audit.subscriber'
import { EnrollmentLog } from './enrollment-logs.entity'
import { buildEnrollmentSnapshot, diffEnrollment, markEnrollmentAuditHandled } from './enrollment-logs.helper'
import { EnrollmentLogsService } from './enrollment-logs.service'
import { Enrollments } from './enrollments.entity'
import { EnrollmentsService } from './enrollments.service'

describe('Enrollment audit logging', () => {
  describe('enrollment-logs.helper', () => {
    it('does not report false diffs for decimal strings, dates, empty strings, or class_ids ordering', () => {
      const before: any = {
        status: StatusEnrollment.PENDING,
        payment_status: PaymentStatus.UNPAID,
        payment_method: PaymentMethod.CASH,
        total_fee: '500000.00',
        prepaid: '0.00',
        debt: '500000.00',
        discount: '0.00',
        birth_date: new Date(1998, 4, 20),
        note: '',
        full_name: '  Nguyễn Văn A  ',
        class_ids: [
          { class_id: 2, learn_type: LearnType.VIDEO },
          { class_id: 1, learn_type: LearnType.OFFLINE },
        ],
      }
      const after: any = {
        status: StatusEnrollment.PENDING,
        payment_status: PaymentStatus.UNPAID,
        payment_method: PaymentMethod.CASH,
        total_fee: 500000,
        prepaid: 0,
        debt: 500000,
        discount: 0,
        birth_date: '1998-05-20',
        note: null,
        full_name: 'Nguyễn Văn A',
        class_ids: [
          { class_id: 1, learn_type: LearnType.OFFLINE },
          { class_id: 2, learn_type: LearnType.VIDEO },
        ],
      }

      expect(diffEnrollment(before, after)).toEqual({})
    })

    it('enriches changed class_ids with class metadata and captures financial/status diffs', () => {
      const classMap = new Map([
        [1, { id: 1, code: 'KT01', name: 'Kinh Thánh 1', price: 300000 }],
        [2, { id: 2, code: 'TL01', name: 'Thần Học 1', price: 400000 }],
      ])

      const changes = diffEnrollment(
        {
          status: StatusEnrollment.PENDING,
          prepaid: '0.00' as any,
          debt: '300000.00' as any,
          class_ids: [{ class_id: 1, learn_type: LearnType.OFFLINE }],
        },
        {
          status: StatusEnrollment.DEBT,
          prepaid: 150000,
          debt: 250000,
          class_ids: [{ class_id: 2, learn_type: LearnType.MEETING }],
        },
        classMap,
      )

      expect(changes).toEqual({
        status: { old: StatusEnrollment.PENDING, new: StatusEnrollment.DEBT },
        prepaid: { old: 0, new: 150000 },
        debt: { old: 300000, new: 250000 },
        class_ids: {
          old: [{ class_id: 1, class_code: 'KT01', class_name: 'Kinh Thánh 1', price: 300000, learn_type: LearnType.OFFLINE }],
          new: [{ class_id: 2, class_code: 'TL01', class_name: 'Thần Học 1', price: 400000, learn_type: LearnType.MEETING }],
        },
      })
    })

    it('builds a clean snapshot with normalized numbers and class names', () => {
      const classMap = new Map([[5, { id: 5, code: 'MH05', name: 'Mục Vụ 5', price: 250000 }]])
      const snapshot = buildEnrollmentSnapshot(
        {
          id: 42,
          code: 'ABCDE',
          total_fee: '250000.00' as any,
          prepaid: '100000.00' as any,
          debt: '150000.00' as any,
          discount: '0.00' as any,
          status: StatusEnrollment.DEBT,
          payment_method: PaymentMethod.TRANSFER,
          payment_status: PaymentStatus.UNPAID,
          full_name: '  Lê Văn Minh  ',
          class_ids: [{ class_id: 5, learn_type: LearnType.VIDEO }],
          is_logged: true,
          student_id: 12,
        },
        'HV-0012',
        classMap,
      )

      expect(snapshot).toMatchObject({
        id: 42,
        code: 'ABCDE',
        total_fee: 250000,
        prepaid: 100000,
        debt: 150000,
        discount: 0,
        full_name: 'Lê Văn Minh',
        student_id: 12,
        student_code: 'HV-0012',
        class_ids: [{ class_id: 5, class_code: 'MH05', class_name: 'Mục Vụ 5', price: 250000, learn_type: LearnType.VIDEO }],
      })
    })
  })

  describe('EnrollmentsService audit log hooks', () => {
    it('records CREATE log with snapshot for guest registration inside transaction', async () => {
      const enrollmentsRepo = {
        create: jest.fn((v: any) => ({ ...v })),
      }
      const classRepo = {
        find: jest.fn().mockResolvedValue([{ id: 1, code: 'K01', name: 'Lớp 1', price: 200000, learn_offline: true }]),
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
            if (entity === Classes) return classRepo
            return {}
          },
          save: jest.fn(async (_entity: any, obj: any) => ({ ...obj, id: 77 })),
        },
      }
      const enrollmentLogsService = {
        record: jest.fn().mockResolvedValue({ id: 1 }),
        loadClassMetaMap: jest.fn().mockResolvedValue(new Map()),
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
        enrollmentLogsService as any,
      )

      await service.createEnrollmentV3(
        {
          class_ids: [{ class_id: 1, learn_type: LearnType.OFFLINE }],
          payment_method: PaymentMethod.CASH,
          gender: Gender.MALE,
          full_name: 'Trần Văn B',
          phone_number: '0909123456',
        } as any,
        false,
      )

      expect(enrollmentLogsService.record).toHaveBeenCalledTimes(1)
      const [payload, manager] = enrollmentLogsService.record.mock.calls[0]
      expect(manager).toBe(queryRunner.manager)
      expect(payload).toMatchObject({
        enrollmentId: 77,
        studentName: 'Trần Văn B',
        action: EnrollmentLogAction.CREATE,
        actor: {
          actorType: EnrollmentLogActorType.GUEST,
          guestName: 'Trần Văn B',
          guestIdentifier: '0909123456',
        },
      })
      expect(payload.snapshot.class_ids).toEqual([
        { class_id: 1, class_code: 'K01', class_name: 'Lớp 1', price: 200000, learn_type: LearnType.OFFLINE },
      ])
    })

    it('records RESTORE log when updating a soft-deleted enrollment and skips empty UPDATE logs', async () => {
      const deletedAt = new Date('2026-10-01T00:00:00.000Z')
      const softDeletedEnrollment = {
        id: 15,
        code: 'E0015',
        status: StatusEnrollment.PENDING,
        payment_status: PaymentStatus.UNPAID,
        payment_method: PaymentMethod.CASH,
        student_id: null,
        class_ids: [{ class_id: 1, learn_type: LearnType.OFFLINE }],
        total_fee: 100000,
        prepaid: 0,
        debt: 100000,
        discount: 0,
        full_name: 'Nguyễn Văn C',
        full_name_normalized: 'nguyen_van_c',
        note: 'Cũ',
        deleted_at: deletedAt,
      }

      const setupUpdate = (initial: any) => {
        const current = { ...initial, class_ids: initial.class_ids.map((x: any) => ({ ...x })) }
        const enrollmentsRepo = {
          update: jest.fn(),
          create: jest.fn((v: any) => ({ ...v })),
          save: jest.fn(async (v: any) => v),
          createQueryBuilder: jest.fn(() => ({
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            withDeleted: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValue(current),
          })),
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
              return { find: jest.fn().mockResolvedValue([]), delete: jest.fn() }
            },
          },
        }
        const enrollmentLogsService = {
          record: jest.fn().mockResolvedValue({ id: 1 }),
          loadClassMetaMap: jest.fn().mockResolvedValue(new Map()),
        }
        const service = new EnrollmentsService(
          { createQueryRunner: () => queryRunner } as any,
          enrollmentsRepo as any,
          {} as any,
          {} as any,
          {} as any,
          { sendMail: jest.fn().mockResolvedValue(undefined) } as any,
          {} as any,
          {} as any,
          { syncStudentToLibrary: jest.fn() } as any,
          enrollmentLogsService as any,
        )
        return { service, enrollmentsRepo, enrollmentLogsService, queryRunner }
      }

      // Case 1: Restore soft-deleted enrollment + update note
      const restoreCase = setupUpdate(softDeletedEnrollment)
      await restoreCase.service.updateEnrollmentV3(15, { note: 'Đã xác nhận lại' } as any)

      expect(restoreCase.enrollmentsRepo.update).toHaveBeenCalledWith(15, { deleted_at: null })
      expect(restoreCase.enrollmentLogsService.record).toHaveBeenCalledTimes(1)
      expect(restoreCase.enrollmentLogsService.record.mock.calls[0][0]).toMatchObject({
        enrollmentId: 15,
        enrollmentCode: 'E0015',
        action: EnrollmentLogAction.RESTORE,
        changes: {
          note: { old: 'Cũ', new: 'Đã xác nhận lại' },
          deleted_at: { old: deletedAt.toISOString(), new: null },
        },
        metadata: expect.objectContaining({ restored_from_soft_delete: true }),
      })

      // Case 2: No-op update on active enrollment -> no log written
      const noOpCase = setupUpdate({ ...softDeletedEnrollment, deleted_at: null })
      await noOpCase.service.updateEnrollmentV3(15, { note: 'Cũ' } as any)
      expect(noOpCase.enrollmentsRepo.update).not.toHaveBeenCalled()
      expect(noOpCase.enrollmentLogsService.record).not.toHaveBeenCalled()
    })

    it('hard deletes the enrollment and records DELETE log with full snapshot', async () => {
      const existingEnrollment = {
        id: 22,
        code: 'DEL22',
        status: StatusEnrollment.DONE,
        payment_status: PaymentStatus.PAID,
        payment_method: PaymentMethod.TRANSFER,
        student_id: 5,
        student: { id: 5, user: { code: 'HV-0005' } },
        class_ids: [{ class_id: 3, learn_type: LearnType.OFFLINE }],
        total_fee: 400000,
        prepaid: 0,
        debt: 0,
        discount: 0,
        full_name: 'Phạm Văn D',
        full_name_normalized: 'pham_van_d',
        deleted_at: null,
      }

      const enrollmentsRepo = {
        delete: jest.fn().mockResolvedValue({ affected: 1 }),
        createQueryBuilder: jest.fn(() => ({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          withDeleted: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(existingEnrollment),
        })),
      }
      const classStudentsRepo = {
        delete: jest.fn().mockResolvedValue({ affected: 1 }),
        find: jest.fn().mockResolvedValue([]),
      }
      const classRepo = {
        find: jest.fn().mockResolvedValue([]),
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
            if (entity === ClassStudents) return classStudentsRepo
            if (entity === Classes) return classRepo
            return { find: jest.fn().mockResolvedValue([]), delete: jest.fn() }
          },
        },
      }
      const enrollmentLogsService = {
        record: jest.fn().mockResolvedValue({ id: 99 }),
        loadClassMetaMap: jest.fn().mockResolvedValue(new Map([[3, { id: 3, code: 'L03', name: 'Lớp 3', price: 400000 }]])),
      }

      const service = new EnrollmentsService(
        { createQueryRunner: () => queryRunner } as any,
        enrollmentsRepo as any,
        {} as any,
        classRepo as any,
        {} as any,
        {} as any,
        {} as any,
        classStudentsRepo as any,
        {} as any,
        enrollmentLogsService as any,
      )

      await service.deleteEnrollment(22)

      // Đảm bảo vẫn xóa cứng (không chuyển sang softDelete)
      expect(enrollmentsRepo.delete).toHaveBeenCalledWith(22)
      expect(enrollmentLogsService.record).toHaveBeenCalledTimes(1)
      const [payload, manager] = enrollmentLogsService.record.mock.calls[0]
      expect(manager).toBe(queryRunner.manager)
      expect(payload).toMatchObject({
        enrollmentId: 22,
        enrollmentCode: 'DEL22',
        studentCode: 'HV-0005',
        action: EnrollmentLogAction.DELETE,
        metadata: expect.objectContaining({ hard_deleted: true }),
      })
      expect(payload.snapshot).toMatchObject({
        id: 22,
        code: 'DEL22',
        full_name: 'Phạm Văn D',
        student_code: 'HV-0005',
        total_fee: 400000,
        class_ids: [{ class_id: 3, class_code: 'L03', class_name: 'Lớp 3', price: 400000, learn_type: LearnType.OFFLINE }],
      })
      expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1)
    })

    it('records AUTO_SOFT_DELETE with SYSTEM actor in overDue10Day cron', async () => {
      const overdueRow = {
        id: 31,
        code: 'OD031',
        status: StatusEnrollment.PENDING,
        payment_status: PaymentStatus.UNPAID,
        student_id: null,
        full_name: 'Quá Hạn',
        full_name_normalized: 'qua_han',
      }
      const softDelete = jest.fn().mockResolvedValue({ affected: 1 })
      const enrollmentsRepo = {
        createQueryBuilder: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          leftJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([overdueRow]),
        })),
        softDelete,
      }
      const txManager = {
        getRepository: jest.fn(() => ({ softDelete })),
      }
      const dataSource = {
        transaction: jest.fn(async (cb: any) => cb(txManager)),
      }
      const enrollmentLogsService = {
        record: jest.fn().mockResolvedValue({ id: 5 }),
      }

      const service = new EnrollmentsService(
        dataSource as any,
        enrollmentsRepo as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        {} as any,
        enrollmentLogsService as any,
      )

      await service.overDue10Day()

      expect(softDelete).toHaveBeenCalledWith(31)
      expect(enrollmentLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          enrollmentId: 31,
          enrollmentCode: 'OD031',
          action: EnrollmentLogAction.AUTO_SOFT_DELETE,
          reason: expect.stringContaining('Hệ thống tự động xóa mềm'),
          actor: { actorType: EnrollmentLogActorType.SYSTEM },
          metadata: expect.objectContaining({
            reason_code: 'OVERDUE_10_DAYS_UNPAID',
            triggered_by: 'SYSTEM_CRON',
          }),
        }),
        txManager,
      )
    })

    it('records manual email logs for payment, account and instruction emails', async () => {
      const enrollment = {
        id: 50,
        code: 'EM050',
        status: StatusEnrollment.DONE,
        email: 'student@example.com',
        full_name: 'Lê Hồng',
        full_name_normalized: 'le_hong',
        saint_name: 'Maria',
        student_id: 8,
        student: { id: 8, user: { code: 'HV-0008' } },
        class_ids: [{ class_id: 1, learn_type: LearnType.VIDEO }],
      }
      const enrollmentsRepo = {
        findOne: jest.fn().mockResolvedValue(enrollment),
      }
      const studentRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 8, user_id: 80 }),
      }
      const userRepo = {
        findOne: jest.fn().mockResolvedValue({ id: 80, code: 'HV-0008', full_name: 'Lê Hồng', email: 'student@example.com' }),
      }
      const emailService = {
        sendMail: jest.fn().mockResolvedValue(undefined),
      }
      const enrollmentLogsService = {
        record: jest.fn().mockResolvedValue({ id: 1 }),
      }
      const service = new EnrollmentsService(
        { getRepository: () => userRepo } as any,
        enrollmentsRepo as any,
        studentRepo as any,
        {} as any,
        {} as any,
        emailService as any,
        {} as any,
        {} as any,
        {} as any,
        enrollmentLogsService as any,
      )

      jest.spyOn(service as any, 'handleEnrollmentEmail').mockResolvedValue(undefined)

      await service.sendPaymentSuccessEmail(50)
      await service.sendAccountEmail(50)
      await service.sendInstructionEmail(50)

      expect(enrollmentLogsService.record.mock.calls.map(c => c[0].action)).toEqual([
        EnrollmentLogAction.SEND_PAYMENT_EMAIL,
        EnrollmentLogAction.SEND_ACCOUNT_EMAIL,
        EnrollmentLogAction.SEND_INSTRUCTION_EMAIL,
      ])
    })
  })

  describe('StudentsService sync log hook', () => {
    it('records SYNC_FROM_STUDENT only for enrollments whose fields actually changed', async () => {
      const user = { id: 10, code: 'HV-0010', full_name: 'Tên Cũ', saint_name: 'Giuse', email: 'old@example.com' }
      const student = { id: 1, user_id: 10, image_4x6: 'old.jpg' }
      const changedEnrollment = { id: 101, code: 'EN101', full_name: 'Tên Cũ', saint_name: 'Giuse', email: 'old@example.com' }
      const unchangedEnrollment = { id: 102, code: 'EN102', full_name: 'Tên Mới', saint_name: 'Giuse', email: 'old@example.com' }

      const enrollmentsRepo = {
        find: jest.fn().mockResolvedValue([changedEnrollment, unchangedEnrollment]),
        update: jest.fn(),
      }
      const repos = new Map<unknown, any>([
        [Student, { findOne: jest.fn().mockResolvedValue(student), merge: (a: any, b: any) => Object.assign(a, b), save: jest.fn(), exists: jest.fn() }],
        [User, { findOne: jest.fn().mockResolvedValue(user), merge: (a: any, b: any) => Object.assign(a, b), save: jest.fn() }],
        [Enrollments, enrollmentsRepo],
      ])
      const queryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: { getRepository: (entity: unknown) => repos.get(entity) },
      }
      const enrollmentLogsService = {
        record: jest.fn().mockResolvedValue({ id: 1 }),
      }

      const service = new StudentsService(
        { createQueryRunner: () => queryRunner } as any,
        {} as any,
        { sendMail: jest.fn().mockResolvedValue(undefined) } as any,
        { syncStudentToLibrary: jest.fn() } as any,
        enrollmentLogsService as any,
      )

      await service.updateStudent(1, { full_name: 'Tên Mới' } as any)

      expect(enrollmentLogsService.record).toHaveBeenCalledTimes(1)
      expect(enrollmentLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          enrollmentId: 101,
          enrollmentCode: 'EN101',
          studentCode: 'HV-0010',
          action: EnrollmentLogAction.SYNC_FROM_STUDENT,
          reason: expect.stringContaining('Hệ thống tự động đồng bộ'),
          changes: { full_name: { old: 'Tên Cũ', new: 'Tên Mới' } },
          metadata: expect.objectContaining({
            reason_code: 'STUDENT_PROFILE_SYNC',
            triggered_by: 'SYSTEM_SYNC',
          }),
        }),
        queryRunner.manager,
      )
    })
  })

  describe('EnrollmentLogsService queries for hard-deleted enrollments', () => {
    it('returns HARD_DELETED state and latest snapshot when enrollment row no longer exists', async () => {
      const deleteLog: Partial<EnrollmentLog> = {
        id: 200,
        enrollment_id: 999,
        enrollment_code: 'GONE9',
        action: EnrollmentLogAction.DELETE,
        actor_type: EnrollmentLogActorType.USER,
        actor_id: 2,
        actor_name: 'Admin A',
        actor_role: Role.ADMIN,
        snapshot: { id: 999, code: 'GONE9', full_name: 'Đã Xóa' } as any,
        created_at: new Date('2026-11-20T05:00:00.000Z'),
      }

      const logQbList = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[deleteLog], 1]),
      }
      const logQbSnapshot = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(deleteLog),
      }
      const logRepo = {
        createQueryBuilder: jest.fn().mockReturnValueOnce(logQbList).mockReturnValueOnce(logQbSnapshot),
      }
      const enrollmentsRepo = {
        createQueryBuilder: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          withDeleted: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]), // Đơn đã bị xóa cứng khỏi DB
        })),
      }

      const service = new EnrollmentLogsService(logRepo as any, enrollmentsRepo as any, {} as any, {} as any)
      const result = await service.getLogsByEnrollmentId(999, { page: 1, limit: 20 })

      expect(result.enrollment_state).toBe('HARD_DELETED')
      expect(result.enrollment_code).toBe('GONE9')
      expect(result.latest_snapshot).toEqual(deleteLog.snapshot)
      expect(result.data).toHaveLength(1)
    })
  })

  describe('EnrollmentAuditSubscriber (system fallback safety-net)', () => {
    it('logs SYSTEM_UPDATE with system reason when enrollment is updated directly without explicit service log', async () => {
      const savedLogs: any[] = []
      const logRepo = {
        create: jest.fn((v: any) => ({ ...v })),
        save: jest.fn(async (v: any) => {
          savedLogs.push(v)
          return v
        }),
      }
      const manager: any = {
        getRepository: (entity: any) => {
          if (entity === EnrollmentLog) return logRepo
          return {}
        },
      }
      const queryRunner: any = { data: {} }
      const subscriber = new EnrollmentAuditSubscriber()

      await subscriber.afterUpdate({
        manager,
        queryRunner,
        databaseEntity: {
          id: 88,
          code: 'SYS88',
          status: StatusEnrollment.PENDING,
          note: 'Cũ',
          full_name: 'Học Viên S',
        },
        entity: {
          id: 88,
          code: 'SYS88',
          status: StatusEnrollment.DONE,
          note: 'Cũ',
          full_name: 'Học Viên S',
        },
      } as any)

      expect(savedLogs).toHaveLength(1)
      expect(savedLogs[0]).toMatchObject({
        enrollment_id: 88,
        enrollment_code: 'SYS88',
        action: EnrollmentLogAction.SYSTEM_UPDATE,
        actor_type: EnrollmentLogActorType.SYSTEM,
        actor_name: 'Hệ thống',
        reason: 'Hệ thống tự động cập nhật đơn đăng ký',
        changes: {
          status: { old: StatusEnrollment.PENDING, new: StatusEnrollment.DONE },
        },
      })
    })

    it('skips logging when transaction is already marked handled by service layer (no duplicate log)', async () => {
      const logRepo = {
        create: jest.fn(),
        save: jest.fn(),
      }
      const queryRunner: any = { data: {} }
      const manager: any = {
        queryRunner,
        getRepository: () => logRepo,
      }
      markEnrollmentAuditHandled(manager)

      const subscriber = new EnrollmentAuditSubscriber()
      await subscriber.afterUpdate({
        manager,
        queryRunner,
        databaseEntity: { id: 88, code: 'SYS88', status: StatusEnrollment.PENDING },
        entity: { id: 88, code: 'SYS88', status: StatusEnrollment.DONE },
      } as any)

      expect(logRepo.save).not.toHaveBeenCalled()
    })
  })
})
