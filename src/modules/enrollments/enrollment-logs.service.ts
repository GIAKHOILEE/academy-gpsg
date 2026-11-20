import { PaginationMeta } from '@common/pagination'
import { CLS_ACTOR_KEY, ClsActorContext } from '@common/request-context.interceptor'
import { removeVietnameseTones, throwAppException, trimString } from '@common/utils'
import { EnrollmentLogAction, EnrollmentLogActorType } from '@enums/enrollment-log.enum'
import { ErrorCode } from '@enums/error-codes.enum'
import { Role } from '@enums/role.enum'
import { Classes } from '@modules/class/class.entity'
import { User } from '@modules/users/user.entity'
import { HttpStatus, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ClsServiceManager } from 'nestjs-cls'
import { EntityManager, Repository } from 'typeorm'
import { PaginateEnrollmentLogsDto, PaginateSingleEnrollmentLogsDto } from './dtos/paginate-enrollment-logs.dto'
import { EnrollmentLog, EnrollmentLogChanges, EnrollmentLogSnapshot } from './enrollment-logs.entity'
import { EnrollmentClassMeta } from './enrollment-logs.helper'
import { Enrollments } from './enrollments.entity'

export type EnrollmentExistenceState = 'ACTIVE' | 'SOFT_DELETED' | 'HARD_DELETED'

export interface EnrollmentLogActorInput {
  actorType?: EnrollmentLogActorType
  userId?: number | null
  username?: string | null
  fullName?: string | null
  role?: Role | null
  guestName?: string | null
  guestIdentifier?: string | null
  ip?: string | null
  userAgent?: string | null
}

export interface RecordEnrollmentLogParams {
  enrollmentId: number
  enrollmentCode?: string | null
  studentId?: number | null
  studentName?: string | null
  studentNameNormalized?: string | null
  studentCode?: string | null
  action: EnrollmentLogAction
  reason?: string | null
  actor?: EnrollmentLogActorInput
  changes?: EnrollmentLogChanges | null
  snapshot?: EnrollmentLogSnapshot | null
  metadata?: Record<string, any> | null
}

export interface EnrollmentLogItemResponse extends EnrollmentLog {
  enrollment_state: EnrollmentExistenceState
}

const ALLOWED_ORDER_BY = new Set(['id', 'created_at', 'enrollment_id', 'action'])
const VALID_ACTIONS = new Set<string>(Object.values(EnrollmentLogAction))

@Injectable()
export class EnrollmentLogsService {
  constructor(
    @InjectRepository(EnrollmentLog)
    private readonly enrollmentLogRepository: Repository<EnrollmentLog>,
    @InjectRepository(Enrollments)
    private readonly enrollmentsRepository: Repository<Enrollments>,
    @InjectRepository(Classes)
    private readonly classRepository: Repository<Classes>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Đọc metadata lớp học (kể cả lớp đã xóa mềm) để enrich vào `changes` và `snapshot`.
   */
  async loadClassMetaMap(classIds: number[], manager?: EntityManager): Promise<Map<number, EnrollmentClassMeta>> {
    const uniqueIds = [...new Set(classIds.filter(id => Number.isInteger(id) && id > 0))]
    const map = new Map<number, EnrollmentClassMeta>()
    if (uniqueIds.length === 0) return map

    const repo = manager ? manager.getRepository(Classes) : this.classRepository
    if (!repo || typeof repo.createQueryBuilder !== 'function') return map

    const classes = await repo
      .createQueryBuilder('cls')
      .select(['cls.id', 'cls.code', 'cls.name', 'cls.price'])
      .where('cls.id IN (:...ids)', { ids: uniqueIds })
      .withDeleted()
      .getMany()

    for (const cls of classes) {
      map.set(cls.id, {
        id: cls.id,
        code: cls.code ?? null,
        name: cls.name ?? null,
        price: cls.price !== undefined && cls.price !== null ? Number(cls.price) : null,
      })
    }

    return map
  }

  /**
   * Ghi 1 bản ghi audit log. Nếu truyền `manager` (từ queryRunner) sẽ chạy trong cùng transaction.
   */
  async record(params: RecordEnrollmentLogParams, manager?: EntityManager): Promise<EnrollmentLog> {
    const resolvedActor = await this.resolveActor(params.actor, manager)
    const cleanStudentName = trimString(params.studentName) || null
    const studentNameNormalized =
      params.studentNameNormalized ?? (cleanStudentName ? removeVietnameseTones(cleanStudentName).toLowerCase() : null)

    const mergedMetadata: Record<string, any> = {
      ...(params.metadata || {}),
    }
    if (resolvedActor.ip && mergedMetadata.ip === undefined) {
      mergedMetadata.ip = resolvedActor.ip
    }
    if (resolvedActor.userAgent && mergedMetadata.user_agent === undefined) {
      mergedMetadata.user_agent = resolvedActor.userAgent
    }

    const logRepo = manager ? manager.getRepository(EnrollmentLog) : this.enrollmentLogRepository
    const logEntity = logRepo.create({
      enrollment_id: params.enrollmentId,
      enrollment_code: params.enrollmentCode ?? null,
      student_id: params.studentId ?? null,
      student_name: cleanStudentName,
      student_name_normalized: studentNameNormalized,
      student_code: params.studentCode ?? null,
      action: params.action,
      reason: trimString(params.reason) || null,
      actor_type: resolvedActor.actor_type,
      actor_id: resolvedActor.actor_id,
      actor_name: resolvedActor.actor_name,
      actor_username: resolvedActor.actor_username,
      actor_role: resolvedActor.actor_role,
      changes: params.changes && Object.keys(params.changes).length > 0 ? params.changes : null,
      snapshot: params.snapshot ?? null,
      metadata: Object.keys(mergedMetadata).length > 0 ? mergedMetadata : null,
    })

    return logRepo.save(logEntity)
  }

  /**
   * Tra cứu toàn bộ lịch sử thao tác đơn (bao gồm cả đơn đã bị xóa cứng).
   */
  async getLogs(query: PaginateEnrollmentLogsDto): Promise<{
    data: EnrollmentLogItemResponse[]
    meta: PaginationMeta
  }> {
    const page = Math.max(Number(query.page) || 1, 1)
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100)
    const orderBy = query.orderBy && ALLOWED_ORDER_BY.has(query.orderBy) ? query.orderBy : 'created_at'
    const orderDirection: 'ASC' | 'DESC' = query.orderDirection === 'ASC' ? 'ASC' : 'DESC'

    const qb = this.enrollmentLogRepository.createQueryBuilder('log')

    if (query.enrollment_id) {
      qb.andWhere('log.enrollment_id = :enrollment_id', { enrollment_id: Number(query.enrollment_id) })
    }

    if (query.enrollment_code) {
      qb.andWhere('LOWER(log.enrollment_code) LIKE :enrollment_code', {
        enrollment_code: `%${query.enrollment_code.trim().toLowerCase()}%`,
      })
    }

    if (query.search) {
      const trimmed = query.search.trim()
      const normalized = removeVietnameseTones(trimmed).toLowerCase()
      const lower = trimmed.toLowerCase()
      qb.andWhere(
        `(
          LOWER(log.enrollment_code) LIKE :searchLower
          OR log.student_name_normalized LIKE :searchNormalized
          OR LOWER(log.student_code) LIKE :searchLower
          OR LOWER(log.actor_name) LIKE :searchLower
          OR LOWER(log.actor_username) LIKE :searchLower
          OR LOWER(log.reason) LIKE :searchLower
        )`,
        {
          searchLower: `%${lower}%`,
          searchNormalized: `%${normalized}%`,
        },
      )
    }

    this.applyCommonLogFilters(qb, query)

    if (query.only_hard_deleted === true) {
      qb.andWhere('NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.id = log.enrollment_id)')
    }

    qb.orderBy(`log.${orderBy}`, orderDirection).addOrderBy('log.id', orderDirection)

    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount()

    const stateMap = await this.getEnrollmentStatesMap(rows.map(row => row.enrollment_id))
    const data: EnrollmentLogItemResponse[] = rows.map(row => ({
      ...row,
      enrollment_state: stateMap.get(row.enrollment_id) ?? 'HARD_DELETED',
    }))

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Xem timeline lịch sử của 1 đơn cụ thể theo enrollment_id.
   * Hoạt động bình thường kể cả khi đơn đã bị xóa mềm hoặc xóa cứng.
   */
  async getLogsByEnrollmentId(
    enrollmentId: number,
    query: PaginateSingleEnrollmentLogsDto,
  ): Promise<{
    enrollment_id: number
    enrollment_code: string | null
    enrollment_state: EnrollmentExistenceState
    latest_snapshot: EnrollmentLogSnapshot | null
    data: EnrollmentLog[]
    meta: PaginationMeta
  }> {
    const page = Math.max(Number(query.page) || 1, 1)
    const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100)
    const orderBy = query.orderBy && ALLOWED_ORDER_BY.has(query.orderBy) ? query.orderBy : 'created_at'
    const orderDirection: 'ASC' | 'DESC' = query.orderDirection === 'ASC' ? 'ASC' : 'DESC'

    const qb = this.enrollmentLogRepository
      .createQueryBuilder('log')
      .where('log.enrollment_id = :enrollmentId', { enrollmentId: Number(enrollmentId) })

    this.applyCommonLogFilters(qb, query)

    qb.orderBy(`log.${orderBy}`, orderDirection).addOrderBy('log.id', orderDirection)

    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount()

    const stateMap = await this.getEnrollmentStatesMap([Number(enrollmentId)])
    const enrollmentState = stateMap.get(Number(enrollmentId)) ?? 'HARD_DELETED'

    const latestSnapshotLog = await this.enrollmentLogRepository
      .createQueryBuilder('log')
      .where('log.enrollment_id = :enrollmentId', { enrollmentId: Number(enrollmentId) })
      .andWhere('log.snapshot IS NOT NULL')
      .orderBy('log.created_at', 'DESC')
      .addOrderBy('log.id', 'DESC')
      .getOne()

    const enrollmentCode = rows[0]?.enrollment_code ?? latestSnapshotLog?.enrollment_code ?? null

    return {
      enrollment_id: Number(enrollmentId),
      enrollment_code: enrollmentCode,
      enrollment_state: enrollmentState,
      latest_snapshot: latestSnapshotLog?.snapshot ?? null,
      data: rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Xem chi tiết 1 bản ghi log (đặc biệt hữu ích để đọc đầy đủ `snapshot` của đơn đã xóa cứng).
   */
  async getLogById(logId: number): Promise<EnrollmentLogItemResponse> {
    const log = await this.enrollmentLogRepository.findOne({ where: { id: Number(logId) } })
    if (!log) {
      throwAppException('ENROLLMENT_LOG_NOT_FOUND', ErrorCode.ENROLLMENT_LOG_NOT_FOUND, HttpStatus.NOT_FOUND)
    }

    const stateMap = await this.getEnrollmentStatesMap([log.enrollment_id])
    return {
      ...log,
      enrollment_state: stateMap.get(log.enrollment_id) ?? 'HARD_DELETED',
    }
  }

  private applyCommonLogFilters(
    qb: ReturnType<Repository<EnrollmentLog>['createQueryBuilder']>,
    query: Pick<PaginateEnrollmentLogsDto, 'actor_id' | 'actor_type' | 'action' | 'from_date' | 'to_date'>,
  ): void {
    if (query.actor_id) {
      qb.andWhere('log.actor_id = :actor_id', { actor_id: Number(query.actor_id) })
    }

    if (query.actor_type) {
      qb.andWhere('log.actor_type = :actor_type', { actor_type: query.actor_type })
    }

    if (query.action) {
      const actions = query.action
        .split(',')
        .map(a => a.trim().toUpperCase())
        .filter(a => VALID_ACTIONS.has(a))
      if (actions.length > 0) {
        qb.andWhere('log.action IN (:...actions)', { actions })
      }
    }

    if (query.from_date) {
      const from = this.parseDateBound(query.from_date, 'start')
      if (from) {
        qb.andWhere('log.created_at >= :from_date', { from_date: from })
      }
    }

    if (query.to_date) {
      const to = this.parseDateBound(query.to_date, 'end')
      if (to) {
        qb.andWhere('log.created_at <= :to_date', { to_date: to })
      }
    }
  }

  private parseDateBound(raw: string, bound: 'start' | 'end'): Date | null {
    const trimmed = raw.trim()
    if (!trimmed) return null

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number)
      return bound === 'start' ? new Date(y, m - 1, d, 0, 0, 0, 0) : new Date(y, m - 1, d, 23, 59, 59, 999)
    }

    const parsed = new Date(trimmed)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  private async getEnrollmentStatesMap(enrollmentIds: number[]): Promise<Map<number, EnrollmentExistenceState>> {
    const uniqueIds = [...new Set(enrollmentIds.filter(id => Number.isInteger(id) && id > 0))]
    const map = new Map<number, EnrollmentExistenceState>()
    if (uniqueIds.length === 0) return map

    const existingRows = await this.enrollmentsRepository
      .createQueryBuilder('enrollment')
      .select(['enrollment.id', 'enrollment.deleted_at'])
      .where('enrollment.id IN (:...ids)', { ids: uniqueIds })
      .withDeleted()
      .getMany()

    const byId = new Map<number, Enrollments>(existingRows.map(e => [e.id, e]))
    for (const id of uniqueIds) {
      const row = byId.get(id)
      if (!row) {
        map.set(id, 'HARD_DELETED')
      } else if (row.deleted_at) {
        map.set(id, 'SOFT_DELETED')
      } else {
        map.set(id, 'ACTIVE')
      }
    }

    return map
  }

  private getClsActor(): ClsActorContext | undefined {
    try {
      const cls = ClsServiceManager.getClsService()
      if (!cls || !cls.isActive()) return undefined
      return cls.get<ClsActorContext>(CLS_ACTOR_KEY)
    } catch {
      return undefined
    }
  }

  private async resolveActor(
    input?: EnrollmentLogActorInput,
    manager?: EntityManager,
  ): Promise<{
    actor_type: EnrollmentLogActorType
    actor_id: number | null
    actor_name: string | null
    actor_username: string | null
    actor_role: Role | null
    ip: string | null
    userAgent: string | null
  }> {
    const clsActor = this.getClsActor()
    const ip = input?.ip ?? clsActor?.ip ?? null
    const userAgent = input?.userAgent ?? clsActor?.userAgent ?? null

    if (input?.actorType === EnrollmentLogActorType.SYSTEM) {
      return {
        actor_type: EnrollmentLogActorType.SYSTEM,
        actor_id: null,
        actor_name: 'Hệ thống',
        actor_username: 'system',
        actor_role: null,
        ip: null,
        userAgent: null,
      }
    }

    if (input?.actorType === EnrollmentLogActorType.GUEST) {
      return {
        actor_type: EnrollmentLogActorType.GUEST,
        actor_id: null,
        actor_name: trimString(input.guestName) || 'Khách',
        actor_username: trimString(input.guestIdentifier) || null,
        actor_role: null,
        ip,
        userAgent,
      }
    }

    const userId = input?.userId ?? clsActor?.userId ?? null
    if (userId) {
      let dbUser: Partial<User> | null = null
      try {
        const userRepo = manager ? manager.getRepository(User) : this.userRepository
        if (userRepo && typeof userRepo.findOne === 'function') {
          dbUser = await userRepo.findOne({
            where: { id: Number(userId) },
            select: ['id', 'full_name', 'saint_name', 'username', 'code', 'role'],
            withDeleted: true,
          })
        }
      } catch {
        dbUser = null
      }

      const username = dbUser?.username || dbUser?.code || input?.username || clsActor?.username || null
      const fullName = trimString(dbUser?.full_name) || trimString(input?.fullName) || username || null
      const role = dbUser?.role ?? input?.role ?? clsActor?.role ?? null

      return {
        actor_type: EnrollmentLogActorType.USER,
        actor_id: Number(userId),
        actor_name: fullName,
        actor_username: username,
        actor_role: role,
        ip,
        userAgent,
      }
    }

    return {
      actor_type: EnrollmentLogActorType.SYSTEM,
      actor_id: null,
      actor_name: 'Hệ thống',
      actor_username: 'system',
      actor_role: null,
      ip,
      userAgent,
    }
  }
}
