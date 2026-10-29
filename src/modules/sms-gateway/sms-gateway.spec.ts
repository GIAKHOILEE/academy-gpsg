import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { WebSocket } from 'ws'
import { SmsDevice, SmsDeviceStatus } from './entities/sms-device.entity'
import { SmsJob, SmsJobStatus } from './entities/sms-job.entity'
import { SmsGatewayService } from './sms-gateway.service'
import { SmsGatewayWs } from './sms-gateway.ws'

describe('Phase 3 & 4: SmsGatewayService & SmsGatewayWs', () => {
  let service: SmsGatewayService
  let wsGateway: SmsGatewayWs
  let storedDevices: Map<string, SmsDevice>
  let storedJobs: Map<number, SmsJob>

  const mockDeviceRepository = {
    update: jest.fn().mockImplementation(async (criteria: any, partial: Partial<SmsDevice>) => {
      for (const dev of storedDevices.values()) {
        if (
          (criteria.id && dev.id === criteria.id) ||
          (criteria.device_id && dev.device_id === criteria.device_id) ||
          (criteria.status && dev.status === criteria.status)
        ) {
          Object.assign(dev, partial)
        }
      }
      return { affected: 1 }
    }),
    findOne: jest.fn().mockImplementation(async ({ where }: any) => {
      if (where?.device_id) {
        const dev = storedDevices.get(where.device_id)
        if (!dev) return null
        if (where.is_active !== undefined && dev.is_active !== where.is_active) return null
        return dev
      }
      if (where?.id) {
        for (const dev of storedDevices.values()) {
          if (dev.id === where.id) return dev
        }
      }
      return null
    }),
    create: jest.fn().mockImplementation((dto: Partial<SmsDevice>) => ({
      id: storedDevices.size + 1,
      ...dto,
    })),
    save: jest.fn().mockImplementation(async (entity: SmsDevice) => {
      storedDevices.set(entity.device_id, { ...entity })
      return { ...entity }
    }),
    createQueryBuilder: jest.fn().mockImplementation(() => {
      let targetDeviceId = ''
      return {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockImplementation((_q: string, params: { deviceId: string }) => {
          targetDeviceId = params.deviceId
          return {
            getOne: jest.fn().mockImplementation(async () => {
              const found = storedDevices.get(targetDeviceId)
              return found ? { ...found } : null
            }),
          }
        }),
      }
    }),
  }

  const mockJobRepository = {
    create: jest.fn().mockImplementation((dto: Partial<SmsJob>) => ({
      id: storedJobs.size + 1,
      dispatch_attempts: 0,
      lock_version: 0,
      parts_delivered: 0,
      created_at: new Date(),
      updated_at: new Date(),
      ...dto,
    })),
    save: jest.fn().mockImplementation(async (entity: SmsJob) => {
      const saved = { ...entity, id: entity.id || storedJobs.size + 1 }
      storedJobs.set(saved.id, saved)
      return { ...saved }
    }),
    findOne: jest.fn().mockImplementation(async ({ where }: any) => {
      const matchClause = (job: SmsJob, clause: any): boolean => {
        if (clause.id !== undefined && job.id !== clause.id) return false
        if (clause.job_uid !== undefined && job.job_uid !== clause.job_uid) return false
        if (clause.idempotency_key !== undefined && job.idempotency_key !== clause.idempotency_key) return false
        if (clause.device_id !== undefined && job.device_id !== clause.device_id) return false
        if (clause.status !== undefined && job.status !== clause.status) return false
        return true
      }

      const clauses = Array.isArray(where) ? where : [where]
      for (const job of storedJobs.values()) {
        if (clauses.some(c => matchClause(job, c))) {
          return { ...job }
        }
      }
      return null
    }),
    find: jest.fn().mockImplementation(async ({ where, take }: any) => {
      const list = Array.from(storedJobs.values())
        .filter(j => !where?.status || j.status === where.status)
        .sort((a, b) => b.priority - a.priority || a.id - b.id)
      return typeof take === 'number' ? list.slice(0, take) : list
    }),
    count: jest.fn().mockImplementation(async ({ where }: any) => {
      let count = 0
      for (const job of storedJobs.values()) {
        if (where?.device_id && job.device_id !== where.device_id) continue
        if (where?.status && typeof where.status === 'string' && job.status !== where.status) continue
        if (where?.dispatched_at && !job.dispatched_at) continue
        count++
      }
      return count
    }),
    update: jest.fn().mockImplementation(async (criteria: any, partial: Partial<SmsJob>) => {
      let affected = 0
      for (const job of storedJobs.values()) {
        if (criteria.id && job.id !== criteria.id) continue
        if (criteria.status && job.status !== criteria.status) continue
        Object.assign(job, partial)
        affected++
      }
      return { affected }
    }),
    createQueryBuilder: jest.fn().mockImplementation(() => {
      let setValues: any = {}
      let whereParams: any = {}
      return {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockImplementation((vals: any) => {
          setValues = vals
          return {
            where: jest.fn().mockImplementation((_q: string, params: any) => {
              whereParams = params
              return {
                execute: jest.fn().mockImplementation(async () => {
                  const target = storedJobs.get(whereParams.id)
                  if (!target || target.status !== whereParams.pendingStatus || target.device_id) {
                    return { affected: 0 }
                  }
                  target.status = setValues.status
                  target.device_id = setValues.device_id
                  target.lock_token = setValues.lock_token
                  target.dispatched_at = setValues.dispatched_at
                  target.dispatch_attempts = (target.dispatch_attempts || 0) + 1
                  target.lock_version = (target.lock_version || 0) + 1
                  return { affected: 1 }
                }),
              }
            }),
          }
        }),
      }
    }),
  }

  beforeEach(async () => {
    storedDevices = new Map<string, SmsDevice>()
    storedJobs = new Map<number, SmsJob>()
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsGatewayService,
        SmsGatewayWs,
        {
          provide: getRepositoryToken(SmsDevice),
          useValue: mockDeviceRepository,
        },
        {
          provide: getRepositoryToken(SmsJob),
          useValue: mockJobRepository,
        },
      ],
    }).compile()

    service = module.get<SmsGatewayService>(SmsGatewayService)
    wsGateway = module.get<SmsGatewayWs>(SmsGatewayWs)
  })

  it('registers a device, stores bcrypt hash, and authenticates over WebSocket', async () => {
    const reg = await service.registerDevice({
      device_id: 'android-sim-01',
      name: 'Main SIM Device',
      phone_number: '0901234567',
    })

    expect(reg.deviceSecret).toHaveLength(64)
    const inDb = storedDevices.get('android-sim-01')
    expect(inDb).toBeDefined()
    expect(inDb?.secret_hash).not.toBe(reg.deviceSecret)
    expect(inDb?.status).toBe(SmsDeviceStatus.OFFLINE)

    const sentFrames: any[] = []
    const mockSocket: any = {
      readyState: WebSocket.OPEN,
      send: jest.fn((raw: string) => sentFrames.push(JSON.parse(raw))),
      close: jest.fn(),
      terminate: jest.fn(),
    }

    await wsGateway.handleConnection(mockSocket, { headers: {}, socket: { remoteAddress: '127.0.0.1' } } as any)
    await wsGateway.onDeviceAuth(mockSocket, {
      deviceId: 'android-sim-01',
      secret: reg.deviceSecret,
      appVersion: '1.0.0',
      defaultSmsSubId: 1,
    })

    expect(sentFrames.length).toBe(1)
    expect(sentFrames[0].event).toBe('device:auth:ok')
    expect(sentFrames[0].data.message).toBe('Connected to server. Ready to send SMS.')
    expect(wsGateway.isDeviceOnline('android-sim-01')).toBe(true)
    expect(storedDevices.get('android-sim-01')?.status).toBe(SmsDeviceStatus.ONLINE)

    await wsGateway.handleDisconnect(mockSocket)
    expect(wsGateway.isDeviceOnline('android-sim-01')).toBe(false)
    expect(storedDevices.get('android-sim-01')?.status).toBe(SmsDeviceStatus.OFFLINE)
  })

  it('keeps SMS job PENDING when offline and dispatches + records SUBMITTED when device is ONLINE', async () => {
    const reg = await service.registerDevice({
      device_id: 'android-sim-01',
      name: 'Main SIM Device',
    })

    // Scenario C: Enqueue while device is offline -> remains PENDING
    const job = await service.enqueueSms({
      recipient: '0901234567',
      message: 'Ma OTP cua ban la 123456',
      idempotency_key: 'otp-req-1',
    })
    expect(job.status).toBe(SmsJobStatus.PENDING)

    // Idempotent duplicate request returns the exact same job_uid
    const dupJob = await service.enqueueSms({
      recipient: '0901234567',
      message: 'Ma OTP cua ban la 123456',
      idempotency_key: 'otp-req-1',
    })
    expect(dupJob.job_uid).toBe(job.job_uid)

    // Connect device -> dispatches job
    const sentFrames: any[] = []
    const mockSocket: any = {
      readyState: WebSocket.OPEN,
      send: jest.fn((raw: string) => sentFrames.push(JSON.parse(raw))),
      close: jest.fn(),
      terminate: jest.fn(),
    }

    await wsGateway.handleConnection(mockSocket, { headers: {}, socket: { remoteAddress: '127.0.0.1' } } as any)
    await wsGateway.onDeviceAuth(mockSocket, {
      deviceId: 'android-sim-01',
      secret: reg.deviceSecret,
    })

    const dispatched = await wsGateway.dispatchNextForDevice('android-sim-01')
    expect(dispatched).toBe(true)

    const dispatchFrame = sentFrames.find(f => f.event === 'job:dispatch')
    expect(dispatchFrame).toBeDefined()
    expect(dispatchFrame.data.jobUid).toBe(job.job_uid)
    expect(storedJobs.get(job.id)?.status).toBe(SmsJobStatus.PROCESSING)

    // Device reports job:accepted then job:result (SUBMITTED)
    await wsGateway.onJobAccepted(mockSocket, {
      jobUid: job.job_uid,
      lockToken: dispatchFrame.data.lockToken,
    })
    expect(storedJobs.get(job.id)?.accepted_at).toBeInstanceOf(Date)

    await wsGateway.onJobResult(mockSocket, {
      jobUid: job.job_uid,
      lockToken: dispatchFrame.data.lockToken,
      status: 'SUBMITTED',
      partsTotal: 1,
      partsSent: 1,
      partsFailed: 0,
    })
    expect(storedJobs.get(job.id)?.status).toBe(SmsJobStatus.SUBMITTED)
    expect(storedJobs.get(job.id)?.submitted_at).toBeInstanceOf(Date)
  })
})
