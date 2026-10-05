import 'reflect-metadata'
import { getMetadataArgsStorage } from 'typeorm'
import { StorageFileEntity } from '../entities/storage-file.entity'
import { StorageFolderEntity } from '../entities/storage-folder.entity'
import { StorageProviderEntity } from '../entities/storage-provider.entity'
import { StorageSettingEntity } from '../entities/storage-setting.entity'

/**
 * Kiểm tra ràng buộc của MySQL ngay ở tầng khai báo entity.
 *
 * Dự án bật `synchronize: true` nên TypeORM tự tạo bảng lúc khởi động. Một index
 * quá dài sẽ không lộ ra ở bất kỳ unit test nào, mà làm app chết thẳng khi deploy
 * với thông báo "Specified key was too long". Test này bắt lỗi đó ngay lúc chạy CI.
 */
describe('Ràng buộc schema của các entity lưu trữ', () => {
  const ENTITIES = [StorageProviderEntity, StorageFolderEntity, StorageFileEntity, StorageSettingEntity]

  /** InnoDB với row format DYNAMIC cho phép khoá index tối đa 3072 byte. */
  const MAX_INDEX_BYTES = 3072
  /** utf8mb4 tốn tối đa 4 byte cho một ký tự. */
  const BYTES_PER_CHAR = 4

  const metadata = getMetadataArgsStorage()

  /** Lớp entity. Dùng thay cho `Function` để không vi phạm rule ban-types. */
  type EntityClass = new (...args: never[]) => object

  /** Số byte tối đa một cột chiếm khi nằm trong index. */
  const columnIndexBytes = (target: EntityClass, propertyName: string): number => {
    const column = metadata.columns.find(item => item.target === target && item.propertyName === propertyName)

    if (!column) {
      // Cột quan hệ như provider_id được khai báo qua @Column riêng nên luôn tìm thấy;
      // không thấy nghĩa là tên trong @Index bị gõ sai
      throw new Error(`Không tìm thấy cột "${propertyName}" trên ${target.name}`)
    }

    // Có khai báo length thì đó là cột chuỗi, số byte tính thẳng từ đó
    if (column.options.length) return Number(column.options.length) * BYTES_PER_CHAR

    const type = column.options.type ? String(column.options.type) : null
    if (type === 'int') return 4
    if (type === 'bigint') return 8
    if (type === 'boolean') return 1
    if (type === 'datetime') return 8
    if (type === 'text' || type === 'longtext') {
      throw new Error(`Cột "${propertyName}" kiểu ${type} không index trực tiếp được trên MySQL`)
    }

    // Không khai báo type (ví dụ `@Column() provider_id: number`): TypeORM suy ra
    // từ kiểu TypeScript, đọc lại đúng kiểu đó qua reflect-metadata
    const designType = Reflect.getMetadata('design:type', target.prototype, propertyName)
    if (designType === Number) return 8
    if (designType === Boolean) return 1
    if (designType === Date) return 8
    // Chuỗi không khai length thì TypeORM mặc định varchar(255)
    return 255 * BYTES_PER_CHAR
  }

  describe('index không vượt giới hạn khoá của InnoDB', () => {
    const tableIndexes = metadata.indices.filter(index => ENTITIES.includes(index.target as never))

    it('có index ở cấp bảng để kiểm tra', () => {
      expect(tableIndexes.length).toBeGreaterThan(0)
    })

    it.each(tableIndexes.map(index => [`${(index.target as EntityClass).name}: ${(index.columns as string[]).join(' + ')}`, index]))(
      '%s nằm trong giới hạn 3072 byte',
      (_label, index) => {
        const columns = index.columns as string[]
        const totalBytes = columns.reduce((sum, column) => sum + columnIndexBytes(index.target as EntityClass, column), 0)

        expect(totalBytes).toBeLessThanOrEqual(MAX_INDEX_BYTES)
      },
    )

    it('phủ cả index gắn trực tiếp trên cột lẫn index khai báo ở cấp bảng', () => {
      // TypeORM lưu @Index() trên property cũng dưới dạng columns = [tên cột],
      // nên vòng lặp phía trên đã kiểm hết cả hai kiểu khai báo
      const columnNames = tableIndexes.flatMap(index => index.columns as string[])

      expect(columnNames).toEqual(expect.arrayContaining(['url', 'object_key', 'path']))
    })
  })

  describe('index unique đúng chỗ cần thiết', () => {
    it('một dịch vụ không có 2 file cùng object_key', () => {
      const index = metadata.indices.find(
        item => item.target === StorageFileEntity && item.unique && (item.columns as string[])?.includes('object_key'),
      )

      expect(index).toBeDefined()
      expect(index.columns).toEqual(['provider_id', 'object_key'])
    })

    it('một dịch vụ không có 2 thư mục cùng đường dẫn', () => {
      const index = metadata.indices.find(item => item.target === StorageFolderEntity && item.unique && (item.columns as string[])?.includes('path'))

      expect(index).toBeDefined()
      expect(index.columns).toEqual(['provider_id', 'path'])
    })
  })

  describe('kiểu cột phù hợp với dữ liệu sẽ lưu', () => {
    const columnsOf = (target: EntityClass) => metadata.columns.filter(column => column.target === target)

    it('mọi cột dung lượng dùng bigint, vì byte vượt xa giới hạn của int', () => {
      const sizeColumns = [...columnsOf(StorageProviderEntity), ...columnsOf(StorageFileEntity)].filter(
        column => /bytes$/.test(column.propertyName) || column.propertyName === 'usage_objects',
      )

      expect(sizeColumns.length).toBeGreaterThan(0)
      for (const column of sizeColumns) {
        expect({ column: column.propertyName, type: column.options.type }).toEqual({
          column: column.propertyName,
          type: 'bigint',
        })
      }
    })

    it('cấu hình đã mã hoá dùng text, vì service account JSON rất dài', () => {
      const column = columnsOf(StorageProviderEntity).find(item => item.propertyName === 'config_encrypted')

      expect(column.options.type).toBe('text')
    })

    it('mỗi entity đều có cột xoá mềm, trừ bảng cấu hình chỉ có 1 dòng', () => {
      for (const entity of [StorageProviderEntity, StorageFolderEntity, StorageFileEntity]) {
        const hasSoftDelete = metadata.columns.some(column => column.target === entity && column.mode === 'deleteDate')
        expect({ entity: entity.name, hasSoftDelete }).toEqual({ entity: entity.name, hasSoftDelete: true })
      }
    })
  })

  describe('tên bảng không đụng bảng sẵn có', () => {
    it('mọi bảng đều có tiền tố storage_', () => {
      for (const entity of ENTITIES) {
        const table = metadata.tables.find(item => item.target === entity)

        expect(table).toBeDefined()
        expect(table.name).toMatch(/^storage_/)
      }
    })
  })
})
