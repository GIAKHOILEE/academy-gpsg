import * as crypto from 'crypto'
import { StorageCryptoService } from '../services/storage-crypto.service'

describe('StorageCryptoService', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  const withKey = (key: string) => {
    process.env.STORAGE_ENCRYPTION_KEY = key
    return new StorageCryptoService()
  }

  it('mã hoá rồi giải mã trả lại đúng chuỗi ban đầu', () => {
    const service = withKey('mot-passphrase-bat-ky')
    const plain = 'secret-access-key-cua-r2'

    const encrypted = service.encrypt(plain)

    expect(encrypted).not.toContain(plain)
    expect(service.decrypt(encrypted)).toBe(plain)
  })

  it('giữ nguyên nội dung tiếng Việt và ký tự đặc biệt', () => {
    const service = withKey('key-test')
    const plain = 'Đường dẫn: /usr/app/storage — "tài liệu" 🎉'

    expect(service.decrypt(service.encrypt(plain))).toBe(plain)
  })

  it('sinh IV mới mỗi lần nên 2 lần mã hoá cùng nội dung cho ra 2 chuỗi khác nhau', () => {
    const service = withKey('key-test')

    const first = service.encrypt('same-value')
    const second = service.encrypt('same-value')

    expect(first).not.toBe(second)
    expect(service.decrypt(first)).toBe('same-value')
    expect(service.decrypt(second)).toBe('same-value')
  })

  it('nhận khoá dạng 64 ký tự hex và dùng đúng khoá đó', () => {
    const hexKey = crypto.randomBytes(32).toString('hex')

    const encrypted = withKey(hexKey).encrypt('value')
    // Service mới cùng khoá hex phải giải mã lại được
    expect(withKey(hexKey).decrypt(encrypted)).toBe('value')
  })

  it('khoá khác nhau thì không giải mã được, và báo lỗi chứ không trả ra rác', () => {
    const encrypted = withKey('khoa-thu-nhat').encrypt('value')

    expect(() => withKey('khoa-thu-hai').decrypt(encrypted)).toThrow()
  })

  it('dữ liệu bị sửa trong DB sẽ giải mã thất bại nhờ auth tag của GCM', () => {
    const service = withKey('key-test')
    const encrypted = service.encrypt('gia-tri-goc')

    // Đổi một ký tự trong phần base64
    const payload = encrypted.slice('enc.v1:'.length)
    const tampered = `enc.v1:${payload.slice(0, -2)}${payload.slice(-2) === 'AA' ? 'BB' : 'AA'}`

    expect(() => service.decrypt(tampered)).toThrow()
  })

  it('trả nguyên trạng chuỗi chưa mã hoá, để dữ liệu cũ vẫn đọc được', () => {
    const service = withKey('key-test')

    expect(service.decrypt('plaintext-cu-chua-ma-hoa')).toBe('plaintext-cu-chua-ma-hoa')
    expect(service.isEncrypted('plaintext-cu-chua-ma-hoa')).toBe(false)
    expect(service.isEncrypted(service.encrypt('x'))).toBe(true)
  })

  it('encryptJson / decryptJson giữ nguyên cấu trúc object', () => {
    const service = withKey('key-test')
    const config = {
      preset: 'cloudflare_r2',
      bucket: 'hvm',
      access_key_id: 'AKIA...',
      secret_access_key: 'rat-bi-mat',
      force_path_style: false,
      nested: { a: 1, b: [1, 2, 3] },
    }

    expect(service.decryptJson(service.encryptJson(config))).toEqual(config)
  })

  it('decryptJson trả object rỗng khi dữ liệu hỏng, không làm sập luồng gọi', () => {
    const service = withKey('key-test')
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined)

    expect(service.decryptJson('enc.v1:du-lieu-rac-khong-hop-le')).toEqual({})
    expect(service.decryptJson(null)).toEqual({})
    expect(service.decryptJson('')).toEqual({})
  })

  it('derive khoá từ ACCESS_TOKEN_SECRET khi chưa đặt STORAGE_ENCRYPTION_KEY', () => {
    delete process.env.STORAGE_ENCRYPTION_KEY
    process.env.ACCESS_TOKEN_SECRET = 'secret-cua-jwt'

    const first = new StorageCryptoService()
    jest.spyOn(first['logger'], 'warn').mockImplementation(() => undefined)
    const encrypted = first.encrypt('value')

    // Restart app vẫn phải giải mã lại được, vì khoá derive có tính tiền định
    const second = new StorageCryptoService()
    jest.spyOn(second['logger'], 'warn').mockImplementation(() => undefined)

    expect(second.decrypt(encrypted)).toBe('value')
  })

  it('encrypt(null) trả null thay vì chuỗi mã hoá của "null"', () => {
    const service = withKey('key-test')

    expect(service.encrypt(null)).toBeNull()
    expect(service.encrypt(undefined)).toBeNull()
    expect(service.decrypt(null)).toBeNull()
  })
})
