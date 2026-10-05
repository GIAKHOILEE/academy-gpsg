import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3'
import axios from 'axios'
import { S3StorageDriver } from '../drivers/s3.driver'

jest.mock('axios')

/**
 * Mock tầng gửi lệnh của SDK thay vì mock HTTP, để test được chính phần
 * driver tự viết: ghép key, lọc object, cộng dồn dung lượng, dịch lỗi.
 */
const sendMock = jest.fn()
jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3')
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({ send: (...args: unknown[]) => sendMock(...args) })),
  }
})

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(async () => 'https://presigned.test/link?X-Amz-Signature=abc'),
}))

const baseConfig = {
  preset: 'cloudflare_r2',
  bucket: 'hvm',
  account_id: 'acc123',
  access_key_id: 'key',
  secret_access_key: 'secret',
}

describe('S3StorageDriver', () => {
  let driver: S3StorageDriver

  beforeEach(() => {
    sendMock.mockReset()
    ;(axios.get as jest.Mock).mockReset()
    driver = new S3StorageDriver(baseConfig, 'https://pub-test.r2.dev')
  })

  describe('test()', () => {
    it('báo thành công khi HeadBucket chạy được', async () => {
      sendMock.mockResolvedValue({})

      const result = await driver.test()

      expect(result.ok).toBe(true)
      expect(sendMock.mock.calls[0][0]).toBeInstanceOf(HeadBucketCommand)
      expect(result.details).toMatchObject({
        bucket: 'hvm',
        endpoint: 'https://acc123.r2.cloudflarestorage.com',
        preset: 'cloudflare_r2',
      })
    })

    it('rơi về ListObjects với dịch vụ không cho HeadBucket', async () => {
      // Storj và vài bản MinIO chặn HeadBucket nhưng vẫn list được
      sendMock.mockRejectedValueOnce(Object.assign(new Error('not allowed'), { name: 'NotImplemented' }))
      sendMock.mockResolvedValueOnce({ Contents: [] })

      const result = await driver.test()

      expect(result.ok).toBe(true)
      expect(result.message).toContain('không hỗ trợ HeadBucket')
    })

    const errorCases: [Record<string, unknown>, RegExp][] = [
      [{ name: 'InvalidAccessKeyId' }, /Access Key ID không đúng/],
      [{ name: 'SignatureDoesNotMatch' }, /Secret Access Key không đúng/],
      [{ name: 'AccessDenied' }, /không có quyền/],
      [{ name: 'PermanentRedirect' }, /Region hoặc endpoint không khớp/],
      [{ name: 'NotFound' }, /Không tìm thấy bucket "hvm"/],
      [{ code: 'ENOTFOUND' }, /Không phân giải được tên miền/],
    ]

    it.each(errorCases)('dịch lỗi %j thành thông báo tiếng Việt dễ hiểu', async (errorProps, expected) => {
      const error = Object.assign(new Error('loi goc'), errorProps)
      sendMock.mockRejectedValue(error)

      const result = await driver.test()

      expect(result.ok).toBe(false)
      expect(result.message).toMatch(expected)
    })

    it('không throw ra ngoài dù lỗi lạ, luôn trả về kết quả', async () => {
      sendMock.mockRejectedValue(new Error('loi chua tung thay'))

      await expect(driver.test()).resolves.toMatchObject({ ok: false, message: 'loi chua tung thay' })
    })
  })

  describe('upload()', () => {
    it('gửi đúng bucket, key, nội dung và content type', async () => {
      sendMock.mockResolvedValue({ ETag: '"abc123"' })

      const result = await driver.upload({
        buffer: Buffer.from('noi dung'),
        originalName: 'anh.png',
        mimeType: 'image/png',
        objectKey: 'hvm/anh.png',
      })

      const command = sendMock.mock.calls[0][0]
      expect(command).toBeInstanceOf(PutObjectCommand)
      expect(command.input).toMatchObject({ Bucket: 'hvm', Key: 'hvm/anh.png', ContentType: 'image/png' })
      expect(result).toMatchObject({
        objectKey: 'hvm/anh.png',
        url: 'https://pub-test.r2.dev/hvm/anh.png',
        size: 8,
        // Dấu ngoặc kép của ETag phải bị bỏ để so sánh checksum về sau còn đúng
        checksum: 'abc123',
      })
    })

    it('không có ETag thì để trống checksum chứ không bịa', async () => {
      sendMock.mockResolvedValue({})

      const result = await driver.upload({
        buffer: Buffer.from('x'),
        originalName: 'a.txt',
        mimeType: 'text/plain',
        objectKey: 'a.txt',
      })

      expect(result.checksum).toBeUndefined()
    })
  })

  describe('getPublicUrl()', () => {
    it('ghép URL công khai và encode từng phần nhưng giữ dấu /', () => {
      expect(driver.getPublicUrl('thu muc/tài liệu.pdf')).toBe('https://pub-test.r2.dev/thu%20muc/t%C3%A0i%20li%E1%BB%87u.pdf')
    })

    it('cắt dấu / ở cuối domain để không sinh link có //', () => {
      const withSlash = new S3StorageDriver(baseConfig, 'https://pub-test.r2.dev/')

      expect(withSlash.getPublicUrl('a.png')).toBe('https://pub-test.r2.dev/a.png')
    })

    it('trả null khi chưa cấu hình URL công khai, để tầng trên biết phải dùng link có hạn', () => {
      expect(new S3StorageDriver(baseConfig).getPublicUrl('a.png')).toBeNull()
    })
  })

  describe('list()', () => {
    it('lọc bỏ object giả lập thư mục và tách riêng prefix con', async () => {
      sendMock.mockResolvedValue({
        Contents: [
          { Key: 'bai-viet/', Size: 0 },
          { Key: 'bai-viet/anh.png', Size: 1000, ETag: '"e1"', LastModified: new Date('2026-01-01') },
        ],
        CommonPrefixes: [{ Prefix: 'bai-viet/2026/' }],
        IsTruncated: false,
      })

      const result = await driver.list('bai-viet')

      // Key kết thúc bằng / là cách S3 biểu diễn thư mục rỗng, không phải file
      expect(result.objects).toHaveLength(1)
      expect(result.objects[0]).toMatchObject({
        objectKey: 'bai-viet/anh.png',
        name: 'anh.png',
        size: 1000,
        checksum: 'e1',
        url: 'https://pub-test.r2.dev/bai-viet/anh.png',
      })
      // Prefix trả về không có dấu / ở cuối để ghép path cho tiện
      expect(result.prefixes).toEqual(['bai-viet/2026'])
      expect(result.cursor).toBeNull()
    })

    it('thêm dấu / vào prefix để không lẫn sang thư mục có tên bắt đầu giống nhau', async () => {
      sendMock.mockResolvedValue({ Contents: [], IsTruncated: false })

      await driver.list('anh')

      // Không có dấu / thì prefix "anh" sẽ khớp cả thư mục "anh-cu"
      expect(sendMock.mock.calls[0][0].input.Prefix).toBe('anh/')
    })

    it('liệt kê thư mục gốc thì không gửi prefix', async () => {
      sendMock.mockResolvedValue({ Contents: [], IsTruncated: false })

      await driver.list('')

      expect(sendMock.mock.calls[0][0].input.Prefix).toBeUndefined()
    })

    it('trả con trỏ trang tiếp theo khi kết quả bị cắt', async () => {
      sendMock.mockResolvedValue({ Contents: [], IsTruncated: true, NextContinuationToken: 'token-2' })

      expect((await driver.list('')).cursor).toBe('token-2')
    })

    it('truyền con trỏ vào lệnh khi đọc trang tiếp theo', async () => {
      sendMock.mockResolvedValue({ Contents: [], IsTruncated: false })

      await driver.list('', 'token-2')

      expect(sendMock.mock.calls[0][0].input.ContinuationToken).toBe('token-2')
    })

    it('chịu được phản hồi rỗng từ dịch vụ', async () => {
      sendMock.mockResolvedValue({})

      expect(await driver.list('')).toEqual({ objects: [], prefixes: [], cursor: null })
    })
  })

  describe('getUsage()', () => {
    it('đọc dung lượng từ API Cloudflare khi có token R2', async () => {
      const withToken = new S3StorageDriver({ ...baseConfig, cf_api_token: 'cf-token' }, 'https://pub.test')
      ;(axios.get as jest.Mock).mockResolvedValue({
        data: { result: { payloadSize: 1000, metadataSize: 50, objectCount: 7 } },
      })

      const usage = await withToken.getUsage()

      expect(usage).toEqual({ usedBytes: 1050, totalBytes: null, objectCount: 7, source: 'provider_api' })
      expect((axios.get as jest.Mock).mock.calls[0][0]).toBe('https://api.cloudflare.com/client/v4/accounts/acc123/r2/buckets/hvm/usage')
      // Không cần liệt kê object khi đã có số từ API
      expect(sendMock).not.toHaveBeenCalled()
    })

    it('rơi về cộng dồn khi token Cloudflare sai, không làm hỏng luồng', async () => {
      const withToken = new S3StorageDriver({ ...baseConfig, cf_api_token: 'token-sai' }, 'https://pub.test')
      ;(axios.get as jest.Mock).mockRejectedValue(new Error('401'))
      sendMock.mockResolvedValue({ Contents: [{ Size: 200 }, { Size: 300 }], IsTruncated: false })

      const usage = await withToken.getUsage()

      expect(usage).toEqual({ usedBytes: 500, totalBytes: null, objectCount: 2, source: 'listing' })
    })

    it('cộng dồn toàn bộ object qua nhiều trang', async () => {
      sendMock
        .mockResolvedValueOnce({
          Contents: [{ Size: 100 }, { Size: 200 }],
          IsTruncated: true,
          NextContinuationToken: 'trang-2',
        })
        .mockResolvedValueOnce({ Contents: [{ Size: 700 }], IsTruncated: false })

      const usage = await driver.getUsage()

      expect(usage).toEqual({ usedBytes: 1000, totalBytes: null, objectCount: 3, source: 'listing' })
      expect(sendMock).toHaveBeenCalledTimes(2)
    })

    it('bucket rỗng cho 0 byte chứ không phải null', async () => {
      sendMock.mockResolvedValue({ Contents: [], IsTruncated: false })

      expect(await driver.getUsage()).toMatchObject({ usedBytes: 0, objectCount: 0 })
    })

    it('dịch vụ S3 thường không có tổng dung lượng, phải để null', async () => {
      sendMock.mockResolvedValue({ Contents: [{ Size: 1 }], IsTruncated: false })

      expect((await driver.getUsage()).totalBytes).toBeNull()
    })
  })

  describe('delete() và deleteFolder()', () => {
    it('xoá object theo key', async () => {
      sendMock.mockResolvedValue({})

      await driver.delete('bai-viet/anh.png')

      const command = sendMock.mock.calls[0][0]
      expect(command).toBeInstanceOf(DeleteObjectCommand)
      expect(command.input).toMatchObject({ Bucket: 'hvm', Key: 'bai-viet/anh.png' })
    })

    it('xoá thư mục bằng cách xoá theo lô mọi object có cùng prefix', async () => {
      sendMock.mockResolvedValueOnce({ Contents: [{ Key: 'xoa/a.png' }, { Key: 'xoa/b.png' }], IsTruncated: false }).mockResolvedValueOnce({})

      await driver.deleteFolder('xoa')

      expect(sendMock.mock.calls[0][0].input.Prefix).toBe('xoa/')
      const deleteCommand = sendMock.mock.calls[1][0]
      expect(deleteCommand).toBeInstanceOf(DeleteObjectsCommand)
      expect(deleteCommand.input.Delete.Objects).toEqual([{ Key: 'xoa/a.png' }, { Key: 'xoa/b.png' }])
    })

    it('thư mục rỗng thì không gửi lệnh xoá lô', async () => {
      sendMock.mockResolvedValue({ Contents: [], IsTruncated: false })

      await driver.deleteFolder('rong')

      expect(sendMock.mock.calls.every(call => !(call[0] instanceof DeleteObjectsCommand))).toBe(true)
    })

    it('xoá hết các trang khi thư mục có nhiều object', async () => {
      sendMock
        .mockResolvedValueOnce({ Contents: [{ Key: 'x/a' }], IsTruncated: true, NextContinuationToken: 't2' })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ Contents: [{ Key: 'x/b' }], IsTruncated: false })
        .mockResolvedValueOnce({})

      await driver.deleteFolder('x')

      expect(sendMock.mock.calls.filter(call => call[0] instanceof DeleteObjectsCommand)).toHaveLength(2)
    })
  })

  describe('move()', () => {
    it('copy sang key mới rồi xoá key cũ, vì S3 không có lệnh rename', async () => {
      sendMock.mockResolvedValue({})

      const result = await driver.move('cu.png', 'moi.png')

      const copyCommand = sendMock.mock.calls[0][0]
      expect(copyCommand).toBeInstanceOf(CopyObjectCommand)
      expect(copyCommand.input).toMatchObject({ Bucket: 'hvm', CopySource: 'hvm/cu.png', Key: 'moi.png' })
      expect(sendMock.mock.calls[1][0]).toBeInstanceOf(DeleteObjectCommand)
      expect(result).toBe('moi.png')
    })

    it('không xoá bản cũ nếu bước copy thất bại', async () => {
      sendMock.mockRejectedValueOnce(new Error('copy loi'))

      await expect(driver.move('cu.png', 'moi.png')).rejects.toThrow('copy loi')
      expect(sendMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('download() và getSignedUrl()', () => {
    it('tải nội dung object về dạng Buffer', async () => {
      sendMock.mockResolvedValue({
        Body: { transformToByteArray: async () => new Uint8Array(Buffer.from('noi dung file')) },
      })

      const buffer = await driver.download('a.txt')

      expect(sendMock.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand)
      expect(buffer.toString()).toBe('noi dung file')
    })

    it('tạo được link có hạn', async () => {
      expect(await driver.getSignedUrl('a.png', 600)).toContain('https://presigned.test/link')
    })
  })

  describe('createFolder()', () => {
    it('không làm gì vì S3 không có thư mục thật, thư mục chỉ là prefix của key', async () => {
      expect(await driver.createFolder()).toBeNull()
      expect(sendMock).not.toHaveBeenCalled()
    })
  })

  describe('capabilities', () => {
    it('khai báo đúng những gì S3 làm được', () => {
      expect(driver.capabilities).toEqual({
        quotaApi: false,
        listing: true,
        signedUrl: true,
        publicUrl: true,
        realFolders: false,
        move: true,
      })
    })
  })

  describe('ListObjectsV2Command được dùng đúng', () => {
    it('luôn dùng delimiter / khi liệt kê để tách thư mục', async () => {
      sendMock.mockResolvedValue({ Contents: [], IsTruncated: false })

      await driver.list('a')

      const command = sendMock.mock.calls[0][0]
      expect(command).toBeInstanceOf(ListObjectsV2Command)
      expect(command.input.Delimiter).toBe('/')
    })

    it('không dùng delimiter khi cộng dồn dung lượng, để quét phẳng cả bucket', async () => {
      sendMock.mockResolvedValue({ Contents: [], IsTruncated: false })

      await driver.getUsage()

      expect(sendMock.mock.calls[0][0].input.Delimiter).toBeUndefined()
    })
  })
})
