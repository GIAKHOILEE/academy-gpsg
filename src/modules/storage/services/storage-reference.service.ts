import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { StorageFileEntity } from '../entities/storage-file.entity'

/** Một cột trong DB có khả năng đang chứa đường dẫn file. */
interface ScannableColumn {
  table: string
  column: string
  entityName: string
  /** Cột dạng text dài (content, description) có thể nhúng URL giữa nội dung. */
  isLongText: boolean
  /** Cột khoá chính, để trả về id của bản ghi đang dùng file. */
  primaryKey: string | null
}

export interface StorageFileReference {
  entity: string
  table: string
  column: string
  record_id: string | number | null
  /** Đoạn ngữ cảnh ngắn quanh vị trí URL, với cột text dài. */
  excerpt?: string
}

/**
 * Trả lời câu hỏi "file này đang được dùng ở đâu".
 *
 * Cách làm: tự dò metadata của TypeORM để tìm mọi cột kiểu chuỗi có tên gợi ý
 * đường dẫn file (url, image, avatar, file, path, thumbnail, attachment,
 * banner, icon, logo, content...) rồi tra ngược theo URL.
 *
 * Chọn cách tự dò thay vì khai báo tay danh sách cột vì codebase có hơn 40 module
 * và còn thêm nữa - khai báo tay sẽ lạc hậu ngay.
 */
@Injectable()
export class StorageReferenceService implements OnModuleInit {
  private readonly logger = new Logger(StorageReferenceService.name)

  /** Tên cột chứa những từ này thì có khả năng đang giữ đường dẫn file. */
  private static readonly COLUMN_HINTS = [
    'url',
    'image',
    'images',
    'avatar',
    'file',
    'files',
    'path',
    'thumbnail',
    'thumb',
    'attachment',
    'attachments',
    'banner',
    'icon',
    'logo',
    'photo',
    'picture',
    'media',
    'video',
    'audio',
    'document',
    'signature',
    'qr',
    'background',
  ]

  /** Cột nội dung dài có thể nhúng URL bên trong HTML. */
  private static readonly LONG_TEXT_HINTS = ['content', 'description', 'body', 'detail', 'html', 'note']

  private columns: ScannableColumn[] = []

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(StorageFileEntity)
    private readonly fileRepository: Repository<StorageFileEntity>,
  ) {}

  onModuleInit() {
    this.columns = this.buildColumnRegistry()
    this.logger.log(`Sẽ tra ngược trên ${this.columns.length} cột có khả năng chứa đường dẫn file`)
  }

  /** Danh sách cột đang được quét, để admin biết phạm vi tra cứu. */
  getScannedColumns(): ScannableColumn[] {
    return this.columns
  }

  /**
   * Tìm mọi chỗ trong DB đang trỏ tới file.
   *
   * Khớp theo URL đầy đủ và theo tên file. Tên file được sinh kèm timestamp và
   * 8 ký tự hex ngẫu nhiên nên đủ duy nhất để khớp an toàn, nhờ vậy vẫn tìm ra
   * được cả khi URL trong DB dùng domain khác (đổi CDN, đổi custom domain).
   */
  async findReferences(fileId: number, limitPerColumn = 20): Promise<{ references: StorageFileReference[]; total: number }> {
    const file = await this.fileRepository.findOne({ where: { id: fileId } })
    if (!file) return { references: [], total: 0 }

    const needles = this.buildNeedles(file)
    if (!needles.length) return { references: [], total: 0 }

    const references: StorageFileReference[] = []

    for (const column of this.columns) {
      // Không tra ngược chính bảng index của mình
      if (column.table === 'storage_files') continue

      try {
        const found = await this.queryColumn(column, needles, limitPerColumn)
        references.push(...found)
      } catch (error: any) {
        // Bảng/cột đổi kiểu, hoặc DB chưa sync: bỏ qua cột đó chứ không làm hỏng cả API
        this.logger.debug(`Bỏ qua ${column.table}.${column.column}: ${error?.message}`)
      }
    }

    return { references, total: references.length }
  }

  /**
   * Cập nhật reference_count cho một loạt file, để UI lọc nhanh "file chưa dùng ở đâu"
   * mà không phải quét lại toàn DB mỗi lần mở trang.
   */
  async refreshReferenceCounts(fileIds: number[]): Promise<Record<number, number>> {
    const counts: Record<number, number> = {}

    for (const fileId of fileIds) {
      const { total } = await this.findReferences(fileId, 1)
      counts[fileId] = total
      await this.fileRepository.update(fileId, { reference_count: total, reference_checked_at: new Date() })
    }

    return counts
  }

  /* ------------------------------ private ------------------------------ */

  /**
   * Các chuỗi dùng để tìm. Ưu tiên URL đầy đủ, thêm tên file vì nó đã đủ duy nhất.
   * Tên file quá ngắn (dưới 8 ký tự) bị loại để tránh khớp bừa.
   */
  private buildNeedles(file: StorageFileEntity): string[] {
    const needles = new Set<string>()

    if (file.url) {
      needles.add(file.url)
      // URL trong DB có thể đã bị encode/decode khác nhau
      try {
        const decoded = decodeURI(file.url)
        if (decoded !== file.url) needles.add(decoded)
      } catch {
        // URL không decode được thì dùng nguyên bản
      }
    }

    const basename = (file.object_key || '').split('/').pop()
    if (basename && basename.length >= 8) needles.add(basename)
    if (file.name && file.name.length >= 8 && file.name !== basename) needles.add(file.name)

    return [...needles]
  }

  private async queryColumn(column: ScannableColumn, needles: string[], limit: number): Promise<StorageFileReference[]> {
    // Tên bảng/cột lấy từ metadata TypeORM nên không phải input người dùng,
    // vẫn bỏ backtick để chắc chắn không ghép được SQL lạ vào identifier.
    const table = this.quoteIdentifier(column.table)
    const field = this.quoteIdentifier(column.column)
    const quoted = `${table}.${field}`

    const select = column.primaryKey
      ? `${table}.${this.quoteIdentifier(column.primaryKey)} AS record_id, ${quoted} AS value`
      : `NULL AS record_id, ${quoted} AS value`

    // Driver mysql2 dùng placeholder dạng ?, tham số truyền theo thứ tự
    const conditions = needles.map(() => `${quoted} LIKE ?`).join(' OR ')

    const rows = await this.dataSource.query(
      `SELECT ${select} FROM ${table} WHERE (${conditions}) LIMIT ${Math.max(Math.floor(limit), 1)}`,
      needles.map(needle => `%${needle}%`),
    )

    return rows.map((row: any) => ({
      entity: column.entityName,
      table: column.table,
      column: column.column,
      record_id: row.record_id ?? null,
      excerpt: column.isLongText ? this.makeExcerpt(String(row.value || ''), needles) : undefined,
    }))
  }

  private quoteIdentifier(name: string): string {
    return `\`${String(name).replace(/`/g, '')}\``
  }

  /** Lấy một đoạn ngắn quanh vị trí tìm thấy, để người dùng biết nó nằm ở đâu trong nội dung. */
  private makeExcerpt(value: string, needles: string[]): string {
    for (const needle of needles) {
      const position = value.indexOf(needle)
      if (position === -1) continue
      const start = Math.max(position - 60, 0)
      const end = Math.min(position + needle.length + 60, value.length)
      return `${start > 0 ? '...' : ''}${value.slice(start, end)}${end < value.length ? '...' : ''}`
    }
    return value.slice(0, 160)
  }

  /**
   * Dò metadata TypeORM để lập danh sách cột cần quét.
   * Chỉ nhận cột kiểu chuỗi/text, vì đường dẫn file không nằm ở cột số hay ngày.
   */
  private buildColumnRegistry(): ScannableColumn[] {
    const stringTypes = new Set(['varchar', 'text', 'longtext', 'mediumtext', 'tinytext', 'char', 'json'])
    const registry: ScannableColumn[] = []

    for (const metadata of this.dataSource.entityMetadatas) {
      const primaryKey = metadata.primaryColumns[0]?.databaseName || null

      for (const column of metadata.columns) {
        const type = String(column.type).toLowerCase()
        if (!stringTypes.has(type)) continue

        const name = column.databaseName.toLowerCase()
        const isFileHint = StorageReferenceService.COLUMN_HINTS.some(hint => name === hint || name.includes(hint))
        const isLongText = StorageReferenceService.LONG_TEXT_HINTS.some(hint => name.includes(hint))

        if (!isFileHint && !isLongText) continue

        registry.push({
          table: metadata.tableName,
          column: column.databaseName,
          entityName: metadata.name,
          isLongText,
          primaryKey,
        })
      }
    }

    return registry
  }
}
