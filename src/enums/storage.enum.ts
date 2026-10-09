/**
 * Driver = đoạn code nói chuyện với dịch vụ lưu trữ.
 * Một driver có thể phục vụ nhiều dịch vụ khác nhau thông qua `preset`
 * (ví dụ driver S3 phục vụ R2, AWS S3, Backblaze B2, Wasabi...).
 */
export enum StorageDriver {
  LOCAL = 'local',
  S3 = 's3',
  CLOUDINARY = 'cloudinary',
  GOOGLE_DRIVE = 'google_drive',
  DROPBOX = 'dropbox',
  ONEDRIVE = 'onedrive',
  AZURE_BLOB = 'azure_blob',
  BUNNY = 'bunny',
}

/** Tình trạng hoạt động của 1 dịch vụ, cập nhật mỗi lần test / refresh usage. */
export enum StorageProviderStatus {
  UNKNOWN = 'unknown',
  HEALTHY = 'healthy',
  ERROR = 'error',
  FULL = 'full',
}

/** Cách chọn dịch vụ khi có nhiều dịch vụ đang bật. */
export enum StorageStrategy {
  /** Chọn dịch vụ còn trống nhiều nhất (theo %) - mặc định */
  MOST_FREE = 'most_free',
  /** Dùng hết dịch vụ priority thấp nhất rồi mới tràn sang cái tiếp theo */
  PRIORITY_FILL = 'priority_fill',
  /** Xoay vòng theo trọng số weight */
  WEIGHTED_ROUND_ROBIN = 'weighted_round_robin',
  /** Luôn dùng dịch vụ được đánh dấu mặc định */
  SINGLE_DEFAULT = 'single_default',
}

/** Nguồn gốc của bản ghi file trong index. */
export enum StorageFileSource {
  /** Upload qua API của hệ thống */
  UPLOAD = 'upload',
  /** Quét (scan) từ dịch vụ về, file đã có sẵn trước khi có feature này */
  SCAN = 'scan',
}

/** Nhóm loại file, dùng để filter nhanh trên UI. */
export enum StorageFileKind {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  ARCHIVE = 'archive',
  OTHER = 'other',
}

/** Chế độ xác thực của driver Google Drive. */
export enum GoogleDriveAuthMode {
  /** OAuth refresh token của 1 user thật - chạy được cả Gmail miễn phí */
  OAUTH = 'oauth',
  /** Service account ghi vào Shared Drive (cần Google Workspace) */
  SERVICE_ACCOUNT = 'service_account',
}
