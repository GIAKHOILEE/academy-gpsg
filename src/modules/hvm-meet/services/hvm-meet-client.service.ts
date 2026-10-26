import { throwAppException } from '@common/utils'
import { ErrorCode } from '@enums/error-codes.enum'
import { HttpStatus, Injectable, Logger } from '@nestjs/common'
import { HVM_MEET_REQUEST_TIMEOUT_MS } from '../hvm-meet.constants'
import { HvmMeetCreateTicketRequest, HvmMeetIntegrationMe, HvmMeetRoom, HvmMeetTicket, HvmMeetUpsertRoomRequest } from '../hvm-meet.types'

/** Cặp URL + API key để gọi HVM Meet; lấy từ cấu hình đã giải mã. */
export interface HvmMeetConnection {
  baseUrl: string
  apiKey: string
}

/**
 * Lỗi do HVM Meet trả về (`{ code, message, details? }`) hoặc lỗi mạng.
 * `status = null` nghĩa là không nói chuyện được với HVM Meet (timeout, DNS, từ chối kết nối).
 */
export class HvmMeetApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code?: string,
    readonly details?: any,
  ) {
    super(message)
    this.name = 'HvmMeetApiError'
  }
}

/**
 * Client server-to-server cho nhóm API `/v1/integration/*` của HVM Meet (header X-Api-Key).
 *
 * Không giữ cấu hình: mỗi lần gọi truyền `HvmMeetConnection` vào, vì URL/key là cấu hình
 * động trong DB và có thể đổi bất cứ lúc nào trên trang quản trị.
 */
@Injectable()
export class HvmMeetClientService {
  private readonly logger = new Logger(HvmMeetClientService.name)

  /** Ứng dụng đang dùng key này. Dùng cho "Kiểm tra kết nối". */
  me(conn: HvmMeetConnection): Promise<HvmMeetIntegrationMe> {
    return this.request(conn, 'GET', '/v1/integration/me', { action: 'kiểm tra kết nối' })
  }

  /** Tạo hoặc cập nhật phòng theo externalId. Gọi lại nhiều lần an toàn. */
  upsertRoom(conn: HvmMeetConnection, externalId: string, body: HvmMeetUpsertRoomRequest): Promise<HvmMeetRoom> {
    return this.request(conn, 'PUT', `/v1/integration/rooms/${encodeURIComponent(externalId)}`, { body, action: 'tạo phòng học' })
  }

  /** Vé vào phòng dùng một lần, sống ngắn (~2 phút): chỉ gọi ngay trước khi đưa người dùng vào phòng. */
  createTicket(conn: HvmMeetConnection, externalId: string, body: HvmMeetCreateTicketRequest): Promise<HvmMeetTicket> {
    return this.request(conn, 'POST', `/v1/integration/rooms/${encodeURIComponent(externalId)}/tickets`, {
      body,
      action: 'cấp vé vào phòng',
    })
  }

  getRoom(conn: HvmMeetConnection, externalId: string): Promise<HvmMeetRoom> {
    return this.request(conn, 'GET', `/v1/integration/rooms/${encodeURIComponent(externalId)}`, { action: 'lấy thông tin phòng' })
  }

  listSessions(conn: HvmMeetConnection, externalId: string): Promise<any[]> {
    return this.request(conn, 'GET', `/v1/integration/rooms/${encodeURIComponent(externalId)}/sessions`, { action: 'lấy danh sách buổi' })
  }

  listRecordings(conn: HvmMeetConnection, externalId: string): Promise<any[]> {
    return this.request(conn, 'GET', `/v1/integration/rooms/${encodeURIComponent(externalId)}/recordings`, { action: 'lấy danh sách bản ghi' })
  }

  getAttendance(conn: HvmMeetConnection, sessionId: string): Promise<any> {
    return this.request(conn, 'GET', `/v1/integration/sessions/${encodeURIComponent(sessionId)}/attendance`, { action: 'lấy báo cáo điểm danh' })
  }

  /** Kết thúc buổi đang diễn ra, phòng vẫn mở để vào lại. */
  endRoom(conn: HvmMeetConnection, externalId: string): Promise<void> {
    return this.request(conn, 'POST', `/v1/integration/rooms/${encodeURIComponent(externalId)}/end`, { action: 'kết thúc buổi học' })
  }

  /** Đóng hẳn phòng (không cho vào nữa), dữ liệu vẫn giữ bên HVM Meet. */
  closeRoom(conn: HvmMeetConnection, externalId: string): Promise<void> {
    return this.request(conn, 'DELETE', `/v1/integration/rooms/${encodeURIComponent(externalId)}`, { action: 'đóng phòng học' })
  }

  /**
   * Đổi lỗi HVM Meet sang lỗi của academy (thông báo tiếng Việt, `data.reason` để FE phân nhánh).
   * Lỗi cấu hình (sai key, app bị tắt) không lộ chi tiết cho học viên, chỉ ghi log.
   */
  rethrowAsAppException(error: unknown): never {
    if (!(error instanceof HvmMeetApiError)) throw error

    if (error.code === 'ROOM_NOT_OPEN_YET') {
      const opensAt = error.details?.opensAt ? String(error.details.opensAt) : undefined
      throwAppException('HVM_MEET_ROOM_NOT_OPEN_YET', ErrorCode.HVM_MEET_ROOM_NOT_OPEN_YET, HttpStatus.FORBIDDEN, {
        reason: 'ROOM_NOT_OPEN_YET',
        opens_at: opensAt,
      })
    }
    if (error.code === 'ROOM_JOIN_CLOSED') {
      throwAppException('HVM_MEET_ROOM_JOIN_CLOSED', ErrorCode.HVM_MEET_ROOM_JOIN_CLOSED, HttpStatus.FORBIDDEN, { reason: 'ROOM_JOIN_CLOSED' })
    }
    if (error.code === 'ROOM_CLOSED') {
      throwAppException('HVM_MEET_ROOM_CLOSED', ErrorCode.HVM_MEET_ROOM_CLOSED, HttpStatus.FORBIDDEN, { reason: 'ROOM_CLOSED' })
    }

    // Không gọi được, HVM Meet lỗi, quá tải, hoặc key bị từ chối: với người dùng đều là "tạm thời không vào được"
    if (error.status === null || error.status >= 500 || error.status === 429 || error.status === 401 || error.status === 403) {
      this.logger.error(`HVM Meet không phục vụ được yêu cầu: ${error.message}`)
      throwAppException('HVM_MEET_UNAVAILABLE', ErrorCode.HVM_MEET_UNAVAILABLE, HttpStatus.SERVICE_UNAVAILABLE, {
        reason: 'UNAVAILABLE',
        hvm_code: error.code || undefined,
      })
    }

    // Còn lại là yêu cầu không hợp lệ (ROLE_UNKNOWN, IDENTITY_INVALID, validation...): lỗi tích hợp, cần xem log
    this.logger.error(`HVM Meet từ chối yêu cầu: ${error.message}`)
    throwAppException('HVM_MEET_REQUEST_FAILED', ErrorCode.HVM_MEET_REQUEST_FAILED, HttpStatus.BAD_GATEWAY, {
      reason: 'UNAVAILABLE',
      hvm_code: error.code || undefined,
    })
  }

  /** Câu mô tả lỗi cho người quản trị (trang cấu hình), không phải cho học viên. */
  describeError(error: any): string {
    if (error instanceof HvmMeetApiError) {
      if (error.status === 401 || error.status === 403) {
        return `API key bị HVM Meet từ chối (HTTP ${error.status}). Kiểm tra lại key trong trang quản trị HVM Meet, hoặc ứng dụng đã bị tắt.`
      }
      return error.message
    }
    return error?.message || 'Không kết nối được HVM Meet'
  }

  /* ------------------------------ private ------------------------------ */

  private async request<T = any>(
    conn: HvmMeetConnection,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    options: { body?: any; action: string },
  ): Promise<T> {
    const baseUrl = String(conn.baseUrl || '').replace(/\/+$/, '')
    const headers: Record<string, string> = { 'X-Api-Key': conn.apiKey, Accept: 'application/json' }
    let body: string | undefined
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(options.body)
    }

    const response = await this.rawFetch(baseUrl, `${baseUrl}${path}`, { method, headers, body })
    const text = await response.text()
    const payload = this.parseJson(text)

    if (!response.ok) {
      const detail = payload?.message || (text ? text.slice(0, 300) : '')
      throw new HvmMeetApiError(
        `HVM Meet trả về lỗi ${response.status} khi ${options.action}${detail ? `: ${detail}` : ''}`,
        response.status,
        payload?.code,
        payload?.details,
      )
    }

    return payload as T
  }

  private async rawFetch(baseUrl: string, url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), HVM_MEET_REQUEST_TIMEOUT_MS)
    try {
      return await fetch(url, { ...init, signal: controller.signal })
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new HvmMeetApiError(`HVM Meet không phản hồi sau ${HVM_MEET_REQUEST_TIMEOUT_MS / 1000} giây (${baseUrl}).`, null, 'TIMEOUT')
      }
      const cause = error?.cause?.code || error?.code
      throw new HvmMeetApiError(`Không kết nối được HVM Meet tại ${baseUrl}${cause ? ` (${cause})` : ''}: ${error?.message}`, null, cause)
    } finally {
      clearTimeout(timer)
    }
  }

  private parseJson(text: string): any {
    if (!text) return null
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  }
}
