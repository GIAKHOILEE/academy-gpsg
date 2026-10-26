-- Phòng học HVM Meet: thay đổi schema.
--
-- Không cần chạy tay: database.config.ts bật `synchronize: true`, nên khi deploy
-- bản có HvmMeetModule thì TypeORM tự thêm cột `lesson.meeting_provider` (mặc định
-- 'external' cho mọi buổi học cũ) và tạo bảng `hvm_meet_settings`. Dòng cấu hình
-- được HvmMeetSettingSeeder tạo lần đầu từ env HVM_MEET_URL / HVM_MEET_API_KEY /
-- HVM_MEET_WEBHOOK_SECRET; sau đó sửa ở trang quản trị, env không ghi đè nữa.
--
-- File này để chạy tay trên môi trường tắt synchronize, hoặc để đối chiếu sau deploy.
-- KHÔNG chèn API key / secret bằng SQL: cột config_encrypted được mã hoá bởi app.

-- ---------------------------------------------------------------------------
-- 1) Buổi học chọn loại phòng học
-- ---------------------------------------------------------------------------
ALTER TABLE `lesson`
  ADD COLUMN `meeting_provider` varchar(20) NOT NULL DEFAULT 'external';

-- ---------------------------------------------------------------------------
-- 2) Cấu hình tích hợp (1 dòng, id = 1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `hvm_meet_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_encrypted` text NULL,
  `is_enabled` tinyint NOT NULL DEFAULT 0,
  `default_template_key` varchar(40) NOT NULL DEFAULT 'class',
  `status` varchar(30) NOT NULL DEFAULT 'unknown',
  `status_message` varchar(1000) NULL,
  `status_checked_at` datetime NULL,
  `created_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- 3) Kiểm tra sau deploy
-- ---------------------------------------------------------------------------
SELECT `meeting_provider`, COUNT(*) AS `lessons` FROM `lesson` GROUP BY `meeting_provider`;
SELECT `id`, `is_enabled`, `default_template_key`, `status`, `status_checked_at` FROM `hvm_meet_settings`;
