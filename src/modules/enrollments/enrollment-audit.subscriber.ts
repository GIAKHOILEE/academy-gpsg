import { CLS_ACTOR_KEY, ClsActorContext } from '@common/request-context.interceptor'
import { removeVietnameseTones, trimString } from '@common/utils'
import { EnrollmentLogAction, EnrollmentLogActorType } from '@enums/enrollment-log.enum'
import { Role } from '@enums/role.enum'
import { User } from '@modules/users/user.entity'
import { Logger } from '@nestjs/common'
import { ClsServiceManager } from 'nestjs-cls'
import {
  EntityManager,
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  RemoveEvent,
  SoftRemoveEvent,
  UpdateEvent,
} from 'typeorm'
import { EnrollmentLog, EnrollmentLogChanges } from './enrollment-logs.entity'
import {
  buildEnrollmentSnapshot,
  diffEnrollment,
  isEnrollmentAuditHandled,
  normalizeTimestampValue,
  TRACKED_ENROLLMENT_FIELDS,
} from './enrollment-logs.helper'
import { Enrollments } from './enrollments.entity'

const TRACKED_FIELD_SET = new Set(TRACKED_ENROLLMENT_FIELDS)

/**
 * Lưới an toàn (fallback audit subscriber) cho bảng `enrollments`.
 *
 * Mọi thao tác nghiệp vụ chính (`createEnrollmentV3`, `updateEnrollmentV3`,
 * `deleteEnrollment`, `overDue10Day`, `StudentsService.updateStudent`) đều đã
 * ghi audit log tường minh kèm ngữ cảnh đầy đủ và đánh dấu `markEnrollmentAuditHandled`.
 *
 * Subscriber này chỉ kích hoạt khi có một luồng khác (job nền, seeder, module mới,
 * hoặc thao tác ghi trực tiếp qua repository/manager) làm thay đổi `Enrollments`
 * mà chưa đi qua `EnrollmentLogsService`, giúp hệ thống không bao giờ bị mất dấu.
 */
@EventSubscriber()
export class EnrollmentAuditSubscriber implements EntitySubscriberInterface<Enrollments> {
  private readonly logger = new Logger(EnrollmentAuditSubscriber.name)

  listenTo() {
    return Enrollments
  }

  async afterInsert(event: InsertEvent<Enrollments>): Promise<void> {
    if (isEnrollmentAuditHandled(event.queryRunner)) return
    const entity = event.entity
    if (!entity?.id) return

    await this.safeWriteLog(event.manager, {
      enrollment: entity,
      action: EnrollmentLogAction.CREATE,
      reason: 'Hệ thống tự động tạo đơn đăng ký',
      snapshot: buildEnrollmentSnapshot(entity),
      metadata: {
        triggered_by: 'SYSTEM_FALLBACK_SUBSCRIBER',
        source: 'typeorm_after_insert',
      },
    })
  }

  async afterUpdate(event: UpdateEvent<Enrollments>): Promise<void> {
    if (isEnrollmentAuditHandled(event.queryRunner)) return
    const entity = event.entity as Partial<Enrollments> | undefined
    const dbEntity = event.databaseEntity as Partial<Enrollments> | undefined
    const enrollmentId = Number(entity?.id ?? dbEntity?.id)
    if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) return

    let changes: EnrollmentLogChanges = {}
    let partialUpdateWithoutBefore = false

    if (dbEntity && entity) {
      changes = diffEnrollment(dbEntity, { ...dbEntity, ...entity })
      const oldDeleted = normalizeTimestampValue(dbEntity.deleted_at)
      const newDeleted = normalizeTimestampValue(entity.deleted_at)
      if (oldDeleted !== newDeleted && 'deleted_at' in entity) {
        changes.deleted_at = { old: oldDeleted, new: newDeleted }
      }
    } else if (entity) {
      partialUpdateWithoutBefore = true
      for (const [key, value] of Object.entries(entity)) {
        if (key === 'deleted_at') {
          changes.deleted_at = { old: null, new: normalizeTimestampValue(value) }
          continue
        }
        if (TRACKED_FIELD_SET.has(key)) {
          changes[key] = { old: null, new: value ?? null }
        }
      }
    }

    if (Object.keys(changes).length === 0) return

    let currentRow: Partial<Enrollments> | null = dbEntity ?? null
    if (!currentRow?.code) {
      try {
        currentRow = await event.manager
          .getRepository(Enrollments)
          .createQueryBuilder('enrollment')
          .leftJoinAndSelect('enrollment.student', 'student')
          .leftJoinAndSelect('student.user', 'user')
          .where('enrollment.id = :id', { id: enrollmentId })
          .withDeleted()
          .getOne()
      } catch {
        currentRow = null
      }
    }

    const mergedEnrollment: Partial<Enrollments> = {
      ...(currentRow || {}),
      ...(entity || {}),
      id: enrollmentId,
    }

    let action = EnrollmentLogAction.SYSTEM_UPDATE
    let reason = 'Hệ thống tự động cập nhật đơn đăng ký'

    if (changes.deleted_at) {
      if (changes.deleted_at.new && !changes.deleted_at.old) {
        action = EnrollmentLogAction.SOFT_DELETE
        reason = 'Hệ thống tự động xóa mềm đơn đăng ký'
      } else if (!changes.deleted_at.new && changes.deleted_at.old) {
        action = EnrollmentLogAction.RESTORE
        reason = 'Hệ thống tự động khôi phục đơn đăng ký từ danh sách đã xóa mềm'
      }
    }

    await this.safeWriteLog(event.manager, {
      enrollment: mergedEnrollment,
      action,
      reason,
      changes,
      metadata: {
        triggered_by: 'SYSTEM_FALLBACK_SUBSCRIBER',
        source: 'typeorm_after_update',
        partial_update_without_before_state: partialUpdateWithoutBefore || undefined,
      },
    })
  }

  async afterSoftRemove(event: SoftRemoveEvent<Enrollments>): Promise<void> {
    if (isEnrollmentAuditHandled(event.queryRunner)) return
    const entity = (event.entity || event.databaseEntity) as Partial<Enrollments> | undefined
    if (!entity?.id) return

    await this.safeWriteLog(event.manager, {
      enrollment: entity,
      action: EnrollmentLogAction.SOFT_DELETE,
      reason: 'Hệ thống tự động xóa mềm đơn đăng ký',
      changes: {
        deleted_at: {
          old: null,
          new: normalizeTimestampValue(entity.deleted_at ?? new Date()),
        },
      },
      metadata: {
        triggered_by: 'SYSTEM_FALLBACK_SUBSCRIBER',
        source: 'typeorm_after_soft_remove',
      },
    })
  }

  async afterRemove(event: RemoveEvent<Enrollments>): Promise<void> {
    if (isEnrollmentAuditHandled(event.queryRunner)) return
    const entity = (event.databaseEntity || event.entity) as Partial<Enrollments> | undefined
    const enrollmentId = Number(entity?.id ?? event.entityId)
    if (!Number.isInteger(enrollmentId) || enrollmentId <= 0) return

    await this.safeWriteLog(event.manager, {
      enrollment: { ...(entity || {}), id: enrollmentId },
      action: EnrollmentLogAction.DELETE,
      reason: 'Hệ thống tự động xóa vĩnh viễn đơn đăng ký',
      snapshot: entity ? buildEnrollmentSnapshot({ ...entity, id: enrollmentId }) : null,
      metadata: {
        hard_deleted: true,
        triggered_by: 'SYSTEM_FALLBACK_SUBSCRIBER',
        source: 'typeorm_after_remove',
      },
    })
  }

  private async safeWriteLog(
    manager: EntityManager,
    input: {
      enrollment: Partial<Enrollments>
      action: EnrollmentLogAction
      reason: string
      changes?: EnrollmentLogChanges | null
      snapshot?: ReturnType<typeof buildEnrollmentSnapshot> | null
      metadata?: Record<string, any> | null
    },
  ): Promise<void> {
    try {
      const actor = await this.resolveFallbackActor(manager)
      const studentName = trimString(input.enrollment.full_name) || null
      const studentNameNormalized =
        input.enrollment.full_name_normalized || (studentName ? removeVietnameseTones(studentName).toLowerCase() : null)

      const metadata: Record<string, any> = {
        ...(input.metadata || {}),
      }
      if (actor.ip) metadata.ip = actor.ip
      if (actor.userAgent) metadata.user_agent = actor.userAgent

      const logRepo = manager.getRepository(EnrollmentLog)
      const log = logRepo.create({
        enrollment_id: Number(input.enrollment.id),
        enrollment_code: input.enrollment.code ?? null,
        student_id: input.enrollment.student_id ?? null,
        student_name: studentName,
        student_name_normalized: studentNameNormalized,
        student_code: input.enrollment.student?.user?.code ?? null,
        action: input.action,
        reason: input.reason,
        actor_type: actor.actor_type,
        actor_id: actor.actor_id,
        actor_name: actor.actor_name,
        actor_username: actor.actor_username,
        actor_role: actor.actor_role,
        changes: input.changes && Object.keys(input.changes).length > 0 ? input.changes : null,
        snapshot: input.snapshot ?? null,
        metadata,
      })

      await logRepo.save(log)
    } catch (error) {
      this.logger.error(`Fallback audit log ghi thất bại cho enrollment #${input.enrollment?.id}: ${error?.message}`)
    }
  }

  private async resolveFallbackActor(manager: EntityManager): Promise<{
    actor_type: EnrollmentLogActorType
    actor_id: number | null
    actor_name: string | null
    actor_username: string | null
    actor_role: Role | null
    ip: string | null
    userAgent: string | null
  }> {
    let clsActor: ClsActorContext | undefined
    try {
      const cls = ClsServiceManager.getClsService()
      if (cls && cls.isActive()) {
        clsActor = cls.get<ClsActorContext>(CLS_ACTOR_KEY)
      }
    } catch {
      clsActor = undefined
    }

    if (clsActor?.userId) {
      let dbUser: Partial<User> | null = null
      try {
        dbUser = await manager.getRepository(User).findOne({
          where: { id: Number(clsActor.userId) },
          select: ['id', 'full_name', 'username', 'code', 'role'],
          withDeleted: true,
        })
      } catch {
        dbUser = null
      }

      const username = dbUser?.username || dbUser?.code || clsActor.username || null
      return {
        actor_type: EnrollmentLogActorType.USER,
        actor_id: Number(clsActor.userId),
        actor_name: trimString(dbUser?.full_name) || username || null,
        actor_username: username,
        actor_role: dbUser?.role ?? clsActor.role ?? null,
        ip: clsActor.ip ?? null,
        userAgent: clsActor.userAgent ?? null,
      }
    }

    return {
      actor_type: EnrollmentLogActorType.SYSTEM,
      actor_id: null,
      actor_name: 'Hệ thống',
      actor_username: 'system',
      actor_role: null,
      ip: clsActor?.ip ?? null,
      userAgent: clsActor?.userAgent ?? null,
    }
  }
}
