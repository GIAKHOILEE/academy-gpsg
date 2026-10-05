import { StorageFileEntity } from '../entities/storage-file.entity'
import { StorageReferenceService } from '../services/storage-reference.service'

/** Giả lập metadata của TypeORM với vài bảng điển hình trong codebase. */
const entityMetadatas = [
  {
    name: 'User',
    tableName: 'users',
    primaryColumns: [{ databaseName: 'id' }],
    columns: [
      { databaseName: 'id', type: 'int' },
      { databaseName: 'first_name', type: 'varchar' },
      { databaseName: 'avatar', type: 'varchar' },
      { databaseName: 'age', type: 'int' },
      { databaseName: 'created_at', type: 'datetime' },
    ],
  },
  {
    name: 'PostEntity',
    tableName: 'post',
    primaryColumns: [{ databaseName: 'id' }],
    columns: [
      { databaseName: 'id', type: 'int' },
      { databaseName: 'title', type: 'varchar' },
      { databaseName: 'thumbnail', type: 'varchar' },
      { databaseName: 'content', type: 'longtext' },
      { databaseName: 'view_count', type: 'int' },
    ],
  },
  {
    name: 'StorageFileEntity',
    tableName: 'storage_files',
    primaryColumns: [{ databaseName: 'id' }],
    columns: [
      { databaseName: 'id', type: 'int' },
      { databaseName: 'url', type: 'varchar' },
    ],
  },
]

const makeFile = (overrides: Partial<StorageFileEntity> = {}): StorageFileEntity =>
  Object.assign(new StorageFileEntity(), {
    id: 1,
    object_key: 'hvm/anh_1730135238382_a1b2c3d4.png',
    name: 'anh.png',
    url: 'https://pub-test.r2.dev/hvm/anh_1730135238382_a1b2c3d4.png',
    ...overrides,
  })

describe('StorageReferenceService', () => {
  let service: StorageReferenceService
  let dataSource: any
  let fileRepository: any

  beforeEach(() => {
    dataSource = { entityMetadatas, query: jest.fn(async () => []) }
    fileRepository = { findOne: jest.fn(async () => makeFile()), update: jest.fn(async () => undefined) }

    service = new StorageReferenceService(dataSource, fileRepository)
    jest.spyOn(service['logger'], 'log').mockImplementation(() => undefined)
    jest.spyOn(service['logger'], 'debug').mockImplementation(() => undefined)
    service.onModuleInit()
  })

  describe('dò cột cần tra ngược', () => {
    it('nhận cột có tên gợi ý đường dẫn file', () => {
      const columns = service.getScannedColumns()

      expect(columns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ table: 'users', column: 'avatar' }),
          expect.objectContaining({ table: 'post', column: 'thumbnail' }),
        ]),
      )
    })

    it('nhận cả cột nội dung dài vì URL có thể nhúng trong HTML', () => {
      const content = service.getScannedColumns().find(column => column.column === 'content')

      expect(content).toMatchObject({ table: 'post', isLongText: true })
    })

    it('bỏ qua cột không phải chuỗi và cột không liên quan tới file', () => {
      const columns = service.getScannedColumns()

      expect(columns.find(column => column.column === 'age')).toBeUndefined()
      expect(columns.find(column => column.column === 'view_count')).toBeUndefined()
      expect(columns.find(column => column.column === 'created_at')).toBeUndefined()
      expect(columns.find(column => column.column === 'first_name')).toBeUndefined()
    })

    it('ghi lại khoá chính để trả về id bản ghi đang dùng file', () => {
      expect(service.getScannedColumns().every(column => column.primaryKey === 'id')).toBe(true)
    })
  })

  describe('findReferences', () => {
    it('tìm thấy chỗ đang dùng file và trả về tên bảng, cột, id bản ghi', async () => {
      dataSource.query.mockImplementation(async (sql: string) =>
        sql.includes('`users`') ? [{ record_id: 42, value: 'https://pub-test.r2.dev/hvm/anh_1730135238382_a1b2c3d4.png' }] : [],
      )

      const result = await service.findReferences(1)

      expect(result.total).toBe(1)
      expect(result.references[0]).toMatchObject({ entity: 'User', table: 'users', column: 'avatar', record_id: 42 })
    })

    it('không tra ngược chính bảng danh mục file của mình', async () => {
      await service.findReferences(1)

      const queriedTables = dataSource.query.mock.calls.map((call: any[]) => call[0])
      expect(queriedTables.some((sql: string) => sql.includes('`storage_files`'))).toBe(false)
    })

    it('tìm theo cả URL đầy đủ và tên file, để vẫn ra kết quả khi URL đã đổi domain', async () => {
      await service.findReferences(1)

      const parameters = dataSource.query.mock.calls[0][1]
      expect(parameters).toContain('%https://pub-test.r2.dev/hvm/anh_1730135238382_a1b2c3d4.png%')
      expect(parameters).toContain('%anh_1730135238382_a1b2c3d4.png%')
    })

    it('bỏ qua tên file quá ngắn để không khớp bừa', async () => {
      fileRepository.findOne.mockResolvedValue(makeFile({ object_key: 'a.png', name: 'a.png', url: 'https://cdn/a.png' }))

      await service.findReferences(1)

      const parameters = dataSource.query.mock.calls[0][1]
      // Chỉ còn URL đầy đủ, không có "a.png" vì nó quá ngắn
      expect(parameters).toEqual(['%https://cdn/a.png%'])
    })

    it('dùng placeholder tham số, không nhúng giá trị vào câu SQL', async () => {
      await service.findReferences(1)

      const [sql, parameters] = dataSource.query.mock.calls[0]
      expect(sql).toContain('LIKE ?')
      expect(sql).not.toContain('pub-test.r2.dev')
      expect(Array.isArray(parameters)).toBe(true)
    })

    it('kèm đoạn ngữ cảnh với cột nội dung dài, để biết URL nằm ở đâu trong bài', async () => {
      const longContent = `${'a'.repeat(200)}<img src="https://pub-test.r2.dev/hvm/anh_1730135238382_a1b2c3d4.png">${'b'.repeat(200)}`
      dataSource.query.mockImplementation(async (sql: string) => (sql.includes('`content`') ? [{ record_id: 7, value: longContent }] : []))

      const result = await service.findReferences(1)
      const reference = result.references.find(item => item.column === 'content')

      expect(reference.excerpt).toContain('<img src=')
      expect(reference.excerpt.startsWith('...')).toBe(true)
      expect(reference.excerpt.endsWith('...')).toBe(true)
      // Phải ngắn hơn nhiều so với nội dung gốc
      expect(reference.excerpt.length).toBeLessThan(longContent.length)
    })

    it('không kèm ngữ cảnh với cột URL ngắn, vì cả giá trị đã là URL', async () => {
      dataSource.query.mockImplementation(async (sql: string) =>
        sql.includes('`avatar`') ? [{ record_id: 1, value: 'https://pub-test.r2.dev/hvm/anh.png' }] : [],
      )

      const reference = (await service.findReferences(1)).references[0]

      expect(reference.excerpt).toBeUndefined()
    })

    it('bỏ qua cột lỗi thay vì làm sập cả API', async () => {
      // Bảng vừa bị đổi schema, hoặc DB chưa sync xong
      dataSource.query.mockImplementation(async (sql: string) => {
        if (sql.includes('`users`')) throw new Error('Unknown column')
        return sql.includes('`thumbnail`') ? [{ record_id: 5, value: 'url' }] : []
      })

      const result = await service.findReferences(1)

      expect(result.references).toHaveLength(1)
      expect(result.references[0].table).toBe('post')
    })

    it('trả rỗng khi file không tồn tại', async () => {
      fileRepository.findOne.mockResolvedValue(null)

      expect(await service.findReferences(999)).toEqual({ references: [], total: 0 })
      expect(dataSource.query).not.toHaveBeenCalled()
    })

    it('trả rỗng khi file không có URL và tên quá ngắn, thay vì quét cả DB vô ích', async () => {
      fileRepository.findOne.mockResolvedValue(makeFile({ url: null, object_key: 'a', name: 'a' }))

      expect(await service.findReferences(1)).toEqual({ references: [], total: 0 })
      expect(dataSource.query).not.toHaveBeenCalled()
    })

    it('giới hạn số kết quả mỗi cột để không kéo cả bảng về', async () => {
      await service.findReferences(1, 5)

      expect(dataSource.query.mock.calls[0][0]).toContain('LIMIT 5')
    })

    it('chặn giá trị limit không hợp lệ, luôn là số nguyên tối thiểu 1', async () => {
      await service.findReferences(1, 0)

      expect(dataSource.query.mock.calls[0][0]).toContain('LIMIT 1')
    })
  })

  describe('refreshReferenceCounts', () => {
    it('ghi lại số lần được dùng cho từng file, để lọc nhanh file chưa dùng', async () => {
      dataSource.query.mockImplementation(async (sql: string) => (sql.includes('`avatar`') ? [{ record_id: 1, value: 'x' }] : []))

      const counts = await service.refreshReferenceCounts([1])

      expect(counts).toEqual({ 1: 1 })
      expect(fileRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({ reference_count: 1, reference_checked_at: expect.anything() }))
    })

    it('ghi 0 cho file không còn được dùng ở đâu', async () => {
      const counts = await service.refreshReferenceCounts([1])

      expect(counts).toEqual({ 1: 0 })
      expect(fileRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({ reference_count: 0 }))
    })
  })

  describe('an toàn với tên bảng và cột', () => {
    it('loại bỏ backtick khỏi identifier để không ghép được SQL lạ vào', () => {
      expect(service['quoteIdentifier']('users`; DROP TABLE users; --')).toBe('`users; DROP TABLE users; --`')
    })
  })
})
