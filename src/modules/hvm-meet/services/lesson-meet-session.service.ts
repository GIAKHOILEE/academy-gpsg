import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { LessonMeetSession } from '../entities/lesson-meet-session.entity'
import { lessonExternalId } from '../hvm-meet.constants'
import { HvmMeetSession } from '../hvm-meet.types'
import { HvmMeetClientService, HvmMeetConnection } from './hvm-meet-client.service'

/** Thông tin một session nhận được (từ webhook hoặc từ API danh sách session). */
export interface LessonMeetSessionPatch {
  room_id?: string | null
  started_at?: string | Date | null
  ended_at?: string | Date | null
  peak_participants?: number | null
  recording_ready?: boolean
  attendance_finalized?: boolean
}

/** Không gọi lại API danh sách session của cùng buổi học trong khoảng này. */
export const SESSION_SYNC_INTERVAL_MS = 60 * 1000

const toDate = (value: string | Date | null | undefined): Date | null => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Sổ ghi các session HVM Meet theo buổi học.
 *
 * Ghi idempotent: webhook gửi lại, đến không theo thứ tự (room.ended trước room.started),
 * hay đồng bộ bù từ API đều cho cùng kết quả — giờ bắt đầu giữ giá trị sớm nhất, giờ kết
 * thúc / cờ bản ghi / cờ điểm danh một khi đã có thì không bị xoá.
 */
@Injectable()
export class LessonMeetSessionService {
  private readonly logger = new Logger(LessonMeetSessionService.name)
  private readonly lastSyncAt = new Map<number, number>()

  constructor(
    @InjectRepository(LessonMeetSession)
    private readonly sessionRepository: Repository<LessonMeetSession>,
    private readonly client: HvmMeetClientService,
  ) {}

  async record(lessonId: number, sessionId: string, patch: LessonMeetSessionPatch): Promise<LessonMeetSession | null> {
    if (!sessionId) return null

    const existing = await this.sessionRepository.findOne({ where: { session_id: sessionId } })
    const session = existing || this.sessionRepository.create({ lesson_id: lessonId, session_id: sessionId })
    if (!this.applyPatch(session, patch) && existing) return existing

    try {
      return await this.sessionRepository.save(session)
    } catch (error: any) {
      // Hai webhook cùng session tới cùng lúc: dòng kia vừa tạo xong thì gộp vào dòng đó
      if (existing || error?.code !== 'ER_DUP_ENTRY') throw error
      const created = await this.sessionRepository.findOne({ where: { session_id: sessionId } })
      if (!created) throw error
      this.applyPatch(created, patch)
      return this.sessionRepository.save(created)
    }
  }

  /** Mới nhất trước. */
  listByLesson(lessonId: number): Promise<LessonMeetSession[]> {
    return this.sessionRepository.find({ where: { lesson_id: lessonId }, order: { started_at: 'DESC', id: 'DESC' } })
  }

  findForLesson(lessonId: number, sessionId: string): Promise<LessonMeetSession | null> {
    return this.sessionRepository.findOne({ where: { lesson_id: lessonId, session_id: sessionId } })
  }

  /**
   * Đồng bộ bù từ HVM Meet (phòng khi webhook bị lỡ). Lỗi chỉ ghi log: danh sách trong DB vẫn dùng được.
   */
  async syncFromHvmMeet(conn: HvmMeetConnection, lessonId: number, force = false): Promise<void> {
    const now = Date.now()
    if (!force && now - (this.lastSyncAt.get(lessonId) || 0) < SESSION_SYNC_INTERVAL_MS) return
    this.lastSyncAt.set(lessonId, now)
    if (this.lastSyncAt.size > 2000) this.lastSyncAt.delete(this.lastSyncAt.keys().next().value)

    let sessions: HvmMeetSession[]
    try {
      sessions = await this.client.listSessions(conn, lessonExternalId(lessonId))
    } catch (error: any) {
      // Phòng chưa từng được tạo bên HVM Meet thì đơn giản là chưa có buổi nào
      if (error?.code !== 'ROOM_NOT_FOUND') this.logger.warn(`Không đồng bộ được danh sách buổi HVM Meet của buổi học ${lessonId}: ${error?.message}`)
      return
    }

    for (const session of Array.isArray(sessions) ? sessions : []) {
      await this.record(lessonId, session.id, {
        room_id: session.roomId,
        started_at: session.startedAt,
        ended_at: session.endedAt,
        peak_participants: session.peakParticipants,
        attendance_finalized: Boolean(session.attendanceFinalizedAt),
      })
    }
  }

  /** Dạng trả ra API cho FE. */
  toResponse(session: LessonMeetSession) {
    const startedAt = session.started_at ? new Date(session.started_at) : null
    const endedAt = session.ended_at ? new Date(session.ended_at) : null
    return {
      session_id: session.session_id,
      started_at: startedAt,
      ended_at: endedAt,
      duration_seconds: startedAt && endedAt ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)) : null,
      is_live: Boolean(startedAt && !endedAt),
      peak_participants: session.peak_participants ?? null,
      recording_ready: Boolean(session.recording_ready),
      attendance_finalized: Boolean(session.attendance_finalized),
    }
  }

  /* ------------------------------ private ------------------------------ */

  /** Gộp thông tin mới vào dòng; trả về true nếu có gì thay đổi. */
  private applyPatch(session: LessonMeetSession, patch: LessonMeetSessionPatch): boolean {
    let changed = !session.id

    if (patch.room_id && session.room_id !== patch.room_id) {
      session.room_id = patch.room_id
      changed = true
    }

    const startedAt = toDate(patch.started_at)
    if (startedAt && (!session.started_at || startedAt.getTime() < new Date(session.started_at).getTime())) {
      session.started_at = startedAt
      changed = true
    }

    const endedAt = toDate(patch.ended_at)
    if (endedAt && (!session.ended_at || new Date(session.ended_at).getTime() !== endedAt.getTime())) {
      session.ended_at = endedAt
      changed = true
    }

    if (typeof patch.peak_participants === 'number' && patch.peak_participants > (session.peak_participants ?? -1)) {
      session.peak_participants = patch.peak_participants
      changed = true
    }

    if (patch.recording_ready && !session.recording_ready) {
      session.recording_ready = true
      changed = true
    }

    if (patch.attendance_finalized && !session.attendance_finalized) {
      session.attendance_finalized = true
      changed = true
    }

    return changed
  }
}
