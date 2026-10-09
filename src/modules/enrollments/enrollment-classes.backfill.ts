import { statsCache } from '@common/stats-cache.service'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { DataSource } from 'typeorm'

/**
 * Đối chiếu `enrollment_classes` với `enrollments.class_ids` lúc khởi động.
 *
 * Lần chạy đầu tiên đây chính là bước backfill toàn bộ dữ liệu cũ. Các lần sau
 * nó chỉ vá những sai lệch còn sót (ví dụ dữ liệu được sửa thẳng trong DB, hoặc
 * bản ghi được ghi trong lúc deploy).
 *
 * Cố ý KHÔNG await trong onModuleInit: hệ thống chỉ có một môi trường production,
 * nếu backfill chạy lâu hơn thời gian ân hạn của HEALTHCHECK thì container sẽ bị
 * đánh dấu unhealthy và restart vòng lặp. Để nó chạy nền thì app lên ngay, phần
 * thống kê chỉ thiếu dữ liệu trong vài giây đầu, các nghiệp vụ khác không bị ảnh
 * hưởng vì vẫn đọc `enrollments.class_ids` như cũ.
 */
@Injectable()
export class EnrollmentClassesBackfill implements OnModuleInit {
  private readonly logger = new Logger(EnrollmentClassesBackfill.name)

  constructor(private readonly dataSource: DataSource) {}

  onModuleInit(): void {
    this.reconcile()
      .then(({ inserted, deleted }) => {
        // Số thống kê tính trước lúc backfill xong là số thiếu -> buộc tính lại
        if (inserted || deleted) statsCache.invalidate('dashboard:')
      })
      .catch(error => {
        this.logger.error(`Đồng bộ enrollment_classes thất bại: ${error?.message}`)
      })
  }

  async reconcile(): Promise<{ inserted: number; deleted: number }> {
    // Thêm các cặp (enrollment, class) có trong JSON nhưng chưa có trong bảng quan hệ
    const insertResult = await this.dataSource.query(`
      INSERT INTO enrollment_classes (enrollment_id, class_id, learn_type)
      SELECT src.enrollment_id, src.class_id, src.learn_type
      FROM (
        SELECT
          e.id AS enrollment_id,
          jt.class_id AS class_id,
          CAST(COALESCE(jt.learn_type, 1) AS CHAR) AS learn_type
        FROM enrollments e
        INNER JOIN JSON_TABLE(
          e.class_ids,
          '$[*]' COLUMNS (class_id INT PATH '$.class_id', learn_type INT PATH '$.learn_type')
        ) jt ON 1 = 1
        INNER JOIN classes c ON c.id = jt.class_id
        WHERE jt.class_id IS NOT NULL
        GROUP BY e.id, jt.class_id, CAST(COALESCE(jt.learn_type, 1) AS CHAR)
      ) src
      LEFT JOIN enrollment_classes ec
        ON ec.enrollment_id = src.enrollment_id AND ec.class_id = src.class_id
      WHERE ec.id IS NULL
    `)

    // Xoá các cặp không còn trong JSON (đơn đã đổi lớp trong lúc service không chạy)
    const deleteResult = await this.dataSource.query(`
      DELETE ec FROM enrollment_classes ec
      INNER JOIN enrollments e ON e.id = ec.enrollment_id
      WHERE NOT JSON_CONTAINS(
        COALESCE(e.class_ids, JSON_ARRAY()) -> '$[*].class_id',
        CAST(ec.class_id AS JSON)
      )
    `)

    const inserted = Number(insertResult?.affectedRows) || 0
    const deleted = Number(deleteResult?.affectedRows) || 0

    if (inserted || deleted) {
      this.logger.log(`Đồng bộ enrollment_classes: thêm ${inserted}, xoá ${deleted}`)
    }

    return { inserted, deleted }
  }
}
