/**
 * Buổi học online dùng phòng học nào.
 * - EXTERNAL: link ngoài (Google Meet/Zoom) lưu ở `lesson.meeting_url`, giữ cho giai đoạn chuyển tiếp.
 * - HVM_MEET: phòng học HVM Meet tự host, vé vào phòng cấp qua POST /lessons/:id/meeting/join.
 */
export enum MeetingProvider {
  EXTERNAL = 'external',
  HVM_MEET = 'hvm_meet',
}

/** Vai trò trong phòng HVM Meet (roleKey), khớp các vai trò mặc định của HVM Meet. */
export enum HvmMeetRole {
  HOST = 'host',
  COHOST = 'cohost',
  PARTICIPANT = 'participant',
  VIEWER = 'viewer',
}

/** Tình trạng kết nối HVM Meet, cập nhật mỗi lần "Kiểm tra kết nối". */
export enum HvmMeetStatus {
  UNKNOWN = 'unknown',
  HEALTHY = 'healthy',
  ERROR = 'error',
}
