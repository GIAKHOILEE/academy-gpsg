import { paginate } from '@common/pagination'
import { hashPassword, throwAppException, validateHash } from '@common/utils'
import { AnnouncementStatus } from '@enums/announcement.enum'
import { ErrorCode } from '@enums/error-codes.enum'
import { AnnouncementStation } from '@modules/announcement-station/announcement-station.entity'
import { HttpStatus, Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import * as crypto from 'crypto'
import { In, MoreThanOrEqual, Repository } from 'typeorm'
import { CreateSmsJobDto } from './dtos/create-sms-job.dto'
import { PaginateSmsDeviceDto } from './dtos/paginate-sms-device.dto'
import { PaginateSmsJobDto } from './dtos/paginate-sms-job.dto'
import { RegisterSmsDeviceDto } from './dtos/register-sms-device.dto'
import { UpdateSmsDeviceDto } from './dtos/update-sms-device.dto'
import { SmsDevice, SmsDeviceStatus } from './entities/sms-device.entity'
import { SmsJob, SmsJobStatus } from './entities/sms-job.entity'

export interface DeviceAuthAttemptPayload {
  deviceId: string
  secret: string
  ip?: string
  appVersion?: string
  defaultSmsSubId?: number
}

export interface DeviceAuthOutcome {
  authenticated: boolean
  code?: number
  reason?: string
  device?: SmsDevice
}

export interface SmsJobResultReportPayload {
  jobUid: string
  lockToken?: string
  status: 'SUBMITTED' | 'FAILED' | 'UNKNOWN'
  partsTotal?: number
  partsSent?: number
  partsFailed?: number
  errorCode?: string | null
  errorMessage?: string | null
  partResultsJson?: string | null
  timestamp?: number
}

export interface SmsDeliveryReportPayload {
  jobUid: string
  partIndex?: number
  partsTotal?: number
  partsDelivered?: number
  delivered?: boolean
  timestamp?: number
}

@Injectable()
export class SmsGatewayService implements OnModuleInit {
  private readonly logger = new Logger(SmsGatewayService.name)
  private readonly deviceClaimLocks = new Map<string, Promise<any>>()
  private dispatchTriggerCallback: (() => void) | null = null

  constructor(
    @InjectRepository(SmsDevice)
    private readonly deviceRepository: Repository<SmsDevice>,
    @InjectRepository(SmsJob)
    private readonly jobRepository: Repository<SmsJob>,
    @Optional()
    @InjectRepository(AnnouncementStation)
    private readonly announcementStationRepository?: Repository<AnnouncementStation>,
  ) {}

  private mapSmsJobStatusToAnnouncementStatus(status: SmsJobStatus): AnnouncementStatus {
    switch (status) {
      case SmsJobStatus.PENDING:
        return AnnouncementStatus.PENDING
      case SmsJobStatus.PROCESSING:
        return AnnouncementStatus.PROCESSING
      case SmsJobStatus.SUBMITTED:
      case SmsJobStatus.DELIVERED:
        return AnnouncementStatus.SUBMITTED
      case SmsJobStatus.FAILED:
        return AnnouncementStatus.FAILED
      case SmsJobStatus.UNKNOWN:
      default:
        return AnnouncementStatus.UNKNOWN
    }
  }

  async syncAnnouncementStatusForJob(job: SmsJob | null | undefined, status: SmsJobStatus): Promise<void> {
    if (!this.announcementStationRepository || !job) {
      return
    }
    try {
      const announcementStatus = this.mapSmsJobStatusToAnnouncementStatus(status)
      const announcementId = Number(job.metadata?.announcementId)
      if (Number.isInteger(announcementId) && announcementId > 0) {
        await this.announcementStationRepository.update({ id: announcementId }, { status: announcementStatus, sms_job_uid: job.job_uid })
      } else if (job.job_uid) {
        await this.announcementStationRepository.update({ sms_job_uid: job.job_uid }, { status: announcementStatus })
      }
    } catch (err: any) {
      this.logger.warn(`Failed to sync AnnouncementStation status for job ${job.job_uid}: ${err?.message}`)
    }
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.deviceRepository.update({ status: SmsDeviceStatus.ONLINE }, { status: SmsDeviceStatus.OFFLINE })
    } catch (err: any) {
      this.logger.warn(`Could not reset device statuses on startup: ${err?.message}`)
    }
  }

  registerDispatchTrigger(cb: () => void): void {
    this.dispatchTriggerCallback = cb
  }

  notifyDispatchReady(): void {
    if (this.dispatchTriggerCallback) {
      setImmediate(() => {
        this.dispatchTriggerCallback?.()
      })
    }
  }

  // ---- Device Management ----

  async registerDevice(dto: RegisterSmsDeviceDto): Promise<{ device: SmsDevice; deviceSecret: string }> {
    const deviceId = dto.device_id.trim()
    const existing = await this.deviceRepository.findOne({
      where: { device_id: deviceId },
      withDeleted: true,
    })

    if (existing) {
      throwAppException('SMS_DEVICE_ALREADY_EXISTS', ErrorCode.SMS_DEVICE_ALREADY_EXISTS, HttpStatus.BAD_REQUEST)
    }

    const plainSecret = crypto.randomBytes(32).toString('hex')
    const secretHash = await hashPassword(plainSecret)

    const entity = this.deviceRepository.create({
      device_id: deviceId,
      name: dto.name.trim(),
      secret_hash: secretHash,
      phone_number: dto.phone_number?.trim() || null,
      status: SmsDeviceStatus.OFFLINE,
      is_active: true,
      rate_limit_per_minute: dto.rate_limit_per_minute ?? Number(process.env.SMS_RATE_LIMIT_PER_MINUTE || 10),
      daily_limit: dto.daily_limit ?? Number(process.env.SMS_DAILY_LIMIT || 200),
    })

    const saved = await this.deviceRepository.save(entity)
    delete (saved as any).secret_hash

    return {
      device: saved,
      deviceSecret: plainSecret,
    }
  }

  async getDevices(paginateDto: PaginateSmsDeviceDto) {
    const qb = this.deviceRepository.createQueryBuilder('device')
    if (!paginateDto.orderBy) {
      qb.orderBy('device.id', 'DESC')
    }
    return paginate(qb, paginateDto)
  }

  async getDeviceById(id: number): Promise<SmsDevice> {
    const device = await this.deviceRepository.findOne({ where: { id } })
    if (!device) {
      throwAppException('SMS_DEVICE_NOT_FOUND', ErrorCode.SMS_DEVICE_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    return device
  }

  async getDeviceByDeviceId(deviceId: string): Promise<SmsDevice | null> {
    return this.deviceRepository.findOne({ where: { device_id: deviceId } })
  }

  async updateDevice(id: number, dto: UpdateSmsDeviceDto): Promise<SmsDevice> {
    const device = await this.getDeviceById(id)

    if (dto.name !== undefined) {
      device.name = dto.name.trim()
    }
    if (dto.phone_number !== undefined) {
      device.phone_number = dto.phone_number ? dto.phone_number.trim() : null
    }
    if (dto.is_active !== undefined) {
      device.is_active = dto.is_active
      if (!dto.is_active) {
        device.status = SmsDeviceStatus.OFFLINE
      }
    }
    if (dto.rate_limit_per_minute !== undefined) {
      device.rate_limit_per_minute = dto.rate_limit_per_minute
    }
    if (dto.daily_limit !== undefined) {
      device.daily_limit = dto.daily_limit
    }

    return this.deviceRepository.save(device)
  }

  async rotateDeviceSecret(id: number): Promise<{ device: SmsDevice; deviceSecret: string }> {
    const device = await this.getDeviceById(id)
    const plainSecret = crypto.randomBytes(32).toString('hex')
    const secretHash = await hashPassword(plainSecret)

    await this.deviceRepository.update(
      { id: device.id },
      {
        secret_hash: secretHash,
        status: SmsDeviceStatus.OFFLINE,
      },
    )

    const updated = await this.getDeviceById(id)
    return {
      device: updated,
      deviceSecret: plainSecret,
    }
  }

  async authenticateDevice(payload: DeviceAuthAttemptPayload): Promise<DeviceAuthOutcome> {
    const deviceId = (payload.deviceId || '').trim()
    const secret = (payload.secret || '').trim()

    if (!deviceId || !secret) {
      return {
        authenticated: false,
        code: 4001,
        reason: 'MISSING_CREDENTIALS',
      }
    }

    const device = await this.deviceRepository
      .createQueryBuilder('device')
      .addSelect('device.secret_hash')
      .where('device.device_id = :deviceId', { deviceId })
      .getOne()

    if (!device) {
      return {
        authenticated: false,
        code: 4001,
        reason: 'INVALID_CREDENTIALS',
      }
    }

    const isSecretValid = await validateHash(secret, device.secret_hash)
    if (!isSecretValid) {
      return {
        authenticated: false,
        code: 4001,
        reason: 'INVALID_CREDENTIALS',
      }
    }

    if (!device.is_active) {
      return {
        authenticated: false,
        code: 4003,
        reason: 'DEVICE_DISABLED',
      }
    }

    const now = new Date()
    device.status = SmsDeviceStatus.ONLINE
    device.last_connected_at = now
    device.last_seen_at = now
    if (payload.ip) {
      device.last_ip = payload.ip
    }
    if (payload.appVersion) {
      device.app_version = payload.appVersion.slice(0, 32)
    }
    if (typeof payload.defaultSmsSubId === 'number') {
      device.sim_sub_id = payload.defaultSmsSubId
    }

    await this.deviceRepository.update(
      { id: device.id },
      {
        status: SmsDeviceStatus.ONLINE,
        last_connected_at: now,
        last_seen_at: now,
        last_ip: device.last_ip,
        app_version: device.app_version,
        sim_sub_id: device.sim_sub_id,
      },
    )

    delete (device as any).secret_hash
    return {
      authenticated: true,
      device,
    }
  }

  async recordHeartbeat(deviceId: string, ip?: string): Promise<void> {
    const now = new Date()
    await this.deviceRepository.update(
      { device_id: deviceId },
      {
        status: SmsDeviceStatus.ONLINE,
        last_seen_at: now,
        ...(ip ? { last_ip: ip } : {}),
      },
    )
  }

  async markDeviceOffline(deviceId: string): Promise<void> {
    const now = new Date()
    await this.deviceRepository.update(
      { device_id: deviceId },
      {
        status: SmsDeviceStatus.OFFLINE,
        last_disconnected_at: now,
      },
    )
  }

  async getDeviceUsageStats(deviceId: string): Promise<{ sentLastMinute: number; sentToday: number; inFlightCount: number }> {
    const oneMinuteAgo = new Date(Date.now() - 60_000)
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const [sentLastMinute, sentToday, inFlightCount] = await Promise.all([
      this.jobRepository.count({
        where: {
          device_id: deviceId,
          dispatched_at: MoreThanOrEqual(oneMinuteAgo),
        },
      }),
      this.jobRepository.count({
        where: {
          device_id: deviceId,
          dispatched_at: MoreThanOrEqual(startOfToday),
          status: In([SmsJobStatus.PROCESSING, SmsJobStatus.SUBMITTED, SmsJobStatus.DELIVERED, SmsJobStatus.UNKNOWN]),
        },
      }),
      this.jobRepository.count({
        where: {
          device_id: deviceId,
          status: SmsJobStatus.PROCESSING,
        },
      }),
    ])

    return { sentLastMinute, sentToday, inFlightCount }
  }

  // ---- SMS Job Queue Management ----

  normalizeRecipient(raw: string): string {
    return (raw || '').trim().replace(/[\s\-().]/g, '')
  }

  async enqueueSms(dto: CreateSmsJobDto, createdBy?: number): Promise<SmsJob> {
    const recipient = this.normalizeRecipient(dto.recipient)
    const message = (dto.message || '').trim()
    const idempotencyKey = dto.idempotency_key?.trim() || null

    if (idempotencyKey) {
      const existing = await this.jobRepository.findOne({
        where: { idempotency_key: idempotencyKey },
      })
      if (existing) {
        return existing
      }
    }

    const jobEntity = this.jobRepository.create({
      job_uid: crypto.randomUUID(),
      idempotency_key: idempotencyKey,
      recipient,
      message,
      priority: dto.priority ?? 0,
      status: SmsJobStatus.PENDING,
      created_by: createdBy ?? null,
      metadata: dto.metadata ?? null,
    })

    const saved = await this.jobRepository.save(jobEntity)
    this.logger.log(`Queued SMS job ${saved.job_uid} to ${saved.recipient} (status=PENDING)`)

    this.notifyDispatchReady()
    return saved
  }

  async getJobs(paginateDto: PaginateSmsJobDto) {
    const qb = this.jobRepository.createQueryBuilder('job')
    if (!paginateDto.orderBy) {
      qb.orderBy('job.id', 'DESC')
    }
    return paginate(qb, paginateDto)
  }

  async getJobByIdOrUid(idOrUid: string | number): Promise<SmsJob> {
    const raw = String(idOrUid).trim()
    const isNumeric = /^\d+$/.test(raw)
    const job = await this.jobRepository.findOne({
      where: isNumeric ? [{ id: Number(raw) }, { job_uid: raw }] : { job_uid: raw },
    })

    if (!job) {
      throwAppException('SMS_JOB_NOT_FOUND', ErrorCode.SMS_JOB_NOT_FOUND, HttpStatus.NOT_FOUND)
    }
    return job
  }

  async getQueueStatsSummary(): Promise<Record<string, number>> {
    const statuses = Object.values(SmsJobStatus)
    const counts: Record<string, number> = {}
    for (const st of statuses) {
      counts[st] = await this.jobRepository.count({ where: { status: st } })
    }
    return counts
  }

  /**
   * Concurrency-safe atomic job claiming for a connected device.
   * Guarantees:
   * - At most 1 in-flight PROCESSING job per device at a time.
   * - Respects device rate_limit_per_minute and daily_limit.
   * - Uses conditional atomic SQL UPDATE (WHERE id = :id AND status = 'PENDING' AND device_id IS NULL)
   *   so multiple concurrent callers or workers can never claim the same job twice.
   */
  async claimNextJobForDevice(deviceId: string): Promise<SmsJob | null> {
    const prevLock = this.deviceClaimLocks.get(deviceId) || Promise.resolve()
    let releaseLock!: () => void
    const nextLock = new Promise<void>(resolve => {
      releaseLock = resolve
    })
    this.deviceClaimLocks.set(
      deviceId,
      prevLock.then(() => nextLock),
    )

    await prevLock
    try {
      return await this.claimNextJobForDeviceInternal(deviceId)
    } finally {
      releaseLock()
      if (this.deviceClaimLocks.get(deviceId) === nextLock) {
        this.deviceClaimLocks.delete(deviceId)
      }
    }
  }

  private async claimNextJobForDeviceInternal(deviceId: string): Promise<SmsJob | null> {
    const device = await this.deviceRepository.findOne({
      where: { device_id: deviceId, is_active: true },
    })
    if (!device) {
      return null
    }

    const usage = await this.getDeviceUsageStats(deviceId)
    if (usage.inFlightCount > 0) {
      // Strictly 1 job in flight per device
      return null
    }

    if (usage.sentLastMinute >= device.rate_limit_per_minute) {
      this.logger.debug(`Device ${deviceId} reached rate_limit_per_minute (${usage.sentLastMinute}/${device.rate_limit_per_minute})`)
      return null
    }

    if (usage.sentToday >= device.daily_limit) {
      this.logger.warn(`Device ${deviceId} reached daily_limit (${usage.sentToday}/${device.daily_limit})`)
      return null
    }

    const candidates = await this.jobRepository.find({
      where: { status: SmsJobStatus.PENDING },
      order: {
        priority: 'DESC',
        id: 'ASC',
      },
      take: 3,
    })

    for (const candidate of candidates) {
      const lockToken = crypto.randomUUID()
      const now = new Date()

      const res = await this.jobRepository
        .createQueryBuilder()
        .update(SmsJob)
        .set({
          status: SmsJobStatus.PROCESSING,
          device_id: deviceId,
          lock_token: lockToken,
          dispatched_at: now,
          accepted_at: null,
          dispatch_attempts: () => 'dispatch_attempts + 1',
          lock_version: () => 'lock_version + 1',
        })
        .where('id = :id AND status = :pendingStatus AND device_id IS NULL', {
          id: candidate.id,
          pendingStatus: SmsJobStatus.PENDING,
        })
        .execute()

      if (res.affected === 1) {
        const claimed = await this.jobRepository.findOne({ where: { id: candidate.id } })
        await this.syncAnnouncementStatusForJob(claimed, SmsJobStatus.PROCESSING)
        return claimed
      }
    }

    return null
  }

  /**
   * Called ONLY when socket.send() could not be executed at all (0 bytes written to wire).
   * Never called after job:dispatch has been written to the socket.
   */
  async releaseUnwrittenClaim(jobUid: string, lockToken: string): Promise<void> {
    const res = await this.jobRepository
      .createQueryBuilder()
      .update(SmsJob)
      .set({
        status: SmsJobStatus.PENDING,
        device_id: null,
        lock_token: null,
        dispatched_at: null,
        dispatch_attempts: () => 'GREATEST(dispatch_attempts - 1, 0)',
        lock_version: () => 'lock_version + 1',
      })
      .where('job_uid = :jobUid AND lock_token = :lockToken AND status = :status', {
        jobUid,
        lockToken,
        status: SmsJobStatus.PROCESSING,
      })
      .execute()

    if (res.affected === 1) {
      const released = await this.jobRepository.findOne({ where: { job_uid: jobUid } })
      await this.syncAnnouncementStatusForJob(released, SmsJobStatus.PENDING)
    }
  }

  async recordJobAccepted(deviceId: string, jobUid: string, lockToken?: string): Promise<SmsJob | null> {
    const job = await this.jobRepository.findOne({
      where: { job_uid: jobUid, device_id: deviceId },
    })
    if (!job) {
      return null
    }
    if (lockToken && job.lock_token && job.lock_token !== lockToken) {
      this.logger.warn(`Lock token mismatch on job:accepted for ${jobUid} from ${deviceId}`)
      return null
    }

    if (job.status === SmsJobStatus.PROCESSING && !job.accepted_at) {
      const now = new Date()
      await this.jobRepository.update(
        { id: job.id, status: SmsJobStatus.PROCESSING },
        {
          accepted_at: now,
        },
      )
      job.accepted_at = now
    }
    return job
  }

  async recordJobResult(deviceId: string, payload: SmsJobResultReportPayload): Promise<SmsJob | null> {
    const jobUid = (payload.jobUid || '').trim()
    if (!jobUid) {
      return null
    }

    const job = await this.jobRepository.findOne({
      where: { job_uid: jobUid, device_id: deviceId },
    })
    if (!job) {
      this.logger.warn(`Received job:result for unknown or unassigned job ${jobUid} from ${deviceId}`)
      return null
    }

    // Idempotent if already in final state SUBMITTED or DELIVERED
    if (job.status === SmsJobStatus.SUBMITTED || job.status === SmsJobStatus.DELIVERED) {
      return job
    }

    const now = new Date()
    let parsedPartResults: any = null
    if (payload.partResultsJson) {
      try {
        parsedPartResults = JSON.parse(payload.partResultsJson)
      } catch {
        parsedPartResults = null
      }
    }

    const nextStatus =
      payload.status === 'SUBMITTED' ? SmsJobStatus.SUBMITTED : payload.status === 'FAILED' ? SmsJobStatus.FAILED : SmsJobStatus.UNKNOWN

    const updateFields: Partial<SmsJob> = {
      status: nextStatus,
      accepted_at: job.accepted_at || now,
      parts_total: payload.partsTotal ?? job.parts_total ?? 1,
      parts_sent: payload.partsSent ?? 0,
      parts_failed: payload.partsFailed ?? 0,
      part_results: parsedPartResults,
      error_code: payload.errorCode || null,
      error_message: payload.errorMessage || null,
    }

    if (nextStatus === SmsJobStatus.SUBMITTED) {
      updateFields.submitted_at = now
    } else if (nextStatus === SmsJobStatus.FAILED) {
      updateFields.failed_at = now
    } else {
      updateFields.unknown_at = now
    }

    await this.jobRepository.update({ id: job.id }, updateFields)
    this.logger.log(`Job ${jobUid} reported by ${deviceId} -> ${nextStatus} (${updateFields.parts_sent}/${updateFields.parts_total} parts)`)

    const updated = await this.jobRepository.findOne({ where: { id: job.id } })
    await this.syncAnnouncementStatusForJob(updated, nextStatus)
    this.notifyDispatchReady()
    return updated
  }

  async recordDeliveryReport(deviceId: string, payload: SmsDeliveryReportPayload): Promise<SmsJob | null> {
    const jobUid = (payload.jobUid || '').trim()
    if (!jobUid) {
      return null
    }

    const job = await this.jobRepository.findOne({
      where: { job_uid: jobUid, device_id: deviceId },
    })
    if (!job) {
      return null
    }

    const now = new Date()
    const partsTotal = payload.partsTotal ?? job.parts_total ?? 1
    const partsDelivered = payload.partsDelivered ?? Math.min(partsTotal, (job.parts_delivered || 0) + 1)
    const allDelivered = partsDelivered >= partsTotal && payload.delivered !== false

    const updateFields: Partial<SmsJob> = {
      parts_delivered: partsDelivered,
      ...(allDelivered && job.status === SmsJobStatus.SUBMITTED
        ? {
            status: SmsJobStatus.DELIVERED,
            delivered_at: now,
          }
        : {}),
    }

    await this.jobRepository.update({ id: job.id }, updateFields)
    return this.jobRepository.findOne({ where: { id: job.id } })
  }
}
