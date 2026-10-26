import * as crypto from 'crypto'
import { HVM_MEET_SIGNATURE_TOLERANCE_SECONDS } from './hvm-meet.constants'

/**
 * Chữ ký webhook HVM Meet:
 *   X-HVM-Signature: t=<unix>,v1=<hex hmac_sha256(secret, "<t>.<raw body>")>
 *
 * Phải ký/kiểm trên đúng byte của body nhận được (raw body), không phải JSON đã parse rồi stringify lại.
 */

export type HvmMeetSignatureFailure = 'missing_secret' | 'missing_header' | 'malformed_header' | 'expired' | 'mismatch'

export type HvmMeetSignatureResult = { ok: true; timestamp: number } | { ok: false; reason: HvmMeetSignatureFailure }

export function computeHvmMeetSignature(secret: string, timestamp: number | string, rawBody: Buffer | string): string {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex')
}

/** Dựng header như HVM Meet gửi. Dùng cho test và khi cần tự gửi thử. */
export function signHvmMeetPayload(secret: string, rawBody: Buffer | string, now: Date = new Date()): string {
  const timestamp = Math.floor(now.getTime() / 1000)
  return `t=${timestamp},v1=${computeHvmMeetSignature(secret, timestamp, rawBody)}`
}

/** Tách "t=...,v1=..." (cho phép nhiều v1 khi HVM Meet xoay secret). */
export function parseHvmMeetSignatureHeader(header: string | null | undefined): { timestamp: number; signatures: string[] } | null {
  if (!header) return null
  let timestamp: number | null = null
  const signatures: string[] = []

  for (const part of String(header).split(',')) {
    const index = part.indexOf('=')
    if (index <= 0) continue
    const key = part.slice(0, index).trim()
    const value = part.slice(index + 1).trim()
    if (key === 't' && /^\d+$/.test(value)) timestamp = Number(value)
    if (key === 'v1' && /^[0-9a-fA-F]+$/.test(value)) signatures.push(value.toLowerCase())
  }

  if (timestamp === null || !signatures.length) return null
  return { timestamp, signatures }
}

/**
 * Kiểm chữ ký: so sánh thời gian hằng (timingSafeEqual) và chặn replay khi |now - t| > 300 giây.
 */
export function verifyHvmMeetSignature(
  header: string | null | undefined,
  rawBody: Buffer | string,
  secret: string | null | undefined,
  now: Date = new Date(),
  toleranceSeconds: number = HVM_MEET_SIGNATURE_TOLERANCE_SECONDS,
): HvmMeetSignatureResult {
  if (!secret) return { ok: false, reason: 'missing_secret' }
  if (!header) return { ok: false, reason: 'missing_header' }

  const parsed = parseHvmMeetSignatureHeader(header)
  if (!parsed) return { ok: false, reason: 'malformed_header' }

  const nowSeconds = Math.floor(now.getTime() / 1000)
  if (Math.abs(nowSeconds - parsed.timestamp) > toleranceSeconds) return { ok: false, reason: 'expired' }

  const expected = Buffer.from(computeHvmMeetSignature(secret, parsed.timestamp, rawBody), 'hex')
  const matched = parsed.signatures.some(signature => {
    const received = Buffer.from(signature, 'hex')
    return received.length === expected.length && crypto.timingSafeEqual(received, expected)
  })

  return matched ? { ok: true, timestamp: parsed.timestamp } : { ok: false, reason: 'mismatch' }
}
