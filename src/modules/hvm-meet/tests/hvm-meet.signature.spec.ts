import { createHmac } from 'crypto'
import { computeHvmMeetSignature, parseHvmMeetSignatureHeader, signHvmMeetPayload, verifyHvmMeetSignature } from '../hvm-meet.signature'

describe('Chữ ký webhook HVM Meet', () => {
  const secret = 'whsec_test_123'
  const now = new Date('2026-10-26T10:00:00.000Z')
  const body = Buffer.from(JSON.stringify({ id: 'd1', event: 'ping', createdAt: now.toISOString(), app: 'academy', data: {} }))

  it('chữ ký đúng (cùng secret, cùng raw body, trong 300 giây) thì hợp lệ', () => {
    const header = signHvmMeetPayload(secret, body, now)
    expect(verifyHvmMeetSignature(header, body, secret, now)).toEqual({ ok: true, timestamp: Math.floor(now.getTime() / 1000) })
  })

  it('khớp đúng công thức hex(hmac_sha256(secret, "<t>.<body>")) của HVM Meet', () => {
    const t = 1761472800
    const expected = createHmac('sha256', secret).update(`${t}.${body.toString()}`).digest('hex')
    expect(computeHvmMeetSignature(secret, t, body)).toBe(expected)
  })

  it('body bị sửa (dù chỉ một byte) thì từ chối', () => {
    const header = signHvmMeetPayload(secret, body, now)
    const tampered = Buffer.from(body.toString().replace('"ping"', '"pong"'))
    expect(verifyHvmMeetSignature(header, tampered, secret, now)).toEqual({ ok: false, reason: 'mismatch' })
  })

  it('JSON parse rồi stringify lại (khác byte gốc) thì từ chối, nên phải dùng raw body', () => {
    const pretty = Buffer.from(JSON.stringify(JSON.parse(body.toString()), null, 2))
    const header = signHvmMeetPayload(secret, body, now)
    expect(verifyHvmMeetSignature(header, pretty, secret, now)).toEqual({ ok: false, reason: 'mismatch' })
  })

  it('sai secret thì từ chối', () => {
    const header = signHvmMeetPayload('secret-khac', body, now)
    expect(verifyHvmMeetSignature(header, body, secret, now)).toEqual({ ok: false, reason: 'mismatch' })
  })

  it('đổi t trong header (giữ v1 cũ) thì từ chối', () => {
    const header = signHvmMeetPayload(secret, body, now)
    const shifted = header.replace(/t=(\d+)/, (_, t) => `t=${Number(t) + 1}`)
    expect(verifyHvmMeetSignature(shifted, body, secret, now)).toEqual({ ok: false, reason: 'mismatch' })
  })

  it.each([
    ['quá 300 giây trước', -301],
    ['quá 300 giây sau (giờ máy lệch)', 301],
  ])('chữ ký %s thì hết hạn', (_label, offsetSeconds) => {
    const signedAt = new Date(now.getTime() + offsetSeconds * 1000)
    const header = signHvmMeetPayload(secret, body, signedAt)
    expect(verifyHvmMeetSignature(header, body, secret, now)).toEqual({ ok: false, reason: 'expired' })
  })

  it('đúng 300 giây vẫn còn hợp lệ', () => {
    const header = signHvmMeetPayload(secret, body, new Date(now.getTime() - 300 * 1000))
    expect(verifyHvmMeetSignature(header, body, secret, now).ok).toBe(true)
  })

  it.each([
    ['thiếu header', undefined, 'missing_header'],
    ['header rác', 'abc', 'malformed_header'],
    ['thiếu v1', 't=1761472800', 'malformed_header'],
    ['v1 không phải hex', 't=1761472800,v1=xyz', 'malformed_header'],
  ])('%s thì từ chối', (_label, header, reason) => {
    expect(verifyHvmMeetSignature(header as string, body, secret, now)).toEqual({ ok: false, reason })
  })

  it('academy chưa cấu hình secret thì không nhận webhook nào', () => {
    const header = signHvmMeetPayload(secret, body, now)
    expect(verifyHvmMeetSignature(header, body, null, now)).toEqual({ ok: false, reason: 'missing_secret' })
  })

  it('chấp nhận nhiều v1 (lúc HVM Meet xoay secret), chỉ cần một cái khớp', () => {
    const t = Math.floor(now.getTime() / 1000)
    const header = `t=${t},v1=${computeHvmMeetSignature('secret-cu', t, body)},v1=${computeHvmMeetSignature(secret, t, body)}`
    expect(parseHvmMeetSignatureHeader(header)?.signatures).toHaveLength(2)
    expect(verifyHvmMeetSignature(header, body, secret, now).ok).toBe(true)
  })
})
