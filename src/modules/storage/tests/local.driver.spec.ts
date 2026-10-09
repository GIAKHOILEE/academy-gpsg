import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { LocalStorageDriver } from '../drivers/local.driver'
import { StorageUploadInput } from '../drivers/storage-driver.interface'

/**
 * Test driver Local chạy trên filesystem thật trong thư mục tạm, không mock fs.
 * Lý do: lỗi hay gặp của driver này là quyền ghi, tạo thư mục trung gian và
 * chặn path traversal - mock fs sẽ che hết đúng những thứ đó.
 */
describe('LocalStorageDriver', () => {
  let root: string
  let driver: LocalStorageDriver

  const makeInput = (objectKey: string, content = 'noi dung file'): StorageUploadInput => ({
    buffer: Buffer.from(content),
    originalName: objectKey.split('/').pop(),
    mimeType: 'text/plain',
    objectKey,
  })

  beforeEach(async () => {
    root = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'hvm-local-driver-'))
    driver = new LocalStorageDriver({ root_path: root }, 'https://file.example.com')
  })

  afterEach(async () => {
    await fs.promises.rm(root, { recursive: true, force: true })
  })

  describe('test()', () => {
    it('báo thành công khi thư mục ghi được, và kèm dung lượng còn trống', async () => {
      const result = await driver.test()

      expect(result.ok).toBe(true)
      expect(result.details.root_path).toBe(root)
      expect(typeof result.details.free_bytes).toBe('number')
    })

    it('tự tạo thư mục nếu chưa tồn tại', async () => {
      const nested = path.join(root, 'chua', 'ton', 'tai')
      const result = await new LocalStorageDriver({ root_path: nested }, 'https://x').test()

      expect(result.ok).toBe(true)
      expect(fs.existsSync(nested)).toBe(true)
    })

    it('không để lại file tạm sau khi kiểm tra quyền ghi', async () => {
      await driver.test()

      const entries = await fs.promises.readdir(root)
      expect(entries.filter(name => name.startsWith('.write-probe'))).toEqual([])
    })
  })

  describe('upload / download / delete', () => {
    it('ghi file và trả về URL công khai đúng', async () => {
      const result = await driver.upload(makeInput('anh.png'))

      expect(result.objectKey).toBe('anh.png')
      expect(result.url).toBe('https://file.example.com/anh.png')
      expect(result.size).toBe(Buffer.from('noi dung file').length)
      expect(fs.existsSync(path.join(root, 'anh.png'))).toBe(true)
    })

    it('tự tạo thư mục trung gian khi key có nhiều cấp', async () => {
      await driver.upload(makeInput('hvm/2026/pdf/tai-lieu.pdf'))

      expect(fs.existsSync(path.join(root, 'hvm', '2026', 'pdf', 'tai-lieu.pdf'))).toBe(true)
    })

    it('encode tên file có dấu cách và tiếng Việt trong URL', async () => {
      const result = await driver.upload(makeInput('thu muc/tài liệu.pdf'))

      // Dấu / phân cách phải giữ nguyên, phần tên thì được encode
      expect(result.url).toBe('https://file.example.com/thu%20muc/t%C3%A0i%20li%E1%BB%87u.pdf')
    })

    it('download trả lại đúng nội dung đã ghi', async () => {
      await driver.upload(makeInput('note.txt', 'xin chào'))

      expect((await driver.download('note.txt')).toString()).toBe('xin chào')
    })

    it('xoá file thành công', async () => {
      await driver.upload(makeInput('tam.txt'))
      await driver.delete('tam.txt')

      expect(fs.existsSync(path.join(root, 'tam.txt'))).toBe(false)
    })

    it('xoá file không tồn tại không báo lỗi, vì kết quả cuối vẫn là file đã mất', async () => {
      await expect(driver.delete('chua-bao-gio-ton-tai.txt')).resolves.toBeUndefined()
    })
  })

  describe('chặn path traversal', () => {
    // Không có bước này thì objectKey do client gửi có thể ghi/xoá ra ngoài thư mục
    const maliciousKeys = ['../ngoai-pham-vi.txt', '../../etc/passwd', 'thu-muc/../../vuot-ra.txt']

    it.each(maliciousKeys)('từ chối upload với key "%s"', async key => {
      await expect(driver.upload(makeInput(key))).rejects.toThrow(/Đường dẫn không hợp lệ/)
    })

    it.each(maliciousKeys)('từ chối xoá với key "%s"', async key => {
      await expect(driver.delete(key)).rejects.toThrow(/Đường dẫn không hợp lệ/)
    })

    it('vẫn cho phép key đi xuống rồi quay lại mà kết quả nằm trong phạm vi', async () => {
      await expect(driver.upload(makeInput('a/b/../c.txt'))).resolves.toBeDefined()
      expect(fs.existsSync(path.join(root, 'a', 'c.txt'))).toBe(true)
    })
  })

  describe('list()', () => {
    beforeEach(async () => {
      await driver.upload(makeInput('goc-1.txt'))
      await driver.upload(makeInput('goc-2.txt'))
      await driver.upload(makeInput('con/trong-con.txt'))
      await driver.upload(makeInput('con/sau/sau-hon.txt'))
    })

    it('liệt kê file ở thư mục gốc và tách riêng thư mục con', async () => {
      const result = await driver.list('')

      expect(result.objects.map(object => object.objectKey).sort()).toEqual(['goc-1.txt', 'goc-2.txt'])
      expect(result.prefixes).toEqual(['con'])
      expect(result.cursor).toBeNull()
    })

    it('liệt kê trong thư mục con với key đầy đủ đường dẫn', async () => {
      const result = await driver.list('con')

      expect(result.objects.map(object => object.objectKey)).toEqual(['con/trong-con.txt'])
      expect(result.prefixes).toEqual(['con/sau'])
    })

    it('trả rỗng thay vì lỗi khi thư mục không tồn tại', async () => {
      const result = await driver.list('khong-co-thu-muc-nay')

      expect(result).toEqual({ objects: [], prefixes: [], cursor: null })
    })

    it('mỗi object có size và thời điểm sửa đổi', async () => {
      const result = await driver.list('')
      const file = result.objects[0]

      expect(file.size).toBeGreaterThan(0)
      // So theo timestamp chứ không dùng toBeInstanceOf(Date): Date do fs trả về
      // thuộc realm khác với realm của jest nên phép so sánh constructor sẽ sai
      expect(file.modifiedAt.getTime()).toBeGreaterThan(0)
      expect(file.url).toContain('https://file.example.com/')
    })
  })

  describe('getUsage()', () => {
    it('trả dung lượng của cả phân vùng, và dung lượng riêng của thư mục', async () => {
      await driver.upload(makeInput('a.txt', 'x'.repeat(1000)))
      await driver.upload(makeInput('sau/b.txt', 'y'.repeat(500)))

      const usage = await driver.getUsage()

      // usedBytes là mức dùng của cả ổ đĩa - con số quyết định còn ghi được hay không
      expect(usage.usedBytes).toBeGreaterThan(0)
      expect(usage.totalBytes).toBeGreaterThan(usage.usedBytes)
      // ownBytes là phần riêng của thư mục ta quản lý, phải đếm đủ cả file trong thư mục con
      expect(usage.ownBytes).toBe(1500)
      expect(usage.objectCount).toBe(2)
      expect(usage.source).toBe('provider_api')
    })

    it('thư mục rỗng cho ownBytes bằng 0', async () => {
      const usage = await driver.getUsage()

      expect(usage.ownBytes).toBe(0)
      expect(usage.objectCount).toBe(0)
    })
  })

  describe('thư mục', () => {
    it('tạo được thư mục rỗng', async () => {
      await driver.createFolder('thu-muc-moi/con')

      expect(fs.existsSync(path.join(root, 'thu-muc-moi', 'con'))).toBe(true)
    })

    it('xoá thư mục kèm toàn bộ nội dung bên trong', async () => {
      await driver.upload(makeInput('xoa-di/a.txt'))
      await driver.upload(makeInput('xoa-di/sau/b.txt'))

      await driver.deleteFolder('xoa-di')

      expect(fs.existsSync(path.join(root, 'xoa-di'))).toBe(false)
    })

    it('xoá thư mục không tồn tại không báo lỗi', async () => {
      await expect(driver.deleteFolder('khong-ton-tai')).resolves.toBeUndefined()
    })
  })

  describe('move()', () => {
    it('đổi tên file trong cùng thư mục', async () => {
      await driver.upload(makeInput('ten-cu.txt', 'giu-nguyen'))

      const newKey = await driver.move('ten-cu.txt', 'ten-moi.txt')

      expect(newKey).toBe('ten-moi.txt')
      expect(fs.existsSync(path.join(root, 'ten-cu.txt'))).toBe(false)
      expect((await driver.download('ten-moi.txt')).toString()).toBe('giu-nguyen')
    })

    it('chuyển file sang thư mục chưa tồn tại và tự tạo thư mục đó', async () => {
      await driver.upload(makeInput('o-goc.txt'))

      await driver.move('o-goc.txt', 'thu-muc-moi/o-goc.txt')

      expect(fs.existsSync(path.join(root, 'thu-muc-moi', 'o-goc.txt'))).toBe(true)
    })
  })

  describe('getPublicUrl() / getSignedUrl()', () => {
    it('trả null khi chưa cấu hình URL công khai', () => {
      expect(new LocalStorageDriver({ root_path: root }).getPublicUrl('a.png')).toBeNull()
    })

    it('lấy URL công khai từ config khi không truyền vào constructor', () => {
      const withConfigUrl = new LocalStorageDriver({ root_path: root, public_base_url: 'https://tu-config.vn/' })

      // Dấu / ở cuối phải bị cắt để không sinh link có //
      expect(withConfigUrl.getPublicUrl('a.png')).toBe('https://tu-config.vn/a.png')
    })

    it('không hỗ trợ link có hạn, trả null để tầng trên rơi về URL công khai', async () => {
      expect(await driver.getSignedUrl()).toBeNull()
    })
  })
})
