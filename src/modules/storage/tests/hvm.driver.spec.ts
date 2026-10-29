import { HvmStorageDriver, HvmStorageError } from '../drivers/hvm.driver'

/**
 * Mock global fetch (Node 22). Mỗi test xếp sẵn các phản hồi theo thứ tự gọi.
 */
const fetchMock = jest.fn()

const jsonResponse = (status: number, body: any) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
    arrayBuffer: async () => Buffer.from(JSON.stringify(body)).buffer,
  }) as unknown as Response

const bytesResponse = (status: number, buffer: Buffer) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => buffer.toString(),
    arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  }) as unknown as Response

const meDto = {
  app: { id: 'app1', name: 'Học viện', slug: 'academy' },
  rootFolder: { id: 'root1', title: 'academy' },
  allowedOrigins: ['https://hvmvsaigon.edu.vn'],
  defaultVisibility: 'PUBLIC',
  quota: { usedBytes: 1234, limitBytes: 50000 },
  deliveryOrigin: 'https://video.hvmvsaigon.edu.vn',
  appOrigin: 'https://app.hvmvsaigon.edu.vn',
}

const fileDto = (overrides: Partial<any> = {}) => ({
  type: 'file',
  id: 'file1',
  kind: 'IMAGE',
  title: 'anh.png',
  filename: 'anh.png',
  mimeType: 'image/png',
  sizeBytes: 13,
  status: 'READY',
  visibility: 'PUBLIC',
  folderId: 'root1',
  createdAt: '2026-10-25T00:00:00.000Z',
  urls: {
    file: 'https://video.hvmvsaigon.edu.vn/f/file1/anh.png',
    embed: null,
    watch: null,
    download: 'https://app.hvmvsaigon.edu.vn/d/file1',
    poster: null,
  },
  ...overrides,
})

const config = { base_url: 'https://app.hvmvsaigon.edu.vn/', api_key: 'hvmk_academy_test', folder_path: 'academy' }

/** Lấy (url, init) của lần gọi thứ n. */
const call = (n: number) => {
  const [url, init] = fetchMock.mock.calls[n]
  return { url: String(url), init: init as RequestInit }
}

describe('HvmStorageDriver', () => {
  let driver: HvmStorageDriver

  beforeEach(() => {
    fetchMock.mockReset()
    ;(global as any).fetch = fetchMock
    driver = new HvmStorageDriver(config, 'https://app.hvmvsaigon.edu.vn')
  })

  describe('upload', () => {
    it('gửi multipart có file, folderPath (folder_path + thư mục của objectKey) và title; objectKey trả về là id', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(201, fileDto()))

      const result = await driver.upload({
        buffer: Buffer.from('noi dung file'),
        originalName: 'ảnh đẹp.png',
        mimeType: 'image/png',
        objectKey: 'hvm/avatars/2026/anh-dep_123_abcd.png',
      })

      expect(result).toEqual({ objectKey: 'file1', url: 'https://video.hvmvsaigon.edu.vn/f/file1/anh.png', size: 13 })

      const { url, init } = call(0)
      expect(url).toBe('https://app.hvmvsaigon.edu.vn/api/integration/files')
      expect(init.method).toBe('POST')
      expect((init.headers as Record<string, string>)['X-Api-Key']).toBe('hvmk_academy_test')
      // Multipart: không tự đặt Content-Type để fetch tự thêm boundary
      expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined()

      const form = init.body as FormData
      expect(form).toBeInstanceOf(FormData)
      expect(form.get('folderPath')).toBe('academy/hvm/avatars/2026')
      expect(form.get('title')).toBe('ảnh đẹp.png')
      const file = form.get('file') as File
      expect(file.name).toBe('ảnh đẹp.png')
      expect(file.type).toBe('image/png')
      expect(file.size).toBe(13)
    })

    it('không gửi folderPath khi objectKey nằm ở gốc và không cấu hình folder_path', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(201, fileDto()))
      const bare = new HvmStorageDriver({ base_url: config.base_url, api_key: 'k' })

      await bare.upload({ buffer: Buffer.from('x'), originalName: 'a.png', mimeType: 'image/png', objectKey: 'a_1.png' })

      expect((call(0).init.body as FormData).has('folderPath')).toBe(false)
    })

    it('video không có link file thì lấy link nhúng', async () => {
      fetchMto()
      function fetchMto() {
        fetchMock.mockResolvedValueOnce(
          jsonResponse(
            201,
            fileDto({
              kind: 'VIDEO',
              urls: { file: null, embed: 'https://video.hvmvsaigon.edu.vn/embed/tok', watch: 'https://app/watch/file1', download: 'd', poster: null },
            }),
          ),
        )
      }

      const result = await driver.upload({ buffer: Buffer.from('x'), originalName: 'v.mp4', mimeType: 'video/mp4', objectKey: 'v.mp4' })

      expect(result.url).toBe('https://video.hvmvsaigon.edu.vn/embed/tok')
      // getPublicUrl đồng bộ trả được URL vừa biết
      expect(driver.getPublicUrl('file1')).toBe('https://video.hvmvsaigon.edu.vn/embed/tok')
      expect(driver.getPublicUrl('chua-biet')).toBeNull()
    })

    it('gửi visibility khi cấu hình default_visibility', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(201, fileDto()))
      const withVisibility = new HvmStorageDriver({ ...config, default_visibility: 'DOMAIN_LOCKED' })

      await withVisibility.upload({ buffer: Buffer.from('x'), originalName: 'a.png', mimeType: 'image/png', objectKey: 'a.png' })

      expect((call(0).init.body as FormData).get('visibility')).toBe('DOMAIN_LOCKED')
    })
  })

  describe('delete', () => {
    it('gọi DELETE /files/:id', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }))

      await driver.delete('file1')

      expect(call(0).url).toBe('https://app.hvmvsaigon.edu.vn/api/integration/files/file1')
      expect(call(0).init.method).toBe('DELETE')
    })

    it('404 coi là đã xoá, không ném lỗi', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(404, { code: 'NOT_FOUND', message: 'Không có file' }))

      await expect(driver.delete('file-da-xoa')).resolves.toBeUndefined()
    })

    it('tách id từ key dạng đường dẫn /f/<id>/<tên> (xoá file chưa có trong index)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }))

      await driver.delete('f/abc123/anh.png')

      expect(call(0).url).toBe('https://app.hvmvsaigon.edu.vn/api/integration/files/abc123')
    })

    it('lỗi khác 404 thì ném lỗi có mã HTTP và message của hvm-storage', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(403, { code: 'FORBIDDEN', message: 'Ứng dụng đã bị tắt' }))

      await expect(driver.delete('file1')).rejects.toThrow(/403.*xoá file.*Ứng dụng đã bị tắt/)
    })
  })

  describe('test()', () => {
    it('ok khi /me trả về, kèm app và rootFolder', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, meDto))

      const result = await driver.test()

      expect(result.ok).toBe(true)
      expect(result.message).toContain('Học viện')
      expect(result.details).toMatchObject({ app: meDto.app, rootFolder: meDto.rootFolder, folder_path: 'academy' })
      expect(call(0).url).toBe('https://app.hvmvsaigon.edu.vn/api/integration/me')
    })

    it('không ném lỗi khi API key sai, chỉ trả ok=false với hướng xử lý', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(401, { code: 'UNAUTHORIZED', message: 'Sai key' }))

      const result = await driver.test()

      expect(result.ok).toBe(false)
      expect(result.message).toMatch(/API key.*401/)
    })

    it('không ném lỗi khi mạng hỏng', async () => {
      fetchMock.mockRejectedValueOnce(Object.assign(new Error('getaddrinfo ENOTFOUND'), { cause: { code: 'ENOTFOUND' } }))

      const result = await driver.test()

      expect(result.ok).toBe(false)
      expect(result.message).toMatch(/Không kết nối được hvm-storage.*ENOTFOUND/)
    })

    it('báo thiếu cấu hình mà không gọi mạng', async () => {
      const empty = new HvmStorageDriver({})
      expect((await empty.test()).ok).toBe(false)
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('getUsage', () => {
    it('đọc quota từ /me với nguồn provider_api', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, meDto))

      await expect(driver.getUsage()).resolves.toEqual({ usedBytes: 1234, totalBytes: 50000, objectCount: null, source: 'provider_api' })
    })

    it('limitBytes null => totalBytes null (không giới hạn)', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { ...meDto, quota: { usedBytes: 5, limitBytes: null } }))

      expect((await driver.getUsage()).totalBytes).toBeNull()
    })
  })

  describe('signed url / download', () => {
    it('getSignedUrl gọi /files/:id/signed-url với ttl', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { url: 'https://video/f/file1/a.png?e=1&s=2', expiresAt: 'x' }))

      await expect(driver.getSignedUrl('file1', 600)).resolves.toBe('https://video/f/file1/a.png?e=1&s=2')
      expect(call(0).url).toBe('https://app.hvmvsaigon.edu.vn/api/integration/files/file1/signed-url?ttl=600')
    })

    it('download lấy link có chữ ký rồi tải byte', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse(200, { url: 'https://video/f/file1/a.png?e=1&s=2', expiresAt: 'x' }))
        .mockResolvedValueOnce(bytesResponse(200, Buffer.from('noi dung')))

      const buffer = await driver.download('file1')

      expect(buffer.toString()).toBe('noi dung')
      expect(call(1).url).toBe('https://video/f/file1/a.png?e=1&s=2')
    })
  })

  describe('list', () => {
    it('trang đầu: ensure không được dùng; dò thư mục theo từng cấp, lấy thư mục con rồi file', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse(200, meDto)) // /me để biết root
        .mockResolvedValueOnce(
          jsonResponse(200, {
            items: [{ type: 'folder', id: 'fAcademy', title: 'academy', parentId: 'root1', path: 'academy', counts: { children: 1 } }],
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse(200, {
            items: [{ type: 'folder', id: 'fAvatars', title: 'avatars', parentId: 'fAcademy', path: 'academy/avatars', counts: { children: 0 } }],
          }),
        )
        .mockResolvedValueOnce(jsonResponse(200, { items: [fileDto()], total: 3 }))

      const result = await driver.list('', undefined, 1)

      expect(result.prefixes).toEqual(['avatars'])
      expect(result.objects).toEqual([
        expect.objectContaining({
          objectKey: 'file1',
          name: 'anh.png',
          size: 13,
          mimeType: 'image/png',
          url: 'https://video.hvmvsaigon.edu.vn/f/file1/anh.png',
        }),
      ])
      // Còn 2 file nữa => cursor là skip tiếp theo
      expect(result.cursor).toBe('1')
      expect(call(3).url).toBe('https://app.hvmvsaigon.edu.vn/api/integration/files?folderId=fAcademy&take=1&skip=0')
    })

    it('thư mục không tồn tại trên dịch vụ => danh sách rỗng, không tạo thư mục', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, meDto)).mockResolvedValueOnce(jsonResponse(200, { items: [] }))

      const result = await driver.list('khong-co')

      expect(result).toEqual({ objects: [], prefixes: [], cursor: null })
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/folders/ensure'))).toBe(false)
    })
  })

  describe('thư mục và di chuyển', () => {
    it('createFolder dùng /folders/ensure với đường dẫn đã ghép folder_path và cache id', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(200, { type: 'folder', id: 'fNew', title: '2026', parentId: 'x', path: 'academy/pdf/2026', counts: { children: 0 } }),
      )

      await expect(driver.createFolder('pdf/2026')).resolves.toBe('fNew')
      await expect(driver.createFolder('pdf/2026')).resolves.toBe('fNew')

      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(call(0).url).toBe('https://app.hvmvsaigon.edu.vn/api/integration/folders/ensure')
      expect(JSON.parse(call(0).init.body as string)).toEqual({ path: 'academy/pdf/2026' })
    })

    it('deleteFolder có remoteId thì xoá thẳng, 404 bỏ qua', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(404, { message: 'gone' }))

      await expect(driver.deleteFolder('pdf', 'fOld')).resolves.toBeUndefined()
      expect(call(0).url).toBe('https://app.hvmvsaigon.edu.vn/api/integration/folders/fOld')
    })

    it('move đổi folderId và title qua PATCH, id không đổi', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse(200, fileDto({ folderId: 'fA', title: 'cu.png', filename: 'cu.png' })))
        .mockResolvedValueOnce(jsonResponse(200, { type: 'folder', id: 'fB', title: 'b', parentId: 'r', path: 'academy/b', counts: { children: 0 } }))
        .mockResolvedValueOnce(jsonResponse(200, fileDto({ folderId: 'fB', title: 'moi.png' })))

      await expect(driver.move('file1', 'hvm/b/moi.png')).resolves.toBe('file1')

      expect(call(2).init.method).toBe('PATCH')
      expect(JSON.parse(call(2).init.body as string)).toEqual({ folderId: 'fB', title: 'moi.png' })
    })
  })

  describe('createSession', () => {
    it('POST /sessions với đúng body và trả về token', async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(201, { token: 'jwt', expiresAt: '2026-10-25T01:00:00.000Z', hubUrl: 'https://app/api/hub', deliveryOrigin: 'https://video' }),
      )

      const session = await driver.createSession({ subject: '2:15', permissions: ['read'], ttlSeconds: 3600 })

      expect(session.token).toBe('jwt')
      expect(call(0).url).toBe('https://app.hvmvsaigon.edu.vn/api/integration/sessions')
      expect(JSON.parse(call(0).init.body as string)).toEqual({ subject: '2:15', permissions: ['read'], ttlSeconds: 3600 })
    })
  })

  describe('lỗi', () => {
    it('lỗi HTTP là HvmStorageError giữ status và code', async () => {
      // Hai lần gọi, mỗi lần một phản hồi (lỗi /me không được cache)
      fetchMock
        .mockResolvedValueOnce(jsonResponse(500, { code: 'INTERNAL', message: 'Nổ' }))
        .mockResolvedValueOnce(jsonResponse(500, { code: 'INTERNAL', message: 'Nổ' }))

      await expect(driver.getUsage()).rejects.toMatchObject({ status: 500, code: 'INTERNAL', message: expect.stringContaining('500') })
      await expect(driver.getUsage()).rejects.toBeInstanceOf(HvmStorageError)
    })

    it('body không phải JSON thì vẫn báo được mã HTTP', async () => {
      fetchMock.mockResolvedValueOnce({ ok: false, status: 502, text: async () => '<html>Bad gateway</html>' } as unknown as Response)

      await expect(driver.getUsage()).rejects.toThrow(/502.*Bad gateway/)
    })

    it('timeout báo rõ bằng tiếng Việt', async () => {
      fetchMock.mockRejectedValueOnce(Object.assign(new Error('aborted'), { name: 'AbortError' }))

      await expect(driver.getUsage()).rejects.toThrow(/không phản hồi sau 20 giây/)
    })
  })
})
