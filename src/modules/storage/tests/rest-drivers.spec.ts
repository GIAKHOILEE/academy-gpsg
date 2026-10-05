import { GoogleDriveAuthMode } from '@enums/storage.enum'
import axios from 'axios'
import * as crypto from 'crypto'
import { AzureBlobStorageDriver } from '../drivers/azure-blob.driver'
import { BunnyStorageDriver } from '../drivers/bunny.driver'
import { DropboxStorageDriver } from '../drivers/dropbox.driver'
import { GoogleDriveStorageDriver } from '../drivers/google-drive.driver'
import { oauthTokenCache } from '../drivers/oauth-token-cache'
import { OneDriveStorageDriver } from '../drivers/onedrive.driver'

/** Một instance axios giả, dùng chung cho mọi driver dạng REST. */
const http = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
  head: jest.fn(),
}

// Driver import axios dạng default, nên mock phải khai báo __esModule + default,
// không thì `axios.create` sẽ là undefined khi ts-jest biên dịch sang CommonJS.
jest.mock('axios', () => {
  const mocked = {
    create: jest.fn(() => http),
    get: jest.fn(),
    post: jest.fn(),
  }
  return { __esModule: true, default: mocked, ...mocked }
})

const resetHttp = () => {
  for (const method of Object.values(http)) method.mockReset()
}

const makeInput = (objectKey: string, mimeType = 'image/png') => ({
  buffer: Buffer.from('noi dung file'),
  originalName: objectKey.split('/').pop(),
  mimeType,
  objectKey,
})

describe('GoogleDriveStorageDriver', () => {
  const oauthConfig = {
    auth_mode: GoogleDriveAuthMode.OAUTH,
    client_id: 'client-id',
    client_secret: 'client-secret',
    refresh_token: 'refresh-token',
  }

  beforeEach(() => {
    resetHttp()
    oauthTokenCache.clear()
    // Mọi driver Google đều phải đổi refresh token thành access token trước
    http.post.mockResolvedValue({ data: { access_token: 'access-token', expires_in: 3600 } })
  })

  describe('xác thực', () => {
    it('đổi refresh token thành access token rồi mới gọi API Drive', async () => {
      http.get.mockResolvedValue({ data: { storageQuota: { usage: '100', limit: '1000' } } })

      await new GoogleDriveStorageDriver(oauthConfig).getUsage()

      const [tokenUrl, body] = http.post.mock.calls[0]
      expect(tokenUrl).toBe('https://oauth2.googleapis.com/token')
      expect(body).toContain('grant_type=refresh_token')
      expect(http.get.mock.calls[0][1].headers.Authorization).toBe('Bearer access-token')
    })

    it('chỉ đổi token một lần cho nhiều lệnh liên tiếp, nhờ cache', async () => {
      http.get.mockResolvedValue({ data: { storageQuota: {} } })
      const driver = new GoogleDriveStorageDriver(oauthConfig)

      await driver.getUsage()
      await driver.getUsage()

      expect(http.post).toHaveBeenCalledTimes(1)
    })

    it('ký JWT RS256 để lấy token cho service account, không cần thư viện googleapis', async () => {
      const { privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        publicKeyEncoding: { type: 'spki', format: 'pem' },
      })

      http.get.mockResolvedValue({ data: { storageQuota: {} } })

      await new GoogleDriveStorageDriver({
        auth_mode: GoogleDriveAuthMode.SERVICE_ACCOUNT,
        service_account_json: JSON.stringify({ client_email: 'sa@project.iam.gserviceaccount.com', private_key: privateKey }),
        shared_drive_id: 'drive-1',
      }).getUsage()

      const body = http.post.mock.calls[0][1]
      expect(body).toContain('grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer')
      // JWT phải có đủ 3 phần header.payload.signature
      const assertion = decodeURIComponent(body.split('assertion=')[1])
      expect(assertion.split('.')).toHaveLength(3)

      const claims = JSON.parse(Buffer.from(assertion.split('.')[1], 'base64').toString())
      expect(claims.iss).toBe('sa@project.iam.gserviceaccount.com')
      expect(claims.scope).toBe('https://www.googleapis.com/auth/drive')
      // Không impersonate thì không được có claim sub
      expect(claims.sub).toBeUndefined()
    })

    it('thêm claim sub khi cấu hình impersonate', async () => {
      const { privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        publicKeyEncoding: { type: 'spki', format: 'pem' },
      })
      http.get.mockResolvedValue({ data: { storageQuota: {} } })

      await new GoogleDriveStorageDriver({
        auth_mode: GoogleDriveAuthMode.SERVICE_ACCOUNT,
        service_account_json: JSON.stringify({ client_email: 'sa@x.iam.gserviceaccount.com', private_key: privateKey }),
        impersonate_subject: 'admin@truong.edu.vn',
      }).getUsage()

      const assertion = decodeURIComponent(http.post.mock.calls[0][1].split('assertion=')[1])
      expect(JSON.parse(Buffer.from(assertion.split('.')[1], 'base64').toString()).sub).toBe('admin@truong.edu.vn')
    })

    it('báo lỗi rõ khi service account JSON thiếu trường', async () => {
      const result = await new GoogleDriveStorageDriver({
        auth_mode: GoogleDriveAuthMode.SERVICE_ACCOUNT,
        service_account_json: '{}',
        shared_drive_id: 'd',
      }).test()

      expect(result.ok).toBe(false)
      expect(result.message).toContain('client_email')
    })
  })

  describe('test()', () => {
    it('chặn ngay trường hợp service account ghi vào My Drive, vì chắc chắn sẽ lỗi', async () => {
      const { privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        publicKeyEncoding: { type: 'spki', format: 'pem' },
      })
      http.get.mockResolvedValue({
        data: { user: { emailAddress: 'sa@x.iam.gserviceaccount.com' }, storageQuota: { limit: '0', usage: '0' } },
      })

      const result = await new GoogleDriveStorageDriver({
        auth_mode: GoogleDriveAuthMode.SERVICE_ACCOUNT,
        service_account_json: JSON.stringify({ client_email: 'sa@x.iam.gserviceaccount.com', private_key: privateKey }),
      }).test()

      expect(result.ok).toBe(false)
      expect(result.message).toContain('Shared Drive')
    })

    it('báo thành công và trả email tài khoản với chế độ OAuth', async () => {
      http.get.mockResolvedValue({
        data: { user: { emailAddress: 'nguoi.dung@gmail.com' }, storageQuota: { limit: '16106127360', usage: '1000' } },
      })

      const result = await new GoogleDriveStorageDriver(oauthConfig).test()

      expect(result.ok).toBe(true)
      expect(result.details).toMatchObject({ account: 'nguoi.dung@gmail.com', limit_bytes: 16106127360 })
    })

    const errorCases: [any, RegExp][] = [
      [{ response: { data: { error: 'invalid_grant' } } }, /Refresh token không còn hiệu lực/],
      [{ response: { data: { error: 'invalid_client' } } }, /Client ID hoặc Client Secret/],
      [{ response: { status: 403, data: { error: { errors: [{ reason: 'storageQuotaExceeded' }] } } } }, /Hết dung lượng Drive/],
      [{ response: { status: 404, data: {} } }, /Không tìm thấy folder hoặc Shared Drive/],
    ]

    it.each(errorCases)('dịch lỗi của Google thành thông báo dễ hiểu', async (error, expected) => {
      http.post.mockRejectedValue(error)
      http.get.mockRejectedValue(error)

      const result = await new GoogleDriveStorageDriver(oauthConfig).test()

      expect(result.ok).toBe(false)
      expect(result.message).toMatch(expected)
    })
  })

  describe('getUsage()', () => {
    it('tách riêng dung lượng Drive với tổng dung lượng cả tài khoản Google', async () => {
      // usage gồm cả Gmail và Photos; usageInDrive chỉ phần Drive
      http.get.mockResolvedValue({
        data: { storageQuota: { usage: '5000000', usageInDrive: '2000000', limit: '16106127360' } },
      })

      const usage = await new GoogleDriveStorageDriver(oauthConfig).getUsage()

      expect(usage).toEqual({
        usedBytes: 5000000,
        ownBytes: 2000000,
        totalBytes: 16106127360,
        objectCount: null,
        source: 'provider_api',
      })
    })

    it('để totalBytes null khi tài khoản không giới hạn dung lượng', async () => {
      // Google không trả field limit với tài khoản unlimited
      http.get.mockResolvedValue({ data: { storageQuota: { usage: '1000' } } })

      expect((await new GoogleDriveStorageDriver(oauthConfig).getUsage()).totalBytes).toBeNull()
    })
  })

  describe('upload()', () => {
    it('gửi multipart đúng định dạng và mở quyền xem công khai cho file', async () => {
      http.get.mockResolvedValue({ data: { files: [] } })
      http.post
        .mockResolvedValueOnce({ data: { access_token: 'access-token', expires_in: 3600 } })
        .mockResolvedValueOnce({ data: { id: 'file-id-1', size: '13', md5Checksum: 'md5-1' } })
        .mockResolvedValueOnce({ data: {} })

      const result = await new GoogleDriveStorageDriver(oauthConfig).upload(makeInput('anh.png'))

      const uploadCall = http.post.mock.calls[1]
      expect(uploadCall[0]).toBe('https://www.googleapis.com/upload/drive/v3/files')
      expect(uploadCall[2].headers['Content-Type']).toMatch(/^multipart\/related; boundary=hvm-/)
      expect(uploadCall[2].params).toMatchObject({ uploadType: 'multipart', supportsAllDrives: true })

      // objectKey là file id do Drive cấp, không phải tên file
      expect(result).toMatchObject({ objectKey: 'file-id-1', size: 13, checksum: 'md5-1' })
      expect(result.url).toBe('https://drive.google.com/uc?export=view&id=file-id-1')

      // Lệnh cuối là mở quyền đọc công khai
      expect(http.post.mock.calls[2][1]).toEqual({ role: 'reader', type: 'anyone' })
    })

    it('vẫn coi là upload thành công khi tổ chức chặn chia sẻ công khai', async () => {
      http.get.mockResolvedValue({ data: { files: [] } })
      http.post
        .mockResolvedValueOnce({ data: { access_token: 'access-token', expires_in: 3600 } })
        .mockResolvedValueOnce({ data: { id: 'file-id-1', size: '13' } })
        .mockRejectedValueOnce({ response: { status: 403 } })

      await expect(new GoogleDriveStorageDriver(oauthConfig).upload(makeInput('anh.png'))).resolves.toMatchObject({
        objectKey: 'file-id-1',
      })
    })

    it('tạo chuỗi thư mục trên Drive theo đường dẫn của key', async () => {
      // Không tìm thấy folder nào nên phải tạo lần lượt
      http.get.mockResolvedValue({ data: { files: [] } })
      http.post
        .mockResolvedValueOnce({ data: { access_token: 'access-token', expires_in: 3600 } })
        .mockResolvedValueOnce({ data: { id: 'folder-bai-viet' } })
        .mockResolvedValueOnce({ data: { id: 'folder-2026' } })
        .mockResolvedValueOnce({ data: { id: 'file-id' } })
        .mockResolvedValueOnce({ data: {} })

      await new GoogleDriveStorageDriver(oauthConfig).upload(makeInput('bai-viet/2026/anh.png'))

      expect(http.post.mock.calls[1][1]).toMatchObject({
        name: 'bai-viet',
        mimeType: 'application/vnd.google-apps.folder',
      })
      expect(http.post.mock.calls[2][1]).toMatchObject({ name: '2026', parents: ['folder-bai-viet'] })
    })
  })

  describe('list()', () => {
    it('tách thư mục ra khỏi file, và dùng tham số cho Shared Drive', async () => {
      http.get.mockResolvedValue({
        data: {
          files: [
            { id: 'f1', name: 'thu-muc', mimeType: 'application/vnd.google-apps.folder' },
            { id: 'f2', name: 'anh.png', mimeType: 'image/png', size: '100', md5Checksum: 'm1' },
          ],
        },
      })

      const result = await new GoogleDriveStorageDriver({ ...oauthConfig, shared_drive_id: 'drive-1' }).list('')

      expect(result.prefixes).toEqual(['thu-muc'])
      expect(result.objects).toHaveLength(1)
      expect(result.objects[0]).toMatchObject({ objectKey: 'f2', name: 'anh.png', size: 100 })

      const params = http.get.mock.calls.at(-1)[1].params
      expect(params).toMatchObject({ corpora: 'drive', driveId: 'drive-1', includeItemsFromAllDrives: true })
    })

    it('escape dấu nháy trong tên thư mục để không làm hỏng câu query', async () => {
      http.get.mockResolvedValue({ data: { files: [] } })

      await new GoogleDriveStorageDriver(oauthConfig).list("thu'muc")

      const query = http.get.mock.calls[0][1].params.q
      expect(query).toContain("name = 'thu\\'muc'")
    })
  })

  describe('delete()', () => {
    it('coi file đã mất là xoá thành công', async () => {
      http.delete.mockRejectedValue({ response: { status: 404 } })

      await expect(new GoogleDriveStorageDriver(oauthConfig).delete('file-id')).resolves.toBeUndefined()
    })

    it('vẫn báo lỗi với các lỗi khác', async () => {
      http.delete.mockRejectedValue({ response: { status: 500 } })

      await expect(new GoogleDriveStorageDriver(oauthConfig).delete('file-id')).rejects.toBeDefined()
    })
  })
})

describe('DropboxStorageDriver', () => {
  const config = { app_key: 'app-key', app_secret: 'app-secret', refresh_token: 'refresh', root_path: '/hvm' }

  beforeEach(() => {
    resetHttp()
    oauthTokenCache.clear()
    http.post.mockResolvedValue({ data: { access_token: 'access-token', expires_in: 14400 } })
  })

  it('dùng Basic auth với app key/secret khi đổi refresh token', async () => {
    http.post.mockResolvedValue({ data: { access_token: 'tk', expires_in: 14400, allocation: {} } })

    await new DropboxStorageDriver(config).getUsage()

    expect(http.post.mock.calls[0][2].auth).toEqual({ username: 'app-key', password: 'app-secret' })
  })

  describe('ghép đường dẫn', () => {
    it('gắn thư mục gốc vào trước key, và luôn có dấu / ở đầu', async () => {
      http.post.mockResolvedValueOnce({ data: { access_token: 'tk', expires_in: 14400 } }).mockResolvedValueOnce({ data: {} })

      await new DropboxStorageDriver(config).delete('bai-viet/anh.png')

      expect(http.post.mock.calls[1][1]).toEqual({ path: '/hvm/bai-viet/anh.png' })
    })

    it('thư mục gốc là chuỗi rỗng chứ không phải dấu /, theo yêu cầu của Dropbox', async () => {
      http.post.mockResolvedValueOnce({ data: { access_token: 'tk', expires_in: 14400 } }).mockResolvedValueOnce({ data: { entries: [] } })

      await new DropboxStorageDriver({ ...config, root_path: '' }).list('')

      expect(http.post.mock.calls[1][1].path).toBe('')
    })
  })

  describe('upload()', () => {
    it('upload một phát với file nhỏ, và escape ký tự ngoài ASCII trong header', async () => {
      http.post
        .mockResolvedValueOnce({ data: { access_token: 'tk', expires_in: 14400 } })
        .mockResolvedValueOnce({ data: { size: 13, content_hash: 'hash-1' } })
        .mockResolvedValueOnce({ data: { url: 'https://www.dropbox.com/s/abc/file?dl=0' } })

      const result = await new DropboxStorageDriver(config).upload(makeInput('tài liệu.pdf', 'application/pdf'))

      const header = http.post.mock.calls[1][2].headers['Dropbox-API-Arg']
      // Header HTTP chỉ nhận ASCII, tên file tiếng Việt phải thành \uXXXX
      expect(header).not.toMatch(/[^\x00-\x7f]/)
      expect(header).toContain('\\u')
      expect(JSON.parse(header.replace(/\\u([0-9a-f]{4})/g, (_m, code) => String.fromCharCode(parseInt(code, 16))))).toMatchObject({
        path: '/hvm/tài liệu.pdf',
        mode: 'overwrite',
      })

      // Link chia sẻ được đổi sang dạng tải thẳng nội dung
      expect(result.url).toBe('https://www.dropbox.com/s/abc/file?raw=1')
      expect(result).toMatchObject({ objectKey: 'tài liệu.pdf', size: 13, checksum: 'hash-1' })
    })

    it('lấy lại link cũ khi Dropbox báo link đã tồn tại', async () => {
      http.post
        .mockResolvedValueOnce({ data: { access_token: 'tk', expires_in: 14400 } })
        .mockResolvedValueOnce({ data: { size: 13 } })
        .mockRejectedValueOnce({ response: { data: { error_summary: 'shared_link_already_exists/..' } } })
        .mockResolvedValueOnce({ data: { links: [{ url: 'https://www.dropbox.com/s/cu/file?dl=0' }] } })

      const result = await new DropboxStorageDriver(config).upload(makeInput('a.png'))

      expect(result.url).toBe('https://www.dropbox.com/s/cu/file?raw=1')
    })

    it('upload vẫn thành công khi không tạo được link chia sẻ', async () => {
      http.post
        .mockResolvedValueOnce({ data: { access_token: 'tk', expires_in: 14400 } })
        .mockResolvedValueOnce({ data: { size: 13 } })
        .mockRejectedValueOnce({ response: { data: { error_summary: 'email_not_verified/..' } } })

      await expect(new DropboxStorageDriver(config).upload(makeInput('a.png'))).resolves.toMatchObject({ url: null })
    })

    it('chuyển sang upload session với file lớn hơn 150MB', async () => {
      http.post
        .mockResolvedValueOnce({ data: { access_token: 'tk', expires_in: 14400 } })
        .mockResolvedValueOnce({ data: { session_id: 'session-1' } })
        .mockResolvedValue({ data: { size: 1, url: 'https://www.dropbox.com/s/x/f?dl=0' } })

      const big = { ...makeInput('lon.zip', 'application/zip'), buffer: Buffer.alloc(160 * 1024 * 1024) }
      await new DropboxStorageDriver(config).upload(big)

      const urls = http.post.mock.calls.map(call => call[0])
      expect(urls).toContain('https://content.dropboxapi.com/2/files/upload_session/start')
      expect(urls).toContain('https://content.dropboxapi.com/2/files/upload_session/finish')
    })
  })

  describe('getUsage()', () => {
    it('đọc hạn mức của tài khoản cá nhân', async () => {
      http.post
        .mockResolvedValueOnce({ data: { access_token: 'tk', expires_in: 14400 } })
        .mockResolvedValueOnce({ data: { used: 1000, allocation: { '.tag': 'individual', allocated: 2000000000 } } })

      expect(await new DropboxStorageDriver(config).getUsage()).toEqual({
        usedBytes: 1000,
        totalBytes: 2000000000,
        objectCount: null,
        source: 'provider_api',
      })
    })

    it('đọc hạn mức của team', async () => {
      http.post.mockResolvedValueOnce({ data: { access_token: 'tk', expires_in: 14400 } }).mockResolvedValueOnce({
        data: { used: 1, allocation: { '.tag': 'team', allocated: 9000, used: 5000 } },
      })

      expect(await new DropboxStorageDriver(config).getUsage()).toMatchObject({ usedBytes: 5000, totalBytes: 9000 })
    })

    it('ưu tiên hạn mức riêng của user trong team nếu có', async () => {
      http.post.mockResolvedValueOnce({ data: { access_token: 'tk', expires_in: 14400 } }).mockResolvedValueOnce({
        data: {
          used: 1,
          allocation: {
            '.tag': 'team',
            allocated: 9000,
            used: 5000,
            user_within_team_space_allocated: 3000,
            user_within_team_space_used_cached: 1200,
          },
        },
      })

      expect(await new DropboxStorageDriver(config).getUsage()).toMatchObject({ usedBytes: 1200, totalBytes: 3000 })
    })
  })

  it('coi file đã mất là xoá thành công', async () => {
    http.post
      .mockResolvedValueOnce({ data: { access_token: 'tk', expires_in: 14400 } })
      .mockRejectedValueOnce({ response: { data: { error_summary: 'path_lookup/not_found/..' } } })

    await expect(new DropboxStorageDriver(config).delete('a.png')).resolves.toBeUndefined()
  })

  it('coi thư mục đã tồn tại là tạo thành công', async () => {
    http.post
      .mockResolvedValueOnce({ data: { access_token: 'tk', expires_in: 14400 } })
      .mockRejectedValueOnce({ response: { data: { error_summary: 'path/conflict/folder/..' } } })

    await expect(new DropboxStorageDriver(config).createFolder('anh')).resolves.toBeNull()
  })

  it('dịch lỗi refresh token hết hiệu lực', async () => {
    http.post.mockRejectedValue({ response: { data: { error: 'invalid_grant' } } })

    const result = await new DropboxStorageDriver(config).test()

    expect(result.ok).toBe(false)
    expect(result.message).toMatch(/Refresh token không còn hiệu lực/)
  })
})

describe('OneDriveStorageDriver', () => {
  const config = {
    tenant_id: 'common',
    client_id: 'client-id',
    client_secret: 'client-secret',
    refresh_token: 'refresh',
    root_path: 'hvm',
  }

  beforeEach(() => {
    resetHttp()
    oauthTokenCache.clear()
    http.post.mockResolvedValue({ data: { access_token: 'access-token', expires_in: 3600 } })
  })

  it('chặn ngay chế độ app-only mà thiếu Drive ID, vì Graph không có /me cho app-only', async () => {
    const result = await new OneDriveStorageDriver({ ...config, refresh_token: undefined }).test()

    expect(result.ok).toBe(false)
    expect(result.message).toContain('Drive ID')
  })

  it('dùng refresh_token grant khi có refresh token', async () => {
    http.get.mockResolvedValue({ data: { id: 'drive-1', quota: { total: 1000, used: 100, state: 'normal' } } })

    await new OneDriveStorageDriver(config).test()

    const body = http.post.mock.calls[0][1]
    expect(body).toContain('grant_type=refresh_token')
    expect(body).toContain('offline_access+Files.ReadWrite.All')
  })

  it('dùng client_credentials grant ở chế độ app-only', async () => {
    http.get.mockResolvedValue({ data: { id: 'drive-1', quota: {} } })

    await new OneDriveStorageDriver({ ...config, refresh_token: undefined, drive_id: 'drive-1' }).test()

    const body = http.post.mock.calls[0][1]
    expect(body).toContain('grant_type=client_credentials')
    expect(body).toContain('.default')
  })

  it('gọi /drives/{id} khi có Drive ID, và /me/drive khi không', async () => {
    http.get.mockResolvedValue({ data: { quota: {} } })

    await new OneDriveStorageDriver({ ...config, drive_id: 'drive-1' }).getUsage()
    expect(http.get.mock.calls[0][0]).toBe('https://graph.microsoft.com/v1.0/drives/drive-1')

    resetHttp()
    oauthTokenCache.clear()
    http.post.mockResolvedValue({ data: { access_token: 'tk', expires_in: 3600 } })
    http.get.mockResolvedValue({ data: { quota: {} } })

    await new OneDriveStorageDriver(config).getUsage()
    expect(http.get.mock.calls[0][0]).toBe('https://graph.microsoft.com/v1.0/me/drive')
  })

  it('đọc quota của drive', async () => {
    http.get.mockResolvedValue({ data: { quota: { total: 1099511627776, used: 256938 } } })

    expect(await new OneDriveStorageDriver(config).getUsage()).toEqual({
      usedBytes: 256938,
      totalBytes: 1099511627776,
      objectCount: null,
      source: 'provider_api',
    })
  })

  it('encode từng đoạn đường dẫn nhưng giữ dấu / phân cách', async () => {
    http.put.mockResolvedValue({ data: { id: 'item-1', size: 13 } })
    http.post
      .mockResolvedValueOnce({ data: { access_token: 'tk', expires_in: 3600 } })
      .mockResolvedValueOnce({ data: { link: { webUrl: 'https://1drv.ms/abc' } } })

    await new OneDriveStorageDriver(config).upload(makeInput('thu muc/tài liệu.pdf', 'application/pdf'))

    expect(http.put.mock.calls[0][0]).toBe('https://graph.microsoft.com/v1.0/me/drive/root:/hvm/thu%20muc/t%C3%A0i%20li%E1%BB%87u.pdf:/content')
  })

  it('chuyển sang upload session với file lớn hơn 4MB, và không gửi Authorization trong các chunk', async () => {
    http.post
      .mockResolvedValueOnce({ data: { access_token: 'tk', expires_in: 3600 } })
      .mockResolvedValueOnce({ data: { uploadUrl: 'https://upload.test/session-1' } })
      .mockResolvedValue({ data: { link: { webUrl: 'https://1drv.ms/x' } } })
    http.put.mockResolvedValue({ data: { id: 'item-1', size: 1 } })

    const big = { ...makeInput('lon.zip', 'application/zip'), buffer: Buffer.alloc(12 * 1024 * 1024) }
    await new OneDriveStorageDriver(config).upload(big)

    const chunkCalls = http.put.mock.calls.filter(call => call[0] === 'https://upload.test/session-1')
    expect(chunkCalls.length).toBeGreaterThan(1)
    // URL upload session đã ký sẵn, gửi kèm Authorization sẽ bị Microsoft từ chối
    expect(chunkCalls[0][2].headers.Authorization).toBeUndefined()
    expect(chunkCalls[0][2].headers['Content-Range']).toMatch(/^bytes 0-\d+\/12582912$/)
  })

  it('trả rỗng thay vì lỗi khi liệt kê thư mục không tồn tại', async () => {
    http.get.mockRejectedValue({ response: { status: 404 } })

    expect(await new OneDriveStorageDriver(config).list('khong-co')).toEqual({
      objects: [],
      prefixes: [],
      cursor: null,
    })
  })

  const errorCases: [any, RegExp][] = [
    [{ response: { data: { error: 'invalid_grant' } } }, /Refresh token không còn hiệu lực/],
    [{ response: { data: { error: { code: 'quotaLimitReached' } } } }, /hết dung lượng/],
    [{ response: { status: 404, data: { error: { code: 'itemNotFound' } } } }, /Không tìm thấy drive/],
    [{ response: { status: 403, data: {} } }, /Files.ReadWrite.All/],
  ]

  it.each(errorCases)('dịch lỗi của Graph thành thông báo dễ hiểu', async (error, expected) => {
    http.post.mockRejectedValue(error)
    http.get.mockRejectedValue(error)

    const result = await new OneDriveStorageDriver(config).test()

    expect(result.ok).toBe(false)
    expect(result.message).toMatch(expected)
  })
})

describe('AzureBlobStorageDriver', () => {
  const config = { account_name: 'mystorage', container: 'hvm', sas_token: 'sv=2024&sig=abc' }

  beforeEach(() => resetHttp())

  it('bỏ dấu ? ở đầu SAS token người dùng dán vào', async () => {
    http.get.mockResolvedValue({ data: '<EnumerationResults></EnumerationResults>' })

    await new AzureBlobStorageDriver({ ...config, sas_token: '?sv=2024&sig=abc' }).test()

    expect(http.get.mock.calls[0][0]).toContain('?sv=2024&sig=abc&restype=container')
  })

  it('upload dùng PUT với header x-ms-blob-type', async () => {
    http.put.mockResolvedValue({ headers: { etag: '"etag-1"' } })

    const result = await new AzureBlobStorageDriver(config, 'https://cdn.test').upload(makeInput('anh.png'))

    expect(http.put.mock.calls[0][2].headers['x-ms-blob-type']).toBe('BlockBlob')
    expect(result).toMatchObject({ objectKey: 'anh.png', url: 'https://cdn.test/anh.png', checksum: 'etag-1' })
  })

  it('parse XML của List Blobs thành danh sách file và thư mục', async () => {
    http.get.mockResolvedValue({
      data: `<EnumerationResults>
        <Blobs>
          <Blob><Name>bai-viet/anh.png</Name><Properties><Content-Length>1000</Content-Length><Content-Type>image/png</Content-Type><Etag>"e1"</Etag><Last-Modified>Mon, 05 Oct 2026 10:00:00 GMT</Last-Modified></Properties></Blob>
          <BlobPrefix><Name>bai-viet/2026/</Name></BlobPrefix>
        </Blobs>
        <NextMarker></NextMarker>
      </EnumerationResults>`,
    })

    const result = await new AzureBlobStorageDriver(config).list('bai-viet')

    expect(result.objects[0]).toMatchObject({
      objectKey: 'bai-viet/anh.png',
      name: 'anh.png',
      size: 1000,
      mimeType: 'image/png',
      checksum: 'e1',
    })
    expect(result.prefixes).toEqual(['bai-viet/2026'])
  })

  it('cộng dồn dung lượng vì Azure không có API quota cho blob', async () => {
    http.get
      .mockResolvedValueOnce({
        data: `<EnumerationResults><Blobs>
          <Blob><Name>a</Name><Properties><Content-Length>100</Content-Length></Properties></Blob>
          <Blob><Name>b</Name><Properties><Content-Length>200</Content-Length></Properties></Blob>
        </Blobs><NextMarker>m2</NextMarker></EnumerationResults>`,
      })
      .mockResolvedValueOnce({
        data: `<EnumerationResults><Blobs>
          <Blob><Name>c</Name><Properties><Content-Length>700</Content-Length></Properties></Blob>
        </Blobs><NextMarker></NextMarker></EnumerationResults>`,
      })

    expect(await new AzureBlobStorageDriver(config).getUsage()).toEqual({
      usedBytes: 1000,
      totalBytes: null,
      objectCount: 3,
      source: 'listing',
    })
  })

  it('chờ copy xong mới xoá bản cũ khi di chuyển', async () => {
    http.put.mockResolvedValue({})
    http.head.mockResolvedValue({ headers: { 'x-ms-copy-status': 'success' } })
    http.delete.mockResolvedValue({})

    const result = await new AzureBlobStorageDriver(config).move('cu.png', 'moi.png')

    expect(http.put.mock.calls[0][2].headers['x-ms-copy-source']).toContain('cu.png')
    expect(http.head).toHaveBeenCalled()
    expect(http.delete).toHaveBeenCalled()
    expect(result).toBe('moi.png')
  })

  it('không xoá bản cũ khi copy thất bại', async () => {
    http.put.mockResolvedValue({})
    http.head.mockResolvedValue({ headers: { 'x-ms-copy-status': 'failed', 'x-ms-copy-status-description': 'loi' } })

    await expect(new AzureBlobStorageDriver(config).move('cu.png', 'moi.png')).rejects.toThrow(/Azure copy thất bại/)
    expect(http.delete).not.toHaveBeenCalled()
  })

  const errorCases: [any, RegExp][] = [
    [{ response: { status: 403, data: '<Error><Code>AuthenticationFailed</Code></Error>' } }, /SAS token không hợp lệ/],
    [{ response: { status: 404, data: '<Error><Code>ContainerNotFound</Code></Error>' } }, /Không tìm thấy container "hvm"/],
    [{ code: 'ENOTFOUND' }, /Storage account "mystorage" không tồn tại/],
  ]

  it.each(errorCases)('dịch lỗi của Azure thành thông báo dễ hiểu', async (error, expected) => {
    http.get.mockRejectedValue(error)

    const result = await new AzureBlobStorageDriver(config).test()

    expect(result.ok).toBe(false)
    expect(result.message).toMatch(expected)
  })
})

describe('BunnyStorageDriver', () => {
  const config = { storage_zone: 'hvm-zone', access_key: 'zone-password', hostname: 'sg.storage.bunnycdn.com' }

  beforeEach(() => resetHttp())

  it('gửi AccessKey của storage zone trong header', async () => {
    http.get.mockResolvedValue({ data: [] })

    await new BunnyStorageDriver(config).list('')

    expect(http.get.mock.calls[0][1].headers).toEqual({ AccessKey: 'zone-password' })
  })

  it('ghép URL theo hostname của region', async () => {
    http.put.mockResolvedValue({})

    await new BunnyStorageDriver(config, 'https://hvm.b-cdn.net').upload(makeInput('anh.png'))

    expect(http.put.mock.calls[0][0]).toBe('https://sg.storage.bunnycdn.com/hvm-zone/anh.png')
  })

  it('dùng hostname mặc định khi không cấu hình', async () => {
    http.put.mockResolvedValue({})

    await new BunnyStorageDriver({ ...config, hostname: undefined }).upload(makeInput('anh.png'))

    expect(http.put.mock.calls[0][0]).toBe('https://storage.bunnycdn.com/hvm-zone/anh.png')
  })

  it('ghép thư mục gốc và encode tên file', async () => {
    http.put.mockResolvedValue({})

    await new BunnyStorageDriver({ ...config, root_path: 'hvm' }).upload(makeInput('tài liệu.pdf', 'application/pdf'))

    expect(http.put.mock.calls[0][0]).toBe('https://sg.storage.bunnycdn.com/hvm-zone/hvm/t%C3%A0i%20li%E1%BB%87u.pdf')
  })

  it('đọc dung lượng từ Core API khi có account key', async () => {
    http.get.mockResolvedValue({ data: [{ Name: 'hvm-zone', StorageUsed: 123456, FilesStored: 78 }] })

    const usage = await new BunnyStorageDriver({ ...config, account_api_key: 'acc-key' }).getUsage()

    expect(usage).toEqual({ usedBytes: 123456, totalBytes: null, objectCount: 78, source: 'provider_api' })
    expect(http.get.mock.calls[0][0]).toBe('https://api.bunny.net/storagezone')
    expect(http.get.mock.calls[0][1].headers).toEqual({ AccessKey: 'acc-key' })
  })

  it('cộng dồn đệ quy khi không có account key', async () => {
    http.get
      .mockResolvedValueOnce({
        data: [
          { ObjectName: 'a.png', Length: 100, IsDirectory: false },
          { ObjectName: 'con', IsDirectory: true },
        ],
      })
      .mockResolvedValueOnce({ data: [{ ObjectName: 'b.png', Length: 400, IsDirectory: false }] })

    expect(await new BunnyStorageDriver(config).getUsage()).toEqual({
      usedBytes: 500,
      totalBytes: null,
      objectCount: 2,
      source: 'listing',
    })
  })

  it('rơi về cộng dồn khi account key sai', async () => {
    http.get
      .mockRejectedValueOnce({ response: { status: 401 } })
      .mockResolvedValueOnce({ data: [{ ObjectName: 'a.png', Length: 50, IsDirectory: false }] })

    expect(await new BunnyStorageDriver({ ...config, account_api_key: 'sai' }).getUsage()).toMatchObject({
      usedBytes: 50,
      source: 'listing',
    })
  })

  it('đổi tên bằng cách tải về rồi đẩy lên, vì Edge Storage không có API copy', async () => {
    http.get.mockResolvedValue({ data: new Uint8Array(Buffer.from('noi dung')) })
    http.put.mockResolvedValue({})
    http.delete.mockResolvedValue({})

    const result = await new BunnyStorageDriver(config).move('cu.png', 'moi.png')

    expect(http.get).toHaveBeenCalled()
    expect(http.put.mock.calls[0][0]).toContain('moi.png')
    expect(http.delete.mock.calls[0][0]).toContain('cu.png')
    expect(result).toBe('moi.png')
  })

  it('trả null cho URL công khai khi chưa cấu hình pull zone', () => {
    expect(new BunnyStorageDriver(config).getPublicUrl('a.png')).toBeNull()
  })

  const errorCases: [any, RegExp][] = [
    [{ response: { status: 401 } }, /AccessKey của storage zone không đúng/],
    [{ response: { status: 404 } }, /Không tìm thấy storage zone "hvm-zone"/],
    [{ code: 'ENOTFOUND' }, /Hostname không phân giải được/],
  ]

  it.each(errorCases)('dịch lỗi của Bunny thành thông báo dễ hiểu', async (error, expected) => {
    http.get.mockRejectedValue(error)

    const result = await new BunnyStorageDriver(config).test()

    expect(result.ok).toBe(false)
    expect(result.message).toMatch(expected)
  })
})

describe('oauthTokenCache', () => {
  beforeEach(() => oauthTokenCache.clear())

  it('trả lại token đã cache, không gọi lại hàm lấy token', async () => {
    const fetcher = jest.fn(async () => ({ accessToken: 'tk-1', expiresInSeconds: 3600 }))

    expect(await oauthTokenCache.get(['a', 'b'], fetcher)).toBe('tk-1')
    expect(await oauthTokenCache.get(['a', 'b'], fetcher)).toBe('tk-1')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('cache riêng cho từng bộ credential', async () => {
    await oauthTokenCache.get(['a'], async () => ({ accessToken: 'tk-a', expiresInSeconds: 3600 }))

    expect(await oauthTokenCache.get(['b'], async () => ({ accessToken: 'tk-b', expiresInSeconds: 3600 }))).toBe('tk-b')
  })

  it('lấy token mới khi token cũ đã hết hạn', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce({ accessToken: 'tk-1', expiresInSeconds: 0 })
      .mockResolvedValueOnce({ accessToken: 'tk-2', expiresInSeconds: 3600 })

    await oauthTokenCache.get(['a'], fetcher)
    // expiresInSeconds = 0 bị kẹp về tối thiểu 30s, nên phải giả lập thời gian trôi
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 60_000)

    expect(await oauthTokenCache.get(['a'], fetcher)).toBe('tk-2')
    ;(Date.now as jest.Mock).mockRestore()
  })

  it('invalidate buộc lấy lại token mới', async () => {
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce({ accessToken: 'tk-1', expiresInSeconds: 3600 })
      .mockResolvedValueOnce({ accessToken: 'tk-2', expiresInSeconds: 3600 })

    await oauthTokenCache.get(['a'], fetcher)
    oauthTokenCache.invalidate(['a'])

    expect(await oauthTokenCache.get(['a'], fetcher)).toBe('tk-2')
  })

  it('coi undefined và chuỗi rỗng là như nhau khi tạo khoá cache', async () => {
    await oauthTokenCache.get(['a', undefined], async () => ({ accessToken: 'tk-1', expiresInSeconds: 3600 }))

    const fetcher = jest.fn(async () => ({ accessToken: 'tk-2', expiresInSeconds: 3600 }))
    expect(await oauthTokenCache.get(['a', ''], fetcher)).toBe('tk-1')
    expect(fetcher).not.toHaveBeenCalled()
  })
})

describe('axios được dùng đúng cách', () => {
  it('mỗi driver REST tạo instance riêng với timeout, không dùng axios global', () => {
    resetHttp()
    ;(axios.create as jest.Mock).mockClear()

    new GoogleDriveStorageDriver({ auth_mode: GoogleDriveAuthMode.OAUTH })
    new DropboxStorageDriver({})
    new OneDriveStorageDriver({})
    new AzureBlobStorageDriver({ account_name: 'a', container: 'c', sas_token: 't' })
    new BunnyStorageDriver({ storage_zone: 'z', access_key: 'k' })

    expect((axios.create as jest.Mock).mock.calls).toHaveLength(5)
    for (const [options] of (axios.create as jest.Mock).mock.calls) {
      expect(options.timeout).toBeGreaterThan(0)
    }
  })
})
