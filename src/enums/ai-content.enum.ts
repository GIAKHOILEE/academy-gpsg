export enum AiStatus {
  PENDING = 'PENDING', // Đang trong hàng chờ gen
  PROCESSING = 'PROCESSING', // Đang trong quá trình gen
  COMPLETED = 'COMPLETED', // Đã gen xong
  FAILED = 'FAILED', // Gen thất bại
  CANCELLED = 'CANCELLED', // Đã hủy
}

export enum AiModuleType {
  STORY = 'story',
  WITNESS_FAITH = 'witness-faiths',
  POST_CATALOG_TOP = 'post-catalog-top',
}

export enum AiImageSource {
  AI_GENERATED = 'AI_GENERATED',
  WEB_FALLBACK = 'WEB_FALLBACK',
  MANUAL = 'MANUAL',
  NONE = 'NONE',
}

