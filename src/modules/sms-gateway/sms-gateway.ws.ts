import { Logger } from '@nestjs/common'
import { Interval } from '@nestjs/schedule'
import { SkipThrottle } from '@nestjs/throttler'
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import * as crypto from 'crypto'
import { IncomingMessage } from 'http'
import { Server, WebSocket } from 'ws'
import { SmsDeliveryReportPayload, SmsGatewayService, SmsJobResultReportPayload } from './sms-gateway.service'

export interface ActiveDeviceConnection {
  socketId: string
  deviceId: string
  socket: WebSocket
  connectedAt: number
  lastHeartbeatAt: number
  ip: string
}

interface TrackedWebSocket extends WebSocket {
  __socketId?: string
  __deviceId?: string
  __ip?: string
  __authTimer?: NodeJS.Timeout
  __superseded?: boolean
}

@SkipThrottle()
@WebSocketGateway({
  path: '/ws/sms-gateway',
})
export class SmsGatewayWs implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(SmsGatewayWs.name)
  private readonly activeConnections = new Map<string, ActiveDeviceConnection>()
  private isPumpingQueue = false

  private static readonly AUTH_TIMEOUT_MS = 5_000
  private static readonly HEARTBEAT_TIMEOUT_MS = 45_000
  private static readonly MIN_INTER_JOB_DELAY_MS = 1_500

  constructor(private readonly smsGatewayService: SmsGatewayService) {
    this.smsGatewayService.registerDispatchTrigger(() => {
      this.pumpPendingQueue().catch(err => {
        this.logger.error(`Error pumping SMS queue: ${err?.message}`)
      })
    })
  }

  async handleConnection(client: TrackedWebSocket, request: IncomingMessage): Promise<void> {
    const socketId = crypto.randomUUID()
    const forwardedFor = request?.headers?.['x-forwarded-for']
    const ip = (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor?.split(',')[0]?.trim()) || request?.socket?.remoteAddress || 'unknown'

    client.__socketId = socketId
    client.__ip = ip

    // Enforce authentication within 5 seconds
    client.__authTimer = setTimeout(() => {
      if (!client.__deviceId) {
        this.logger.warn(`Socket ${socketId} (${ip}) timed out waiting for device:auth`)
        this.sendJson(client, 'device:auth:error', {
          code: 4008,
          reason: 'AUTH_TIMEOUT',
          message: 'Device authentication timed out',
        })
        client.close(4008, 'AUTH_TIMEOUT')
      }
    }, SmsGatewayWs.AUTH_TIMEOUT_MS)

    // Optional header-based authentication during WebSocket upgrade
    const headerDeviceId = request?.headers?.['x-device-id']
    const authHeader = request?.headers?.['authorization']
    if (typeof headerDeviceId === 'string' && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const secret = authHeader.slice('Bearer '.length).trim()
      await this.processDeviceAuth(client, {
        deviceId: headerDeviceId,
        secret,
        appVersion: typeof request.headers['x-app-version'] === 'string' ? request.headers['x-app-version'] : undefined,
      })
    }
  }

  async handleDisconnect(client: TrackedWebSocket): Promise<void> {
    if (client.__authTimer) {
      clearTimeout(client.__authTimer)
      client.__authTimer = undefined
    }

    const deviceId = client.__deviceId
    if (!deviceId || client.__superseded) {
      return
    }

    const current = this.activeConnections.get(deviceId)
    if (current && current.socketId === client.__socketId) {
      this.activeConnections.delete(deviceId)
      await this.smsGatewayService.markDeviceOffline(deviceId)
      this.logger.log(`Device ${deviceId} disconnected (socketId=${client.__socketId}) -> OFFLINE`)
    }
  }

  @SubscribeMessage('device:auth')
  async onDeviceAuth(
    @ConnectedSocket() client: TrackedWebSocket,
    @MessageBody()
    data: {
      deviceId?: string
      secret?: string
      appVersion?: string
      defaultSmsSubId?: number
    },
  ): Promise<void> {
    await this.processDeviceAuth(client, data || {})
  }

  @SubscribeMessage('device:ping')
  async onDevicePing(@ConnectedSocket() client: TrackedWebSocket, @MessageBody() data: { timestamp?: number }): Promise<void> {
    const deviceId = this.verifyAuthenticatedClient(client)
    if (!deviceId) {
      return
    }

    const active = this.activeConnections.get(deviceId)
    if (active) {
      active.lastHeartbeatAt = Date.now()
    }
    await this.smsGatewayService.recordHeartbeat(deviceId, client.__ip)

    this.sendJson(client, 'device:pong', {
      clientTimestamp: data?.timestamp ?? null,
      serverTimestamp: Date.now(),
    })
  }

  @SubscribeMessage('device:disconnect')
  async onDeviceExplicitDisconnect(@ConnectedSocket() client: TrackedWebSocket, @MessageBody() data: { reason?: string }): Promise<void> {
    const deviceId = client.__deviceId
    if (deviceId) {
      this.logger.log(`Device ${deviceId} requested clean disconnect: ${data?.reason || 'USER_DISCONNECT'}`)
    }
    this.sendJson(client, 'device:disconnected:ack', {
      timestamp: Date.now(),
    })
    client.close(1000, 'CLIENT_CLEAN_DISCONNECT')
  }

  @SubscribeMessage('job:accepted')
  async onJobAccepted(
    @ConnectedSocket() client: TrackedWebSocket,
    @MessageBody() data: { jobUid?: string; lockToken?: string; timestamp?: number },
  ): Promise<void> {
    const deviceId = this.verifyAuthenticatedClient(client)
    if (!deviceId || !data?.jobUid) {
      return
    }

    const job = await this.smsGatewayService.recordJobAccepted(deviceId, data.jobUid, data.lockToken)
    if (job) {
      this.sendJson(client, 'job:accepted:ack', {
        jobUid: job.job_uid,
        acceptedAt: job.accepted_at,
      })
    }
  }

  @SubscribeMessage('job:result')
  async onJobResult(@ConnectedSocket() client: TrackedWebSocket, @MessageBody() data: SmsJobResultReportPayload): Promise<void> {
    const deviceId = this.verifyAuthenticatedClient(client)
    if (!deviceId || !data?.jobUid) {
      return
    }

    const updated = await this.smsGatewayService.recordJobResult(deviceId, data)
    this.sendJson(client, 'job:result:ack', {
      jobUid: data.jobUid,
      recorded: Boolean(updated),
      status: updated?.status ?? null,
      timestamp: Date.now(),
    })

    // Trigger next pending job after a brief pacing pause
    setTimeout(() => {
      this.dispatchNextForDevice(deviceId).catch(err => {
        this.logger.error(`Error dispatching next job for ${deviceId}: ${err?.message}`)
      })
    }, SmsGatewayWs.MIN_INTER_JOB_DELAY_MS)
  }

  @SubscribeMessage('job:delivery_report')
  async onJobDeliveryReport(@ConnectedSocket() client: TrackedWebSocket, @MessageBody() data: SmsDeliveryReportPayload): Promise<void> {
    const deviceId = this.verifyAuthenticatedClient(client)
    if (!deviceId || !data?.jobUid) {
      return
    }

    const updated = await this.smsGatewayService.recordDeliveryReport(deviceId, data)
    this.sendJson(client, 'job:delivery_report:ack', {
      jobUid: data.jobUid,
      recorded: Boolean(updated),
      status: updated?.status ?? null,
    })
  }

  @SubscribeMessage('device:pull_pending')
  async onDevicePullPending(@ConnectedSocket() client: TrackedWebSocket): Promise<void> {
    const deviceId = this.verifyAuthenticatedClient(client)
    if (!deviceId) {
      return
    }
    await this.dispatchNextForDevice(deviceId)
  }

  @Interval(5_000)
  async scheduledQueuePump(): Promise<void> {
    await this.pumpPendingQueue()
  }

  @Interval(15_000)
  async sweepStaleConnections(): Promise<void> {
    const now = Date.now()
    for (const [deviceId, conn] of this.activeConnections.entries()) {
      if (now - conn.lastHeartbeatAt > SmsGatewayWs.HEARTBEAT_TIMEOUT_MS) {
        this.logger.warn(`Device ${deviceId} heartbeat timed out (${now - conn.lastHeartbeatAt}ms) -> closing socket`)
        this.activeConnections.delete(deviceId)
        await this.smsGatewayService.markDeviceOffline(deviceId)
        try {
          conn.socket.close(4000, 'HEARTBEAT_TIMEOUT')
        } catch {
          conn.socket.terminate()
        }
      }
    }
  }

  async pumpPendingQueue(): Promise<void> {
    if (this.isPumpingQueue) {
      return
    }
    const connectedIds = this.getConnectedDeviceIds()
    if (connectedIds.length === 0) {
      return
    }

    this.isPumpingQueue = true
    try {
      for (const deviceId of connectedIds) {
        await this.dispatchNextForDevice(deviceId)
      }
    } finally {
      this.isPumpingQueue = false
    }
  }

  async dispatchNextForDevice(deviceId: string): Promise<boolean> {
    if (!this.isDeviceOnline(deviceId)) {
      return false
    }

    const claimed = await this.smsGatewayService.claimNextJobForDevice(deviceId)
    if (!claimed) {
      return false
    }

    const sent = this.sendToDevice(deviceId, 'job:dispatch', {
      jobUid: claimed.job_uid,
      lockToken: claimed.lock_token,
      recipient: claimed.recipient,
      message: claimed.message,
      priority: claimed.priority,
      createdAt: claimed.created_at,
    })

    if (!sent) {
      // Socket was not open when sendToDevice was called -> 0 bytes written to wire -> safe to release claim
      await this.smsGatewayService.releaseUnwrittenClaim(claimed.job_uid, claimed.lock_token)
      return false
    }

    this.logger.log(`Dispatched job ${claimed.job_uid} to device ${deviceId} (recipient=${claimed.recipient})`)
    return true
  }

  isDeviceOnline(deviceId: string): boolean {
    const conn = this.activeConnections.get(deviceId)
    return Boolean(conn && conn.socket.readyState === WebSocket.OPEN)
  }

  getConnectedDeviceIds(): string[] {
    const ids: string[] = []
    for (const [deviceId, conn] of this.activeConnections.entries()) {
      if (conn.socket.readyState === WebSocket.OPEN) {
        ids.push(deviceId)
      }
    }
    return ids
  }

  disconnectDevice(deviceId: string, code = 4003, reason = 'ADMIN_DISCONNECT'): void {
    const existing = this.activeConnections.get(deviceId)
    if (!existing) {
      return
    }
    this.activeConnections.delete(deviceId)
    const tracked = existing.socket as TrackedWebSocket
    tracked.__superseded = true
    this.sendJson(existing.socket, 'device:disconnect_notice', { code, reason })
    try {
      existing.socket.close(code, reason)
    } catch {
      existing.socket.terminate()
    }
  }

  sendToDevice(deviceId: string, event: string, data: Record<string, any>): boolean {
    const conn = this.activeConnections.get(deviceId)
    if (!conn || conn.socket.readyState !== WebSocket.OPEN) {
      return false
    }
    return this.sendJson(conn.socket, event, data)
  }

  private verifyAuthenticatedClient(client: TrackedWebSocket): string | null {
    const deviceId = client.__deviceId
    if (!deviceId) {
      this.sendJson(client, 'device:error', {
        code: 4001,
        reason: 'UNAUTHENTICATED',
      })
      client.close(4001, 'UNAUTHENTICATED')
      return null
    }
    const active = this.activeConnections.get(deviceId)
    if (!active || active.socketId !== client.__socketId) {
      client.close(4009, 'REPLACED_BY_NEW_CONNECTION')
      return null
    }
    return deviceId
  }

  private async processDeviceAuth(
    client: TrackedWebSocket,
    data: {
      deviceId?: string
      secret?: string
      appVersion?: string
      defaultSmsSubId?: number
    },
  ): Promise<void> {
    if (client.__authTimer) {
      clearTimeout(client.__authTimer)
      client.__authTimer = undefined
    }

    const outcome = await this.smsGatewayService.authenticateDevice({
      deviceId: data.deviceId || '',
      secret: data.secret || '',
      ip: client.__ip,
      appVersion: data.appVersion,
      defaultSmsSubId: data.defaultSmsSubId,
    })

    if (!outcome.authenticated || !outcome.device) {
      const code = outcome.code || 4001
      const reason = outcome.reason || 'UNAUTHORIZED'
      this.logger.warn(`Device auth failed for '${data.deviceId || 'unknown'}' (${client.__ip}): ${reason}`)
      this.sendJson(client, 'device:auth:error', {
        code,
        reason,
        message: reason === 'DEVICE_DISABLED' ? 'Device is disabled by administrator' : 'Invalid device credentials',
      })
      client.close(code, reason)
      return
    }

    const deviceId = outcome.device.device_id

    // Protect against duplicate WebSocket connections for the same deviceId
    const previous = this.activeConnections.get(deviceId)
    if (previous && previous.socketId !== client.__socketId) {
      this.logger.warn(`Replacing existing WebSocket connection for device ${deviceId} (old=${previous.socketId}, new=${client.__socketId})`)
      const oldTracked = previous.socket as TrackedWebSocket
      oldTracked.__superseded = true
      this.activeConnections.delete(deviceId)
      this.sendJson(previous.socket, 'device:disconnect_notice', {
        code: 4009,
        reason: 'REPLACED_BY_NEW_CONNECTION',
      })
      try {
        previous.socket.close(4009, 'REPLACED_BY_NEW_CONNECTION')
      } catch {
        previous.socket.terminate()
      }
    }

    const now = Date.now()
    client.__deviceId = deviceId
    this.activeConnections.set(deviceId, {
      socketId: client.__socketId || crypto.randomUUID(),
      deviceId,
      socket: client,
      connectedAt: now,
      lastHeartbeatAt: now,
      ip: client.__ip || 'unknown',
    })

    this.logger.log(`Device ${deviceId} authenticated and ONLINE (${client.__ip})`)

    this.sendJson(client, 'device:auth:ok', {
      deviceId,
      name: outcome.device.name,
      status: outcome.device.status,
      rateLimitPerMinute: outcome.device.rate_limit_per_minute,
      dailyLimit: outcome.device.daily_limit,
      serverTimestamp: now,
      message: 'Connected to server. Ready to send SMS.',
    })

    // Dispatch any eligible pending job to the newly connected device
    setImmediate(() => {
      this.dispatchNextForDevice(deviceId).catch(err => {
        this.logger.error(`Failed initial dispatch for ${deviceId}: ${err?.message}`)
      })
    })
  }

  private sendJson(socket: WebSocket, event: string, data: Record<string, any>): boolean {
    if (socket.readyState !== WebSocket.OPEN) {
      return false
    }
    try {
      socket.send(
        JSON.stringify({
          event,
          data,
          timestamp: Date.now(),
        }),
      )
      return true
    } catch (err: any) {
      this.logger.error(`Failed to send WS event '${event}': ${err?.message}`)
      return false
    }
  }
}
