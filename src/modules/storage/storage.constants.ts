import { GoogleDriveAuthMode, StorageDriver } from '@enums/storage.enum'
import { DRIVER_GUIDES, S3_PRESET_GUIDES, StorageSetupGuide } from './storage.guides'

/** Một ô input trên form thêm/sửa dịch vụ ở admin. FE render form từ schema này. */
export interface StorageConfigField {
  key: string
  label: string
  type: 'text' | 'password' | 'number' | 'textarea' | 'select' | 'boolean'
  required?: boolean
  /** true => giá trị bị che khi trả về API, và giữ nguyên nếu client gửi lại giá trị đã che */
  secret?: boolean
  placeholder?: string
  help?: string
  options?: { value: string; label: string }[]
  /** Chỉ hiện ô này khi field khác đang có giá trị nằm trong danh sách */
  showIf?: { key: string; in: string[] }
}

/** Những việc một driver làm được. UI dùng để ẩn/hiện nút, service dùng để chọn đường đi. */
export interface StorageDriverCapabilities {
  /** Dịch vụ có API trả về dung lượng đã dùng / tổng dung lượng không */
  quotaApi: boolean
  /** Có liệt kê được object trên dịch vụ (để quét file cũ về index) không */
  listing: boolean
  /** Có tạo được link tải tạm thời có hạn không */
  signedUrl: boolean
  /** Có URL public cố định không */
  publicUrl: boolean
  /** Dịch vụ có khái niệm thư mục thật (không phải prefix giả) */
  realFolders: boolean
  /** Có đổi tên / di chuyển file ngay trên dịch vụ không */
  move: boolean
}

export interface StorageDriverSchema {
  driver: StorageDriver
  label: string
  description: string
  docsUrl: string
  capabilities: StorageDriverCapabilities
  fields: StorageConfigField[]
  /** Hướng dẫn từng bước lấy thông tin cấu hình */
  guide?: StorageSetupGuide
}

/* ------------------------------------------------------------------ *
 *  PRESET CHO DRIVER S3
 *  Tất cả các dịch vụ dưới đây đều nói giao thức S3 (SigV4), nên dùng
 *  chung 1 driver. Preset chỉ khác nhau ở endpoint / region / path style.
 *  `{...}` trong endpoint sẽ được thay bằng config cùng tên.
 * ------------------------------------------------------------------ */
export interface S3Preset {
  id: string
  label: string
  /** Mẫu endpoint. null = người dùng tự nhập endpoint (MinIO, dịch vụ lạ) */
  endpoint: string | null
  /** Region mặc định; 'auto' với các dịch vụ không dùng region */
  defaultRegion: string
  /** true với các dịch vụ không hỗ trợ virtual-hosted bucket */
  forcePathStyle: boolean
  /** Các biến bổ sung cần nhập để ghép endpoint */
  vars?: StorageConfigField[]
  note?: string
  /** Hướng dẫn lấy từng thông tin, lắp vào ở cuối file */
  guide?: StorageSetupGuide
}

export const S3_PRESETS: S3Preset[] = [
  {
    id: 'cloudflare_r2',
    label: 'Cloudflare R2',
    endpoint: 'https://{account_id}.r2.cloudflarestorage.com',
    defaultRegion: 'auto',
    forcePathStyle: false,
    vars: [
      {
        key: 'account_id',
        label: 'Account ID',
        type: 'text',
        required: true,
        placeholder: 'a1b2c3d4e5f6...',
        help: 'Chuỗi 32 ký tự hex ở cột bên phải trang Cloudflare Dashboard > R2 > Overview. Cũng là phần đầu của endpoint R2.',
      },
      {
        key: 'cf_api_token',
        label: 'Cloudflare API Token (không bắt buộc)',
        type: 'password',
        secret: true,
        help: 'Token có quyền "Workers R2 Storage: Read". Có token thì đọc được dung lượng chính xác từ API Cloudflare thay vì phải cộng dồn từng object.',
      },
    ],
    note: 'Region luôn là "auto". Muốn file truy cập công khai thì bật r2.dev hoặc gắn custom domain rồi điền vào "URL công khai".',
  },
  {
    id: 'aws_s3',
    label: 'Amazon S3',
    endpoint: 'https://s3.{region}.amazonaws.com',
    defaultRegion: 'ap-southeast-1',
    forcePathStyle: false,
  },
  {
    id: 'backblaze_b2',
    label: 'Backblaze B2',
    endpoint: 'https://s3.{region}.backblazeb2.com',
    defaultRegion: 'us-west-004',
    forcePathStyle: false,
    note: 'Region nằm ngay trong endpoint Backblaze cấp cho bạn: endpoint s3.us-west-004.backblazeb2.com thì region là us-west-004. Một tài khoản B2 chỉ thuộc 1 region.',
  },
  {
    id: 'wasabi',
    label: 'Wasabi',
    endpoint: 'https://s3.{region}.wasabisys.com',
    defaultRegion: 'us-east-1',
    forcePathStyle: false,
  },
  {
    id: 'do_spaces',
    label: 'DigitalOcean Spaces',
    endpoint: 'https://{region}.digitaloceanspaces.com',
    defaultRegion: 'sgp1',
    forcePathStyle: false,
  },
  {
    id: 'linode',
    label: 'Akamai / Linode Object Storage',
    endpoint: 'https://{region}.linodeobjects.com',
    defaultRegion: 'us-east-1',
    forcePathStyle: false,
  },
  {
    id: 'vultr',
    label: 'Vultr Object Storage',
    endpoint: 'https://{region}.vultrobjects.com',
    defaultRegion: 'sgp1',
    forcePathStyle: false,
  },
  {
    id: 'scaleway',
    label: 'Scaleway Object Storage',
    endpoint: 'https://s3.{region}.scw.cloud',
    defaultRegion: 'fr-par',
    forcePathStyle: false,
  },
  {
    id: 'hetzner',
    label: 'Hetzner Object Storage',
    endpoint: 'https://{region}.your-objectstorage.com',
    defaultRegion: 'fsn1',
    forcePathStyle: false,
  },
  {
    id: 'contabo',
    label: 'Contabo Object Storage',
    endpoint: 'https://{region}.contabostorage.com',
    defaultRegion: 'eu2',
    forcePathStyle: true,
  },
  {
    id: 'gcs',
    label: 'Google Cloud Storage (HMAC)',
    endpoint: 'https://storage.googleapis.com',
    defaultRegion: 'auto',
    forcePathStyle: false,
    note: 'Vào Cloud Storage > Settings > Interoperability > Service account HMAC > Create key để lấy Access key / Secret.',
  },
  {
    id: 'supabase',
    label: 'Supabase Storage',
    endpoint: 'https://{project_ref}.storage.supabase.co/storage/v1/s3',
    defaultRegion: 'us-east-1',
    forcePathStyle: true,
    vars: [
      {
        key: 'project_ref',
        label: 'Project ref',
        type: 'text',
        required: true,
        placeholder: 'abcdefghijklmnop',
        help: 'Mã project trong URL dashboard Supabase (supabase.com/dashboard/project/<project-ref>).',
      },
    ],
    note: 'Region lấy đúng theo region project hiện trong dashboard Supabase. Không thêm tên bucket vào endpoint.',
  },
  {
    id: 'storj',
    label: 'Storj',
    endpoint: 'https://gateway.storjshare.io',
    defaultRegion: 'us-east-1',
    forcePathStyle: false,
  },
  {
    id: 'alibaba_oss',
    label: 'Alibaba Cloud OSS',
    endpoint: 'https://oss-{region}.aliyuncs.com',
    defaultRegion: 'ap-southeast-1',
    forcePathStyle: false,
  },
  {
    id: 'tencent_cos',
    label: 'Tencent Cloud COS',
    endpoint: 'https://cos.{region}.myqcloud.com',
    defaultRegion: 'ap-singapore',
    forcePathStyle: false,
  },
  {
    id: 'oracle_oci',
    label: 'Oracle Cloud Object Storage',
    endpoint: 'https://{namespace}.compat.objectstorage.{region}.oraclecloud.com',
    defaultRegion: 'ap-singapore-1',
    forcePathStyle: true,
    vars: [
      {
        key: 'namespace',
        label: 'Object Storage Namespace',
        type: 'text',
        required: true,
        help: 'Lấy ở OCI Console > Profile > Tenancy, dòng "Object Storage Namespace".',
      },
    ],
  },
  {
    id: 'idrive_e2',
    label: 'IDrive e2',
    endpoint: null,
    defaultRegion: 'us-east-1',
    forcePathStyle: true,
    note: 'IDrive e2 cấp endpoint riêng cho từng tài khoản, bạn dán nguyên endpoint đó vào.',
  },
  {
    id: 'ovh',
    label: 'OVHcloud Object Storage',
    endpoint: 'https://s3.{region}.io.cloud.ovh.net',
    defaultRegion: 'gra',
    forcePathStyle: false,
  },
  {
    id: 'exoscale',
    label: 'Exoscale SOS',
    endpoint: 'https://sos-{region}.exo.io',
    defaultRegion: 'ch-gva-2',
    forcePathStyle: false,
  },
  {
    id: 'minio',
    label: 'MinIO / Ceph / tự dựng',
    endpoint: null,
    defaultRegion: 'us-east-1',
    forcePathStyle: true,
    note: 'Dán endpoint server của bạn, ví dụ https://minio.example.com:9000.',
  },
  {
    id: 'custom',
    label: 'Dịch vụ S3 khác (tự nhập endpoint)',
    endpoint: null,
    defaultRegion: 'auto',
    forcePathStyle: true,
  },
]

export const S3_PRESET_MAP = new Map(S3_PRESETS.map(p => [p.id, p]))

/** Ghép endpoint thật từ preset + config người dùng nhập. */
export function resolveS3Endpoint(presetId: string, config: Record<string, any>): string {
  const preset = S3_PRESET_MAP.get(presetId)
  // Người dùng tự nhập endpoint thì luôn ưu tiên cái họ nhập
  if (config.endpoint) return String(config.endpoint).replace(/\/+$/, '')

  const template = preset?.endpoint
  if (!template) return ''

  return template
    .replace(/\{(\w+)\}/g, (_match, key: string) => {
      const value = key === 'region' ? config.region || preset.defaultRegion : config[key]
      return String(value ?? '')
    })
    .replace(/\/+$/, '')
}

/** Region thật sẽ gửi cho SDK. */
export function resolveS3Region(presetId: string, config: Record<string, any>): string {
  return config.region || S3_PRESET_MAP.get(presetId)?.defaultRegion || 'auto'
}

/** Path style thật sẽ gửi cho SDK (config ghi đè preset). */
export function resolveS3ForcePathStyle(presetId: string, config: Record<string, any>): boolean {
  if (config.force_path_style !== undefined && config.force_path_style !== null && config.force_path_style !== '') {
    return config.force_path_style === true || config.force_path_style === 'true'
  }
  return S3_PRESET_MAP.get(presetId)?.forcePathStyle ?? false
}

/* ------------------------------------------------------------------ *
 *  SCHEMA FORM CỦA TỪNG DRIVER
 * ------------------------------------------------------------------ */

const S3_FIELDS: StorageConfigField[] = [
  {
    key: 'preset',
    label: 'Dịch vụ',
    type: 'select',
    required: true,
    options: S3_PRESETS.map(p => ({ value: p.id, label: p.label })),
    help: 'Chọn xong sẽ hiện hướng dẫn lấy key riêng của dịch vụ đó, và endpoint được điền tự động.',
  },
  {
    key: 'bucket',
    label: 'Bucket',
    type: 'text',
    required: true,
    placeholder: 'ten-bucket-cua-ban',
    help: 'Tên bucket (Space / container / storage zone) bạn đã tạo trên dịch vụ. Copy đúng tên, phân biệt chữ hoa chữ thường.',
  },
  {
    key: 'region',
    label: 'Region',
    type: 'text',
    placeholder: 'ap-southeast-1',
    help: 'Mã vùng của bucket. Để trống sẽ dùng mặc định của dịch vụ đã chọn. Sai region là nguyên nhân phổ biến gây lỗi PermanentRedirect.',
  },
  {
    key: 'endpoint',
    label: 'Endpoint',
    type: 'text',
    placeholder: 'https://...',
    help: 'Chỉ cần nhập với MinIO / IDrive e2 / dịch vụ tự dựng. Các dịch vụ khác để trống, hệ thống tự ghép endpoint. Có nhập thì giá trị này được ưu tiên.',
  },
  {
    key: 'access_key_id',
    label: 'Access Key ID',
    type: 'text',
    required: true,
    help: 'Phần công khai của cặp key. Backblaze B2 gọi là keyID, Tencent COS gọi là SecretId.',
  },
  {
    key: 'secret_access_key',
    label: 'Secret Access Key',
    type: 'password',
    required: true,
    secret: true,
    help: 'Phần bí mật của cặp key. Backblaze B2 gọi là applicationKey, Tencent COS gọi là SecretKey. Hầu hết dịch vụ chỉ cho xem một lần khi tạo.',
  },
  {
    key: 'force_path_style',
    label: 'Dùng path-style URL',
    type: 'boolean',
    help: 'Bật với MinIO, Contabo, Supabase, Oracle. Để trống sẽ lấy mặc định theo dịch vụ. Nếu báo lỗi không tìm thấy bucket dù tên đúng, thử bật ô này.',
  },
  // Các biến riêng của từng preset
  ...S3_PRESETS.flatMap(preset =>
    (preset.vars || []).map(field => ({
      ...field,
      showIf: { key: 'preset', in: [preset.id] },
    })),
  ),
]

export const STORAGE_DRIVER_SCHEMAS: StorageDriverSchema[] = [
  {
    driver: StorageDriver.S3,
    label: 'S3 / tương thích S3',
    description:
      'Một driver dùng chung cho hơn 20 dịch vụ nói giao thức S3: Cloudflare R2, Amazon S3, Backblaze B2, Wasabi, DigitalOcean Spaces, Hetzner, Contabo, Vultr, Scaleway, Akamai/Linode, Storj, Supabase, Google Cloud Storage (HMAC), Alibaba OSS, Tencent COS, Oracle, IDrive e2, OVH, Exoscale, MinIO...',
    docsUrl: 'https://docs.aws.amazon.com/AmazonS3/latest/API/Type_API_Reference.html',
    capabilities: { quotaApi: false, listing: true, signedUrl: true, publicUrl: true, realFolders: false, move: true },
    fields: S3_FIELDS,
  },
  {
    driver: StorageDriver.LOCAL,
    label: 'Ổ đĩa máy chủ (Local)',
    description: 'Lưu thẳng vào thư mục trên máy chủ. Dung lượng còn lại đọc trực tiếp từ phân vùng ổ đĩa.',
    docsUrl: 'https://nodejs.org/api/fs.html#fsstatfspath-options-callback',
    capabilities: { quotaApi: true, listing: true, signedUrl: false, publicUrl: true, realFolders: true, move: true },
    fields: [
      {
        key: 'root_path',
        label: 'Đường dẫn thư mục',
        type: 'text',
        required: true,
        placeholder: '/usr/app/storage',
        help: 'Đường dẫn tuyệt đối trên máy chủ. Chạy Docker thì dùng đường dẫn bên trong container, và thư mục đó phải được gắn volume ra ngoài kẻo mất file khi deploy lại.',
      },
      {
        key: 'public_base_url',
        label: 'URL công khai',
        type: 'text',
        required: true,
        placeholder: 'https://file.example.com',
        help: 'Domain hoặc đường dẫn web đang trỏ tới thư mục trên (cấu hình ở Nginx). Thiếu ô này thì file lưu được nhưng không có link để hiển thị.',
      },
    ],
  },
  {
    driver: StorageDriver.CLOUDINARY,
    label: 'Cloudinary',
    description: 'Dịch vụ ảnh/video kèm CDN và transform. Dung lượng đọc từ Admin API /usage.',
    docsUrl: 'https://cloudinary.com/documentation/admin_api#usage',
    capabilities: { quotaApi: true, listing: true, signedUrl: false, publicUrl: true, realFolders: true, move: true },
    fields: [
      {
        key: 'cloud_name',
        label: 'Cloud name',
        type: 'text',
        required: true,
        help: 'Lấy ở Cloudinary Console > Dashboard, phần "Product Environment Credentials".',
      },
      {
        key: 'api_key',
        label: 'API Key',
        type: 'text',
        required: true,
        help: 'Cùng chỗ với Cloud name. Là dãy số, không phải API Secret.',
      },
      {
        key: 'api_secret',
        label: 'API Secret',
        type: 'password',
        required: true,
        secret: true,
        help: 'Cùng chỗ với Cloud name, bấm vào biểu tượng con mắt để hiện ra.',
      },
      {
        key: 'folder',
        label: 'Thư mục gốc',
        type: 'text',
        placeholder: 'hvm',
        help: 'Mọi file sẽ nằm trong thư mục này trên Cloudinary. Để trống thì file nằm ở gốc.',
      },
    ],
  },
  {
    driver: StorageDriver.GOOGLE_DRIVE,
    label: 'Google Drive',
    description:
      'Hai cách xác thực: (1) OAuth refresh token của một Google account thật, chạy được cả Gmail miễn phí; (2) Service account ghi vào Shared Drive - file trong Shared Drive thuộc về tổ chức nên service account ghi được, cách này cần Google Workspace. Dung lượng đọc từ about.get.',
    docsUrl: 'https://developers.google.com/workspace/drive/api/reference/rest/v3/about',
    capabilities: { quotaApi: true, listing: true, signedUrl: false, publicUrl: true, realFolders: true, move: true },
    fields: [
      {
        key: 'auth_mode',
        label: 'Cách xác thực',
        type: 'select',
        required: true,
        options: [
          { value: GoogleDriveAuthMode.OAUTH, label: 'OAuth refresh token (Gmail thường dùng được)' },
          { value: GoogleDriveAuthMode.SERVICE_ACCOUNT, label: 'Service account + Shared Drive (cần Workspace)' },
        ],
      },
      {
        key: 'client_id',
        label: 'OAuth Client ID',
        type: 'text',
        required: true,
        placeholder: '....apps.googleusercontent.com',
        help: 'Google Cloud Console > APIs & Services > Credentials > OAuth client ID (kiểu Web application).',
        showIf: { key: 'auth_mode', in: [GoogleDriveAuthMode.OAUTH] },
      },
      {
        key: 'client_secret',
        label: 'OAuth Client Secret',
        type: 'password',
        required: true,
        secret: true,
        help: 'Hiện cùng chỗ với Client ID, trong chi tiết OAuth client vừa tạo.',
        showIf: { key: 'auth_mode', in: [GoogleDriveAuthMode.OAUTH] },
      },
      {
        key: 'refresh_token',
        label: 'Refresh token',
        type: 'password',
        required: true,
        secret: true,
        help: 'Bấm "Kết nối Google" để hệ thống tự lấy. Nếu tự lấy tay thì nhớ dùng access_type=offline, không thì Google không trả refresh token.',
        showIf: { key: 'auth_mode', in: [GoogleDriveAuthMode.OAUTH] },
      },
      {
        key: 'service_account_json',
        label: 'Service account JSON',
        type: 'textarea',
        required: true,
        secret: true,
        help: 'Dán nguyên nội dung file JSON tải ở Credentials > Service account > tab Keys > Add key > JSON. Phải có client_email và private_key.',
        showIf: { key: 'auth_mode', in: [GoogleDriveAuthMode.SERVICE_ACCOUNT] },
      },
      {
        key: 'impersonate_subject',
        label: 'Email user cần impersonate',
        type: 'text',
        placeholder: 'admin@truong-cua-ban.edu.vn',
        help: 'Chỉ dùng khi đã bật domain-wide delegation trong Google Workspace Admin. Để trống thì service account ghi thẳng vào Shared Drive.',
        showIf: { key: 'auth_mode', in: [GoogleDriveAuthMode.SERVICE_ACCOUNT] },
      },
      {
        key: 'shared_drive_id',
        label: 'Shared Drive ID',
        type: 'text',
        help: 'Mở Shared Drive trên web, ID là đoạn sau /drive/folders/ trong URL. Bắt buộc khi dùng service account mà không impersonate, vì service account không có dung lượng riêng. Nhớ chia sẻ Shared Drive cho email service account với quyền Content manager.',
      },
      {
        key: 'root_folder_id',
        label: 'Folder gốc',
        type: 'text',
        help: 'ID folder sẽ chứa file upload, lấy từ URL khi mở folder đó (đoạn sau /folders/). Để trống thì dùng gốc của Drive / Shared Drive.',
      },
    ],
  },
  {
    driver: StorageDriver.DROPBOX,
    label: 'Dropbox',
    description: 'Dùng OAuth refresh token. Dung lượng đọc từ /2/users/get_space_usage.',
    docsUrl: 'https://www.dropbox.com/developers/documentation/http/documentation#users-get_space_usage',
    capabilities: { quotaApi: true, listing: true, signedUrl: false, publicUrl: true, realFolders: true, move: true },
    fields: [
      {
        key: 'app_key',
        label: 'App key',
        type: 'text',
        required: true,
        help: 'Dropbox App Console > app của bạn > tab Settings > "App key".',
      },
      {
        key: 'app_secret',
        label: 'App secret',
        type: 'password',
        required: true,
        secret: true,
        help: 'Ngay dưới App key, bấm "Show" để hiện ra.',
      },
      {
        key: 'refresh_token',
        label: 'Refresh token',
        type: 'password',
        required: true,
        secret: true,
        help: 'Lấy bằng luồng OAuth có token_access_type=offline. Xem hướng dẫn từng bước ở trên. Trước đó phải bật đủ 4 quyền ở tab Permissions.',
      },
      {
        key: 'root_path',
        label: 'Thư mục gốc',
        type: 'text',
        placeholder: '/hvm',
        help: 'Mọi file sẽ nằm trong thư mục này. Để trống thì file nằm ở gốc Dropbox (hoặc gốc App folder nếu app kiểu App folder).',
      },
    ],
  },
  {
    driver: StorageDriver.ONEDRIVE,
    label: 'OneDrive / SharePoint',
    description: 'Qua Microsoft Graph. Dung lượng đọc từ quota của drive (total / used / remaining / state).',
    docsUrl: 'https://learn.microsoft.com/en-us/graph/api/resources/quota',
    capabilities: { quotaApi: true, listing: true, signedUrl: false, publicUrl: true, realFolders: true, move: true },
    fields: [
      {
        key: 'tenant_id',
        label: 'Tenant ID',
        type: 'text',
        required: true,
        placeholder: 'common',
        help: 'Tài khoản Microsoft cá nhân thì điền "common". Tài khoản tổ chức thì dùng "Directory (tenant) ID" ở trang Overview của app registration.',
      },
      {
        key: 'client_id',
        label: 'Client ID',
        type: 'text',
        required: true,
        help: 'Azure Portal > Microsoft Entra ID > App registrations > app của bạn > Overview > "Application (client) ID".',
      },
      {
        key: 'client_secret',
        label: 'Client secret',
        type: 'password',
        required: true,
        secret: true,
        help: 'Certificates & secrets > New client secret. Copy cột "Value" (không phải "Secret ID"), và nhớ secret có ngày hết hạn.',
      },
      {
        key: 'refresh_token',
        label: 'Refresh token',
        type: 'password',
        secret: true,
        help: 'Dùng cho OneDrive cá nhân/doanh nghiệp, lấy bằng luồng OAuth với scope "offline_access Files.ReadWrite.All". Nếu chạy app-only (SharePoint) thì để trống ô này và điền Drive ID.',
      },
      {
        key: 'drive_id',
        label: 'Drive ID',
        type: 'text',
        help: 'Để trống sẽ dùng /me/drive của user ứng với refresh token. Chế độ app-only bắt buộc phải điền: lấy bằng Graph Explorer qua /sites/{site-id}/drives.',
      },
      {
        key: 'root_path',
        label: 'Thư mục gốc',
        type: 'text',
        placeholder: 'hvm',
        help: 'Mọi file sẽ nằm trong thư mục này. Để trống thì file nằm ở gốc drive.',
      },
    ],
  },
  {
    driver: StorageDriver.AZURE_BLOB,
    label: 'Azure Blob Storage',
    description:
      'Xác thực bằng SAS token nên chỉ cần dán, không phải cấu hình gì thêm. Azure không có API quota nên dung lượng được cộng dồn từ danh sách blob.',
    docsUrl: 'https://learn.microsoft.com/en-us/rest/api/storageservices/list-blobs',
    capabilities: { quotaApi: false, listing: true, signedUrl: true, publicUrl: true, realFolders: false, move: true },
    fields: [
      {
        key: 'account_name',
        label: 'Storage account',
        type: 'text',
        required: true,
        placeholder: 'mystorageaccount',
        help: 'Tên storage account trong Azure Portal, là phần đầu của <account>.blob.core.windows.net.',
      },
      {
        key: 'container',
        label: 'Container',
        type: 'text',
        required: true,
        help: 'Tên container trong Storage account > Data storage > Containers.',
      },
      {
        key: 'sas_token',
        label: 'SAS token',
        type: 'password',
        required: true,
        secret: true,
        help: 'Mở container > "Shared access tokens", tích đủ Read + Write + Delete + List, đặt thời hạn dài rồi Generate. Copy phần "Blob SAS token". Dán kèm dấu ? ở đầu cũng được.',
      },
    ],
  },
  {
    driver: StorageDriver.BUNNY,
    label: 'Bunny.net Edge Storage',
    description: 'Chỉ cần AccessKey của storage zone. Dung lượng đọc từ API /storagezone/{id}/statistics.',
    docsUrl: 'https://docs.bunny.net/reference/storagezonepublic_storagezonestatistics',
    capabilities: { quotaApi: true, listing: true, signedUrl: false, publicUrl: true, realFolders: true, move: false },
    fields: [
      {
        key: 'storage_zone',
        label: 'Tên storage zone',
        type: 'text',
        required: true,
        help: 'Tên storage zone trong Bunny Dashboard > Storage.',
      },
      {
        key: 'access_key',
        label: 'Storage zone password',
        type: 'password',
        required: true,
        secret: true,
        help: 'Mở storage zone > "FTP & API Access" > ô Password. Đây là key để đọc ghi file, khác với Account API key.',
      },
      {
        key: 'hostname',
        label: 'Hostname',
        type: 'text',
        placeholder: 'storage.bunnycdn.com',
        help: 'Hiện ngay ở trang "FTP & API Access", đổi theo region của zone: storage.bunnycdn.com (Đức), sg.storage.bunnycdn.com (Singapore), ny.storage.bunnycdn.com (New York)... Sai hostname sẽ báo không tìm thấy zone.',
      },
      {
        key: 'account_api_key',
        label: 'Account API key (không bắt buộc)',
        type: 'password',
        secret: true,
        help: 'Account Settings > API. Có key này mới đọc được dung lượng từ API Bunny; không có thì hệ thống phải đếm từng file nên chậm hơn.',
      },
      {
        key: 'root_path',
        label: 'Thư mục gốc',
        type: 'text',
        help: 'Mọi file sẽ nằm trong thư mục này trong storage zone. Để trống thì file nằm ở gốc.',
      },
    ],
  },
  {
    driver: StorageDriver.HVM,
    label: 'HVM Storage (kho video/file tự host)',
    description:
      'Kho video/file của giáo xứ tại app.hvmvsaigon.edu.vn. Backend gọi /api/integration/* bằng API key; trình duyệt upload thẳng lên kho bằng hub token. Video phát qua trang nhúng, ảnh/tài liệu có link trực tiếp.',
    docsUrl: 'https://app.hvmvsaigon.edu.vn/admin/integrations',
    capabilities: { quotaApi: true, listing: true, signedUrl: true, publicUrl: true, realFolders: true, move: true },
    fields: [
      {
        key: 'base_url',
        label: 'URL hvm-storage',
        type: 'text',
        required: true,
        placeholder: 'https://app.hvmvsaigon.edu.vn',
        help: 'Địa chỉ app của hvm-storage (không phải domain video). Không có dấu / ở cuối.',
      },
      {
        key: 'api_key',
        label: 'API key',
        type: 'password',
        required: true,
        secret: true,
        placeholder: 'hvmk_academy_...',
        help: 'Lấy ở /admin/integrations trên hvm-storage, chỉ hiện một lần lúc tạo hoặc xoay key.',
      },
      {
        key: 'folder_path',
        label: 'Thư mục con (không bắt buộc)',
        type: 'text',
        placeholder: 'academy',
        help: 'Đường dẫn con bên trong thư mục gốc mà hvm-storage đã gán cho ứng dụng. Để trống thì file nằm ngay ở thư mục gốc đó.',
      },
      {
        key: 'default_visibility',
        label: 'Chế độ hiển thị cho file mới',
        type: 'select',
        options: [
          { value: '', label: 'Theo mặc định của ứng dụng trên hvm-storage' },
          { value: 'PUBLIC', label: 'PUBLIC - ai có link cũng xem được' },
          { value: 'DOMAIN_LOCKED', label: 'DOMAIN_LOCKED - chỉ nhúng được trên domain cho phép' },
          { value: 'UNLISTED', label: 'UNLISTED - chỉ xem qua link có chữ ký' },
          { value: 'PRIVATE', label: 'PRIVATE - chỉ xem qua link có chữ ký' },
        ],
        help: 'Ảnh dùng với next/image nên để PUBLIC vì trình tối ưu ảnh của Next không gửi Referer.',
      },
    ],
  },
]

export const STORAGE_DRIVER_SCHEMA_MAP = new Map(STORAGE_DRIVER_SCHEMAS.map(s => [s.driver, s]))

/** Giá trị trả ra thay cho secret thật. Client gửi lại đúng chuỗi này = giữ secret cũ. */
export const SECRET_MASK = '••••••••'

export const DOCUMENT_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/rtf',
])

export const ARCHIVE_MIMES = new Set([
  'application/zip',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/x-7z-compressed',
  'application/gzip',
  'application/x-tar',
])

/** Ngưỡng % dùng để coi một dịch vụ là "gần đầy" khi chia tải kiểu priority_fill. */
export const DEFAULT_FILL_THRESHOLD_PERCENT = 95

/* ------------------------------------------------------------------ *
 *  LẮP HƯỚNG DẪN VÀO SCHEMA
 *  Để riêng ở đây cho phần định nghĩa phía trên khỏi dài và khó đọc.
 *  Driver S3 dùng chung một bộ ô nhập nhưng mỗi dịch vụ lấy key một chỗ
 *  khác nhau, nên hướng dẫn thật nằm ở từng preset.
 * ------------------------------------------------------------------ */
for (const preset of S3_PRESETS) {
  preset.guide = S3_PRESET_GUIDES[preset.id]
}

for (const schema of STORAGE_DRIVER_SCHEMAS) {
  schema.guide = DRIVER_GUIDES[schema.driver]
}

/** Nhãn hiển thị cho từng chiến lược chia tải. */
export const STRATEGY_LABELS: Record<string, string> = {
  most_free: 'Còn trống nhiều nhất',
  priority_fill: 'Ưu tiên lấp đầy',
  weighted_round_robin: 'Round-robin theo trọng số',
  single_default: 'Chỉ dùng 1 dịch vụ mặc định',
}
