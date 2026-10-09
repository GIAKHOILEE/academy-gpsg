-- Index hỗ trợ các API thống kê ở dashboard.
--
-- Phần lớn không cần chạy tay: bảng `enrollment_classes` và các index khai báo
-- trong entity (uniq_enrollment_class, idx_enrollment_classes_class,
-- idx_user_role, idx_user_role_gender) đều được TypeORM tạo khi synchronize.
-- Dữ liệu cũ cũng được EnrollmentClassesBackfill tự backfill lúc khởi động app.
--
-- File này để chạy tay khi muốn backfill/đối chiếu mà không restart service,
-- hoặc để kiểm tra lại sau khi deploy.

-- ---------------------------------------------------------------------------
-- 1) Kiểm tra bảng quan hệ đã khớp với cột JSON chưa (kết quả mong đợi: 0 / 0)
-- ---------------------------------------------------------------------------
SELECT
  (
    SELECT COUNT(*)
    FROM (
      SELECT e.id AS enrollment_id, jt.class_id
      FROM enrollments e
      INNER JOIN JSON_TABLE(e.class_ids, '$[*]' COLUMNS (class_id INT PATH '$.class_id')) jt ON 1 = 1
      INNER JOIN classes c ON c.id = jt.class_id
      GROUP BY e.id, jt.class_id
    ) src
    LEFT JOIN enrollment_classes ec
      ON ec.enrollment_id = src.enrollment_id AND ec.class_id = src.class_id
    WHERE ec.id IS NULL
  ) AS thieu_trong_bang_quan_he,
  (
    SELECT COUNT(*)
    FROM enrollment_classes ec
    INNER JOIN enrollments e ON e.id = ec.enrollment_id
    WHERE NOT JSON_CONTAINS(COALESCE(e.class_ids, JSON_ARRAY()) -> '$[*].class_id', CAST(ec.class_id AS JSON))
  ) AS thua_trong_bang_quan_he;

-- ---------------------------------------------------------------------------
-- 2) Backfill / đối chiếu thủ công (idempotent, chạy lại bao nhiêu lần cũng được)
-- ---------------------------------------------------------------------------
INSERT INTO enrollment_classes (enrollment_id, class_id, learn_type)
SELECT src.enrollment_id, src.class_id, src.learn_type
FROM (
  SELECT e.id AS enrollment_id, jt.class_id AS class_id, CAST(COALESCE(jt.learn_type, 1) AS CHAR) AS learn_type
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
WHERE ec.id IS NULL;

DELETE ec FROM enrollment_classes ec
INNER JOIN enrollments e ON e.id = ec.enrollment_id
WHERE NOT JSON_CONTAINS(COALESCE(e.class_ids, JSON_ARRAY()) -> '$[*].class_id', CAST(ec.class_id AS JSON));

-- ---------------------------------------------------------------------------
-- 3) Index phụ trợ trên enrollments (TypeORM không tự tạo hết)
-- ---------------------------------------------------------------------------
-- Lọc đơn còn hiệu lực theo trạng thái — dùng trong thống kê lớp đã đăng ký.
ALTER TABLE enrollments ADD INDEX idx_enrollments_deleted_status (deleted_at, status);

-- Join enrollments -> students.
ALTER TABLE enrollments ADD INDEX idx_enrollments_student (student_id);

-- ---------------------------------------------------------------------------
-- 4) Xác nhận truy vấn đã đi bằng index, không còn full scan
-- ---------------------------------------------------------------------------
-- EXPLAIN ANALYZE
-- SELECT DISTINCT s.user_id
-- FROM classes c
-- INNER JOIN enrollment_classes ec ON ec.class_id = c.id
-- INNER JOIN enrollments e ON e.id = ec.enrollment_id
-- INNER JOIN students s ON s.id = e.student_id
-- WHERE e.deleted_at IS NULL AND c.semester_id = 1 AND c.scholastic_id = 1;
