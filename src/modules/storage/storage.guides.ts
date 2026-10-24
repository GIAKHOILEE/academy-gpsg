import { StorageDriver } from '@enums/storage.enum'

/** Một bước trong hướng dẫn lấy thông tin cấu hình. */
export interface StorageSetupStep {
  /** Việc cần làm, viết ngắn như một câu lệnh */
  text: string
  /** Link mở trực tiếp trang cần vào, nếu có */
  url?: string
}

export interface StorageSetupGuide {
  /** Tên dịch vụ hiển thị ở đầu phần hướng dẫn */
  title: string
  /** Các bước làm, theo đúng thứ tự */
  steps: StorageSetupStep[]
  /** Những điều dễ sai, hiện dạng cảnh báo */
  warnings?: string[]
  /** Hướng dẫn riêng cho ô "URL công khai" */
  publicUrlHint?: string
}

/* ------------------------------------------------------------------ *
 *  HƯỚNG DẪN CHO TỪNG PRESET S3
 *  Các dịch vụ S3 dùng chung một bộ ô nhập, nhưng chỗ lấy key ở mỗi
 *  dịch vụ lại khác nhau, nên hướng dẫn phải tách theo preset.
 * ------------------------------------------------------------------ */
export const S3_PRESET_GUIDES: Record<string, StorageSetupGuide> = {
  cloudflare_r2: {
    title: 'Cloudflare R2',
    steps: [
      { text: 'Đăng nhập Cloudflare Dashboard, vào mục R2 Object Storage.', url: 'https://dash.cloudflare.com/?to=/:account/r2' },
      { text: 'Ở trang Overview, cột bên phải có "Account ID" - copy vào ô Account ID.' },
      { text: 'Bấm "Create bucket", đặt tên rồi copy tên đó vào ô Bucket. Nếu đã có bucket thì dùng luôn.' },
      { text: 'Vẫn trong mục R2, bấm "Manage R2 API tokens" rồi "Create API token".' },
      { text: 'Chọn quyền "Object Read & Write", chọn bucket vừa tạo, rồi bấm "Create API Token".' },
      {
        text: 'Copy "Access Key ID" và "Secret Access Key" vào 2 ô tương ứng. Phải copy ngay, Cloudflare không cho xem lại Secret lần thứ hai.',
      },
      {
        text: 'Không bắt buộc: muốn hệ thống đọc được dung lượng chính xác thì vào My Profile > API Tokens, tạo token có quyền "Workers R2 Storage: Read" và dán vào ô Cloudflare API Token.',
        url: 'https://dash.cloudflare.com/profile/api-tokens',
      },
    ],
    warnings: [
      'Region của R2 luôn là "auto", cứ để trống ô Region.',
      'Token R2 API (Access Key / Secret) khác với Cloudflare API Token. Cái đầu để đọc ghi file, cái sau chỉ để xem dung lượng.',
    ],
    publicUrlHint:
      'Vào bucket > Settings > Public access. Bật "R2.dev subdomain" để lấy link dạng https://pub-xxxx.r2.dev, hoặc gắn Custom Domain của bạn. Copy link đó vào ô URL công khai. Không điền thì file upload lên sẽ không có link xem trực tiếp.',
  },

  aws_s3: {
    title: 'Amazon S3',
    steps: [
      { text: 'Vào AWS Console > S3, bấm "Create bucket", đặt tên và chọn Region.', url: 'https://s3.console.aws.amazon.com/s3/buckets' },
      { text: 'Copy tên bucket vào ô Bucket, và mã Region (ví dụ ap-southeast-1) vào ô Region.' },
      { text: 'Vào IAM > Users > Create user.', url: 'https://console.aws.amazon.com/iam/home#/users' },
      {
        text: 'Gắn quyền cho user: dùng nhanh thì chọn policy AmazonS3FullAccess; chặt chẽ hơn thì tạo policy riêng chỉ cho phép s3:GetObject, s3:PutObject, s3:DeleteObject, s3:ListBucket trên đúng bucket đó.',
      },
      { text: 'Mở user vừa tạo > tab "Security credentials" > "Create access key" > chọn "Application running outside AWS".' },
      { text: 'Copy "Access key" và "Secret access key" vào 2 ô tương ứng.' },
    ],
    warnings: [
      'Region phải khớp đúng với region của bucket, sai region sẽ báo lỗi PermanentRedirect.',
      'Bucket AWS mặc định chặn truy cập công khai. Muốn có link xem trực tiếp thì phải tắt "Block all public access" và thêm bucket policy cho phép s3:GetObject, hoặc để trống URL công khai và dùng link tải tạm thời.',
    ],
    publicUrlHint:
      'Nếu bucket đã mở công khai, điền https://<ten-bucket>.s3.<region>.amazonaws.com. Nếu dùng CloudFront thì điền domain CloudFront. Để trống nếu bucket là riêng tư.',
  },

  backblaze_b2: {
    title: 'Backblaze B2',
    steps: [
      { text: 'Đăng nhập Backblaze, vào B2 Cloud Storage > Buckets, bấm "Create a Bucket".', url: 'https://secure.backblaze.com/b2_buckets.htm' },
      {
        text: 'Trong danh sách bucket, dòng "Endpoint" có dạng s3.us-west-004.backblazeb2.com. Phần giữa (us-west-004) chính là Region, copy vào ô Region.',
      },
      { text: 'Vào Application Keys, bấm "Add a New Application Key".', url: 'https://secure.backblaze.com/app_keys.htm' },
      { text: 'Chọn bucket cần dùng và quyền "Read and Write", rồi bấm "Create New Key".' },
      { text: 'Giá trị "keyID" dán vào ô Access Key ID, "applicationKey" dán vào ô Secret Access Key.' },
    ],
    warnings: [
      'applicationKey chỉ hiện một lần duy nhất, copy ngay.',
      'Một tài khoản B2 chỉ thuộc đúng một region, không tạo được bucket ở region khác.',
    ],
    publicUrlHint:
      'Bucket phải được đặt ở chế độ Public. Link có dạng https://f004.backblazeb2.com/file/<ten-bucket> (số f00x lấy theo endpoint của bạn), hoặc domain CDN nếu bạn đã gắn.',
  },

  wasabi: {
    title: 'Wasabi',
    steps: [
      { text: 'Đăng nhập Wasabi Console, vào Buckets > Create Bucket, chọn Region.', url: 'https://console.wasabisys.com/' },
      { text: 'Copy tên bucket vào ô Bucket, mã region (ví dụ us-east-1, ap-southeast-1) vào ô Region.' },
      { text: 'Vào Access Keys > "Create New Access Key", chọn Root User hoặc một sub-user có quyền trên bucket.' },
      { text: 'Copy Access Key và Secret Key vào 2 ô tương ứng.' },
    ],
    warnings: ['Region phải khớp region bucket, nếu không sẽ không kết nối được.'],
    publicUrlHint: 'Bucket cần được set public. Link dạng https://s3.<region>.wasabisys.com/<ten-bucket>.',
  },

  do_spaces: {
    title: 'DigitalOcean Spaces',
    steps: [
      {
        text: 'Vào DigitalOcean > Spaces Object Storage, bấm "Create Spaces Bucket", chọn datacenter.',
        url: 'https://cloud.digitalocean.com/spaces',
      },
      { text: 'Mã datacenter (sgp1, nyc3, fra1...) chính là Region, copy vào ô Region. Tên Space copy vào ô Bucket.' },
      { text: 'Vào API > Spaces Keys > "Generate New Key".', url: 'https://cloud.digitalocean.com/account/api/spaces' },
      { text: 'Copy Key (Access Key) và Secret vào 2 ô tương ứng.' },
    ],
    publicUrlHint:
      'Vào Space > Settings, phần File Listing đặt Public nếu muốn truy cập trực tiếp. Link dạng https://<ten-space>.<region>.digitaloceanspaces.com, hoặc domain CDN nếu đã bật CDN.',
  },

  linode: {
    title: 'Akamai / Linode Object Storage',
    steps: [
      { text: 'Vào Akamai Cloud Manager > Object Storage > Create Bucket, chọn region.', url: 'https://cloud.linode.com/object-storage/buckets' },
      { text: 'Copy tên bucket vào ô Bucket, mã region (us-east-1, eu-central-1...) vào ô Region.' },
      { text: 'Sang tab "Access Keys" > "Create Access Key", chọn quyền Read/Write cho bucket đó.' },
      { text: 'Copy Access Key và Secret Key vào 2 ô tương ứng.' },
    ],
    publicUrlHint: 'Link dạng https://<ten-bucket>.<region>.linodeobjects.com.',
  },

  vultr: {
    title: 'Vultr Object Storage',
    steps: [
      { text: 'Vào Vultr Customer Portal > Objects, tạo Object Storage rồi tạo bucket bên trong.', url: 'https://my.vultr.com/objects/' },
      { text: 'Mở Object Storage vừa tạo, tab "Overview" có sẵn Hostname, Access Key và Secret Key.' },
      { text: 'Lấy phần đầu hostname (ví dụ sgp1 trong sgp1.vultrobjects.com) điền vào ô Region.' },
      { text: 'Copy Access Key và Secret Key vào 2 ô tương ứng, tên bucket vào ô Bucket.' },
    ],
    publicUrlHint: 'Bucket cần được set public. Link dạng https://<region>.vultrobjects.com/<ten-bucket>.',
  },

  scaleway: {
    title: 'Scaleway Object Storage',
    steps: [
      { text: 'Vào Scaleway Console > Object Storage > Create bucket, chọn region.', url: 'https://console.scaleway.com/object-storage/buckets' },
      { text: 'Copy tên bucket vào ô Bucket, mã region (fr-par, nl-ams, pl-waw) vào ô Region.' },
      { text: 'Vào IAM > API keys > "Generate an API key".', url: 'https://console.scaleway.com/iam/api-keys' },
      { text: 'Copy "Access key" và "Secret key" vào 2 ô tương ứng.' },
    ],
    publicUrlHint: 'Link dạng https://<ten-bucket>.s3.<region>.scw.cloud.',
  },

  hetzner: {
    title: 'Hetzner Object Storage',
    steps: [
      { text: 'Vào Hetzner Cloud Console > project > Object Storage, tạo bucket và chọn location.', url: 'https://console.hetzner.cloud/' },
      { text: 'Mã location (fsn1, nbg1, hel1) điền vào ô Region, tên bucket vào ô Bucket.' },
      { text: 'Vào Security > S3 credentials > "Generate credentials".' },
      { text: 'Copy Access Key và Secret Key vào 2 ô tương ứng.' },
    ],
    publicUrlHint: 'Bucket phải đặt ở chế độ public. Link dạng https://<ten-bucket>.<region>.your-objectstorage.com.',
  },

  contabo: {
    title: 'Contabo Object Storage',
    steps: [
      { text: 'Vào Contabo Customer Control Panel > Object Storage.', url: 'https://my.contabo.com/object-storage' },
      { text: 'Mục "S3 Credentials" có sẵn Access Key và Secret Key, copy vào 2 ô tương ứng.' },
      { text: 'Phần đầu của URL endpoint Contabo cấp (ví dụ eu2 trong eu2.contabostorage.com) điền vào ô Region.' },
      { text: 'Tạo bucket trong panel rồi copy tên vào ô Bucket.' },
    ],
    warnings: ['Contabo chỉ hỗ trợ path-style URL, ô "Dùng path-style URL" phải để bật (mặc định đã bật).'],
    publicUrlHint: 'Link dạng https://<region>.contabostorage.com/<account-id>:<ten-bucket>, lấy đúng theo panel Contabo.',
  },

  gcs: {
    title: 'Google Cloud Storage (chế độ tương thích S3)',
    steps: [
      { text: 'Vào Google Cloud Console > Cloud Storage > Buckets, tạo bucket.', url: 'https://console.cloud.google.com/storage/browser' },
      { text: 'Copy tên bucket vào ô Bucket.' },
      {
        text: 'Vào Cloud Storage > Settings > tab Interoperability.',
        url: 'https://console.cloud.google.com/storage/settings;tab=interoperability',
      },
      { text: 'Phần "Service account HMAC", bấm "Create a key", chọn service account có quyền Storage Object Admin trên bucket.' },
      { text: 'Copy "Access key" và "Secret" vào 2 ô tương ứng.' },
    ],
    warnings: [
      'Phải dùng HMAC key, không dùng được file JSON service account ở đây.',
      'Cứ để trống ô Region, GCS dùng endpoint chung storage.googleapis.com.',
    ],
    publicUrlHint:
      'Muốn công khai thì cấp role "Storage Object Viewer" cho allUsers trên bucket, rồi điền https://storage.googleapis.com/<ten-bucket>.',
  },

  supabase: {
    title: 'Supabase Storage',
    steps: [
      { text: 'Vào Supabase Dashboard > project > Storage, tạo bucket và copy tên vào ô Bucket.', url: 'https://supabase.com/dashboard' },
      { text: 'Vào Project Settings > Storage, phần "S3 Connection".' },
      { text: 'Copy mã project ref (chuỗi trong URL dashboard, ví dụ abcdefghijklmnop) vào ô Project ref.' },
      { text: 'Copy đúng Region hiện ở đó vào ô Region.' },
      { text: 'Bấm "New access key" để tạo cặp key, rồi copy Access key ID và Secret access key vào 2 ô tương ứng.' },
    ],
    warnings: [
      'Không thêm tên bucket vào endpoint, phần /storage/v1/s3 phải giữ nguyên.',
      'Supabase chỉ hỗ trợ path-style, ô "Dùng path-style URL" phải bật.',
    ],
    publicUrlHint: 'Nếu bucket được đặt là Public, link dạng https://<project-ref>.supabase.co/storage/v1/object/public/<ten-bucket>.',
  },

  storj: {
    title: 'Storj',
    steps: [
      { text: 'Vào Storj Console, tạo bucket trong project.', url: 'https://eu1.storj.io/' },
      { text: 'Vào Access > "Create Access Key", chọn kiểu "S3 Credentials".' },
      { text: 'Chọn quyền Read/Write trên bucket rồi tạo.' },
      { text: 'Copy Access Key và Secret Key vào 2 ô tương ứng, tên bucket vào ô Bucket.' },
    ],
    warnings: ['Storj dùng gateway chung gateway.storjshare.io, cứ để trống ô Region và Endpoint.'],
    publicUrlHint: 'Storj cần tạo "Share link" riêng cho từng object, nên thường để trống ô này và dùng link tải tạm thời.',
  },

  alibaba_oss: {
    title: 'Alibaba Cloud OSS',
    steps: [
      { text: 'Vào OSS Console, tạo Bucket và chọn Region.', url: 'https://oss.console.aliyun.com/' },
      { text: 'Mã region không có tiền tố oss- (ví dụ ap-southeast-1) điền vào ô Region.' },
      { text: 'Vào RAM Console > Users, tạo user và gắn quyền AliyunOSSFullAccess.', url: 'https://ram.console.aliyun.com/users' },
      { text: 'Tạo AccessKey cho user đó, copy AccessKey ID và AccessKey Secret vào 2 ô tương ứng.' },
    ],
    publicUrlHint: 'Bucket cần ACL public-read. Link dạng https://<ten-bucket>.oss-<region>.aliyuncs.com.',
  },

  tencent_cos: {
    title: 'Tencent Cloud COS',
    steps: [
      { text: 'Vào COS Console, tạo Bucket, chọn Region.', url: 'https://console.cloud.tencent.com/cos' },
      { text: 'Mã region (ap-singapore, ap-hongkong...) điền vào ô Region.' },
      { text: 'Tên bucket COS có dạng <ten>-<appid>, copy đầy đủ cả phần -<appid> vào ô Bucket.' },
      {
        text: 'Vào CAM > API Keys, tạo key rồi copy SecretId vào ô Access Key ID, SecretKey vào ô Secret Access Key.',
        url: 'https://console.cloud.tencent.com/cam/capi',
      },
    ],
    warnings: ['Tên bucket bắt buộc có hậu tố -<appid>, thiếu phần này sẽ không tìm thấy bucket.'],
    publicUrlHint: 'Link dạng https://<ten-bucket-appid>.cos.<region>.myqcloud.com nếu bucket đặt public read.',
  },

  oracle_oci: {
    title: 'Oracle Cloud Object Storage',
    steps: [
      { text: 'Vào OCI Console > Storage > Buckets, tạo bucket.', url: 'https://cloud.oracle.com/object-storage/buckets' },
      { text: 'Vào Profile > Tenancy, copy "Object Storage Namespace" vào ô Object Storage Namespace.' },
      { text: 'Mã region (ap-singapore-1, us-ashburn-1...) điền vào ô Region.' },
      { text: 'Vào Profile > My profile > Customer secret keys > "Generate secret key".' },
      { text: 'Copy Access Key hiện ra vào ô Access Key ID, và Secret Key vào ô Secret Access Key.' },
    ],
    warnings: ['Oracle chỉ hỗ trợ path-style, ô "Dùng path-style URL" phải bật.'],
    publicUrlHint: 'Bucket cần đặt Visibility là Public. Link dạng https://objectstorage.<region>.oraclecloud.com/n/<namespace>/b/<ten-bucket>/o.',
  },

  idrive_e2: {
    title: 'IDrive e2',
    steps: [
      { text: 'Vào IDrive e2 Dashboard, tạo bucket và copy tên vào ô Bucket.', url: 'https://app.idrivee2.com/' },
      { text: 'Trong trang bucket, copy nguyên endpoint IDrive cấp (dạng https://xxxx.va.idrivee2-xx.com) vào ô Endpoint.' },
      { text: 'Vào Access Keys > "Create Access Key".' },
      { text: 'Copy Access Key ID và Secret Access Key vào 2 ô tương ứng.' },
    ],
    warnings: ['IDrive e2 cấp endpoint riêng cho từng tài khoản, bắt buộc phải nhập ô Endpoint.'],
    publicUrlHint: 'Bật public access cho bucket rồi điền link mà IDrive hiển thị trong phần bucket settings.',
  },

  ovh: {
    title: 'OVHcloud Object Storage',
    steps: [
      { text: 'Vào OVHcloud Manager > Public Cloud > Object Storage, tạo container kiểu S3.', url: 'https://www.ovh.com/manager/' },
      { text: 'Mã region (gra, sbg, bhs...) viết chữ thường điền vào ô Region.' },
      { text: 'Vào Users & Roles, tạo user với quyền ObjectStore operator, rồi tạo S3 credentials cho user đó.' },
      { text: 'Copy Access Key ID và Secret Access Key vào 2 ô tương ứng.' },
    ],
    publicUrlHint: 'Link dạng https://<ten-bucket>.s3.<region>.io.cloud.ovh.net nếu container đặt public.',
  },

  exoscale: {
    title: 'Exoscale SOS',
    steps: [
      { text: 'Vào Exoscale Portal > Storage, tạo bucket và chọn zone.', url: 'https://portal.exoscale.com/storage' },
      { text: 'Mã zone (ch-gva-2, de-fra-1...) điền vào ô Region.' },
      { text: 'Vào IAM > API Keys, tạo key có quyền trên SOS.' },
      { text: 'Copy API Key vào ô Access Key ID, API Secret vào ô Secret Access Key.' },
    ],
    publicUrlHint: 'Link dạng https://sos-<zone>.exo.io/<ten-bucket> nếu bucket đặt public read.',
  },

  minio: {
    title: 'MinIO / Ceph / server tự dựng',
    steps: [
      { text: 'Mở MinIO Console của bạn, tạo bucket rồi copy tên vào ô Bucket.' },
      { text: 'Điền địa chỉ server vào ô Endpoint, kèm cả cổng nếu có, ví dụ https://minio.example.com:9000.' },
      { text: 'Vào Access Keys > "Create access key" trong MinIO Console.' },
      { text: 'Copy Access Key và Secret Key vào 2 ô tương ứng.' },
    ],
    warnings: [
      'Bắt buộc phải nhập ô Endpoint.',
      'MinIO chỉ hỗ trợ path-style, ô "Dùng path-style URL" phải bật.',
      'Endpoint phải là https và chứng chỉ hợp lệ, nếu không request sẽ bị từ chối.',
    ],
    publicUrlHint: 'Đặt policy của bucket là public download rồi điền https://<endpoint>/<ten-bucket>, hoặc domain reverse proxy bạn dùng.',
  },

  custom: {
    title: 'Dịch vụ S3 khác',
    steps: [
      { text: 'Lấy endpoint, tên bucket, region (nếu dịch vụ đó dùng), Access Key và Secret Key từ dịch vụ của bạn.' },
      { text: 'Điền endpoint đầy đủ kèm https:// vào ô Endpoint.' },
      { text: 'Bấm "Kiểm tra kết nối" trước khi lưu để chắc chắn cấu hình đúng.' },
    ],
    warnings: [
      'Nếu báo lỗi liên quan tới bucket không tìm thấy, thử bật ô "Dùng path-style URL".',
      'Dịch vụ phải hỗ trợ chữ ký AWS SigV4; loại chỉ hỗ trợ SigV2 sẽ không dùng được.',
    ],
  },
}

/* ------------------------------------------------------------------ *
 *  HƯỚNG DẪN CHO CÁC DRIVER KHÔNG PHẢI S3
 * ------------------------------------------------------------------ */
export const DRIVER_GUIDES: Record<string, StorageSetupGuide> = {
  [StorageDriver.HVM]: {
    title: 'HVM Storage (kho video/file tự host)',
    steps: [
      { text: 'Đăng nhập hvm-storage, vào Quản trị > Tích hợp (/admin/integrations).', url: 'https://app.hvmvsaigon.edu.vn/admin/integrations' },
      { text: 'Mở ứng dụng "academy" (hoặc tạo mới), bấm xoay key và copy API key vào ô API key. Key chỉ hiện một lần.' },
      { text: 'Điền URL app của hvm-storage vào ô URL hvm-storage, ví dụ https://app.hvmvsaigon.edu.vn.' },
      { text: 'Thêm domain của web học viện vào "Allowed origins" của ứng dụng để trình duyệt upload thẳng được.' },
      { text: 'Bấm Kiểm tra kết nối: thấy tên ứng dụng và thư mục gốc là xong.' },
    ],
    warnings: [
      'Key mặc định trong code chỉ để deploy lần đầu chạy được; phải xoay key trên hvm-storage rồi dán key mới vào env HVM_STORAGE_API_KEY.',
      'Video không có link file trực tiếp, chỉ có trang nhúng /embed; nơi hiển thị phải dùng iframe.',
      'URL công khai của dịch vụ này chính là URL app; link file thật nằm trên domain video riêng và do hvm-storage trả về.',
    ],
    publicUrlHint: 'Để trống hoặc điền đúng URL app của hvm-storage, ví dụ https://app.hvmvsaigon.edu.vn.',
  },
  // Hướng dẫn chung của driver S3; chọn dịch vụ cụ thể sẽ hiện thêm hướng dẫn
  // riêng của dịch vụ đó lấy từ S3_PRESET_GUIDES.
  [StorageDriver.S3]: {
    title: 'Dịch vụ tương thích S3',
    steps: [
      { text: 'Chọn đúng dịch vụ ở ô "Dịch vụ" - hướng dẫn chi tiết cho dịch vụ đó sẽ hiện ra ngay bên dưới.' },
      { text: 'Tạo bucket trên dịch vụ, rồi lấy cặp Access Key ID / Secret Access Key.' },
      { text: 'Bấm "Kiểm tra kết nối" trước khi lưu - hệ thống sẽ thử truy cập bucket thật và báo lỗi cụ thể nếu sai.' },
    ],
    warnings: [
      'Nên tạo key chỉ có quyền trên đúng bucket này, đừng dùng key toàn quyền của tài khoản.',
      'Phần lớn dịch vụ chỉ cho xem Secret một lần duy nhất khi tạo, copy ngay.',
      'Dịch vụ S3 không có API báo hạn mức, nên muốn hệ thống chia tải theo dung lượng thì phải tự điền ô "Hạn mức dung lượng" (ví dụ R2 miễn phí 10GB = 10737418240).',
    ],
  },

  [StorageDriver.LOCAL]: {
    title: 'Ổ đĩa máy chủ',
    steps: [
      {
        text: 'Điền đường dẫn thư mục trên máy chủ vào ô Đường dẫn thư mục. Chạy bằng Docker thì dùng đúng đường dẫn bên trong container, ví dụ /usr/app/storage.',
      },
      { text: 'Đảm bảo user chạy ứng dụng có quyền ghi vào thư mục đó.' },
      {
        text: 'Trỏ một domain hoặc đường dẫn web tới thư mục đó (qua Nginx hay web server bạn đang dùng), rồi điền vào ô URL công khai.',
      },
      { text: 'Bấm "Kiểm tra kết nối" - hệ thống sẽ ghi thử một file tạm để xác nhận có quyền ghi thật.' },
    ],
    warnings: [
      'Thư mục phải nằm trên volume được gắn ra ngoài, nếu không file sẽ mất mỗi lần deploy lại container.',
      'Dung lượng còn lại được đọc từ chính phân vùng ổ đĩa, nên khi ổ gần đầy hệ thống sẽ tự ngừng chọn dịch vụ này.',
    ],
    publicUrlHint: 'Ví dụ https://file.hvmv.edu.vn nếu domain này đang trỏ tới thư mục trên.',
  },

  [StorageDriver.CLOUDINARY]: {
    title: 'Cloudinary',
    steps: [
      { text: 'Đăng nhập Cloudinary Console, vào trang Dashboard.', url: 'https://console.cloudinary.com/' },
      { text: 'Phần "Product Environment Credentials" có sẵn Cloud name, API Key và API Secret.' },
      { text: 'Copy lần lượt vào 3 ô Cloud name, API Key, API Secret.' },
      { text: 'Muốn mọi file nằm gọn trong một thư mục thì điền tên thư mục đó vào ô Thư mục gốc, ví dụ hvm.' },
    ],
    warnings: [
      'Cloudinary tính hạn mức theo credit chứ không theo byte, nên muốn hệ thống chia tải theo dung lượng thì bạn tự đặt một con số ở ô "Hạn mức dung lượng".',
      'File không phải ảnh/video sẽ được lưu dạng raw. Tài khoản free có thể bị chặn truy cập file raw, cần bật trong Settings > Security.',
    ],
    publicUrlHint: 'Cloudinary tự sinh link CDN cho mỗi file, không cần điền ô URL công khai.',
  },

  [StorageDriver.GOOGLE_DRIVE]: {
    title: 'Google Drive',
    steps: [
      {
        text: 'Vào Google Cloud Console, tạo project (hoặc dùng project có sẵn) rồi bật "Google Drive API" trong APIs & Services > Library.',
        url: 'https://console.cloud.google.com/apis/library/drive.googleapis.com',
      },
      {
        text: 'CÁCH 1 - OAuth (dùng được cả Gmail miễn phí): vào APIs & Services > OAuth consent screen, khai báo app và thêm email của bạn vào Test users.',
      },
      {
        text: 'Vào Credentials > Create credentials > OAuth client ID, chọn kiểu "Web application", thêm Authorized redirect URI theo hướng dẫn hiện trên form.',
        url: 'https://console.cloud.google.com/apis/credentials',
      },
      { text: 'Copy Client ID và Client Secret vào 2 ô tương ứng, rồi bấm "Kết nối Google" để hệ thống tự lấy Refresh token.' },
      {
        text: 'CÁCH 2 - Service account (cần Google Workspace): vào Credentials > Create credentials > Service account, tạo xong thì vào tab Keys > Add key > JSON và tải file về.',
      },
      { text: 'Dán nguyên nội dung file JSON vào ô Service account JSON.' },
      {
        text: 'Tạo một Shared Drive trong Google Drive, chia sẻ nó cho email của service account với quyền "Content manager", rồi copy ID của Shared Drive (phần sau /drive/folders/ trong URL) vào ô Shared Drive ID.',
      },
    ],
    warnings: [
      'Service account tự nó có dung lượng 0 byte nên KHÔNG upload được vào My Drive. Buộc phải ghi vào Shared Drive, hoặc bật domain-wide delegation rồi điền email user cần impersonate.',
      'Shared Drive chỉ có trên Google Workspace. Nếu dùng Gmail miễn phí thì phải chọn cách OAuth.',
      'Dung lượng mà Google báo là tổng của cả Drive, Gmail và Photos, nên con số "đã dùng" sẽ lớn hơn phần file của riêng hệ thống này.',
    ],
    publicUrlHint:
      'Không cần điền. Sau khi upload, hệ thống tự cấp quyền xem công khai cho file và sinh link dạng drive.google.com/uc?id=... Nếu tổ chức chặn chia sẻ công khai thì link sẽ chỉ mở được bằng tài khoản có quyền.',
  },

  [StorageDriver.DROPBOX]: {
    title: 'Dropbox',
    steps: [
      { text: 'Vào Dropbox App Console, bấm "Create app".', url: 'https://www.dropbox.com/developers/apps' },
      { text: 'Chọn "Scoped access", rồi chọn "Full Dropbox" (hoặc "App folder" nếu chỉ muốn app ghi trong một thư mục riêng).' },
      {
        text: 'Sang tab Permissions, bật đủ 4 quyền: files.metadata.read, files.content.read, files.content.write, sharing.write. Bấm Submit.',
      },
      { text: 'Về tab Settings, copy "App key" và "App secret" vào 2 ô tương ứng.' },
      {
        text: 'Lấy Refresh token: mở link https://www.dropbox.com/oauth2/authorize?client_id=<APP_KEY>&response_type=code&token_access_type=offline trên trình duyệt, đồng ý cấp quyền và copy đoạn code hiện ra.',
      },
      {
        text: 'Đổi code thành refresh token bằng lệnh: curl -u <APP_KEY>:<APP_SECRET> -d grant_type=authorization_code -d code=<CODE> https://api.dropboxapi.com/oauth2/token rồi copy giá trị refresh_token vào ô Refresh token.',
      },
    ],
    warnings: [
      'Phải có token_access_type=offline trong link cấp quyền, thiếu nó Dropbox sẽ không trả refresh_token.',
      'Bật thiếu quyền ở tab Permissions là nguyên nhân phổ biến nhất gây lỗi khi upload hoặc tạo link.',
      'Đoạn code chỉ dùng được một lần và hết hạn rất nhanh, nên làm liền 2 bước cuối.',
    ],
    publicUrlHint: 'Không cần điền. Hệ thống tự tạo shared link cho từng file sau khi upload.',
  },

  [StorageDriver.ONEDRIVE]: {
    title: 'OneDrive / SharePoint',
    steps: [
      {
        text: 'Vào Azure Portal > Microsoft Entra ID > App registrations > "New registration".',
        url: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
      },
      { text: 'Sau khi tạo, ở trang Overview copy "Application (client) ID" vào ô Client ID và "Directory (tenant) ID" vào ô Tenant ID.' },
      { text: 'Vào Certificates & secrets > "New client secret", copy giá trị Value vào ô Client secret.' },
      {
        text: 'Vào API permissions > Add a permission > Microsoft Graph, thêm quyền Files.ReadWrite.All (và offline_access nếu dùng refresh token), rồi bấm "Grant admin consent".',
      },
      {
        text: 'OneDrive cá nhân: lấy refresh token qua luồng OAuth với scope "offline_access Files.ReadWrite.All", dán vào ô Refresh token, để trống ô Drive ID.',
      },
      {
        text: 'SharePoint / app-only: để trống ô Refresh token, và điền Drive ID của document library vào ô Drive ID (lấy bằng Graph Explorer qua /sites/{site-id}/drives).',
      },
    ],
    warnings: [
      'Dùng Tenant ID là "common" cho tài khoản cá nhân; tài khoản tổ chức phải dùng đúng Directory ID.',
      'Chế độ app-only không có /me nên bắt buộc phải điền Drive ID.',
      'Client secret có ngày hết hạn, nhớ gia hạn trước khi hết, nếu không upload sẽ dừng.',
    ],
    publicUrlHint: 'Không cần điền. Hệ thống tự tạo link chia sẻ sau khi upload.',
  },

  [StorageDriver.AZURE_BLOB]: {
    title: 'Azure Blob Storage',
    steps: [
      {
        text: 'Vào Azure Portal > Storage accounts, mở storage account của bạn.',
        url: 'https://portal.azure.com/#browse/Microsoft.Storage%2FStorageAccounts',
      },
      { text: 'Copy tên storage account vào ô Storage account.' },
      { text: 'Vào Data storage > Containers, tạo container rồi copy tên vào ô Container.' },
      {
        text: 'Mở container đó > "Shared access tokens", tích đủ 4 quyền Read, Write, Delete, List, chọn thời hạn đủ dài rồi bấm "Generate SAS token and URL".',
      },
      { text: 'Copy phần "Blob SAS token" vào ô SAS token. Dán kèm dấu ? ở đầu cũng được, hệ thống tự bỏ.' },
    ],
    warnings: [
      'SAS token có ngày hết hạn. Hết hạn là upload và xoá đều dừng, nên đặt thời hạn dài và theo dõi.',
      'Thiếu quyền List thì không quét được file có sẵn và không tính được dung lượng.',
      'Azure không có API quota cho blob, dung lượng được tính bằng cách cộng dồn danh sách blob nên container rất nhiều file sẽ mất thời gian hơn.',
    ],
    publicUrlHint:
      'Nếu container được đặt Access level là Blob (anonymous read), có thể để trống - hệ thống dùng https://<account>.blob.core.windows.net/<container>. Dùng Azure CDN thì điền domain CDN.',
  },

  [StorageDriver.BUNNY]: {
    title: 'Bunny.net Edge Storage',
    steps: [
      { text: 'Vào Bunny Dashboard > Storage, bấm "Add Storage Zone", chọn region chính.', url: 'https://dash.bunny.net/storage' },
      { text: 'Copy tên storage zone vào ô Tên storage zone.' },
      { text: 'Mở storage zone > "FTP & API Access", copy "Password" vào ô Storage zone password.' },
      {
        text: 'Cũng ở trang đó có Hostname theo region (storage.bunnycdn.com cho Đức, sg.storage.bunnycdn.com cho Singapore, ny.storage.bunnycdn.com cho New York...). Copy vào ô Hostname.',
      },
      {
        text: 'Tạo một Pull Zone nối với storage zone này để file có link công khai, rồi điền domain pull zone vào ô URL công khai.',
        url: 'https://dash.bunny.net/cdn',
      },
      {
        text: 'Không bắt buộc: vào Account Settings > API, copy API key vào ô Account API key để hệ thống đọc được dung lượng từ API thay vì phải đếm từng file.',
        url: 'https://dash.bunny.net/account/settings',
      },
    ],
    warnings: [
      'Hostname phải khớp region của storage zone, sai hostname sẽ báo không tìm thấy zone.',
      'Không có Pull Zone thì file upload lên sẽ không có link xem trực tiếp.',
      'Bunny Edge Storage không có API copy/move, nên đổi tên file sẽ được làm bằng cách tải về rồi đẩy lên lại.',
    ],
    publicUrlHint: 'Domain của Pull Zone, ví dụ https://hvm.b-cdn.net.',
  },
}

/* ------------------------------------------------------------------ *
 *  GIẢI THÍCH CÁC Ô CHUNG (không thuộc riêng driver nào)
 * ------------------------------------------------------------------ */
export interface StorageFieldHint {
  key: string
  label: string
  help: string
}

export const COMMON_FIELD_HINTS: StorageFieldHint[] = [
  {
    key: 'name',
    label: 'Tên dịch vụ',
    help: 'Tên để bạn tự nhận ra, ví dụ "R2 chính", "Drive dự phòng". Không ảnh hưởng gì tới kỹ thuật.',
  },
  {
    key: 'is_enabled',
    label: 'Bật nhận upload',
    help: 'Tắt chỉ ngăn file MỚI vào đây. File đã nằm trên dịch vụ vẫn đọc, xoá, di chuyển bình thường, vì đó vẫn là file của bạn.',
  },
  {
    key: 'is_default',
    label: 'Dịch vụ mặc định',
    help: 'Được dùng khi chiến lược chia tải là "Chỉ dùng 1 dịch vụ mặc định", và khi các dịch vụ khác đều không khả dụng.',
  },
  {
    key: 'priority',
    label: 'Độ ưu tiên',
    help: 'Số nhỏ = ưu tiên cao. Dùng cho chiến lược "Ưu tiên lấp đầy", và để phá thế khi hai dịch vụ còn trống bằng nhau.',
  },
  {
    key: 'weight',
    label: 'Trọng số',
    help: 'Chỉ dùng cho chiến lược "Round-robin theo trọng số". Đặt R2 = 3 và B2 = 1 thì cứ 4 file sẽ có 3 file vào R2.',
  },
  {
    key: 'quota_limit_bytes',
    label: 'Hạn mức dung lượng (byte)',
    help: 'Hạn mức bạn tự đặt. Cần với các dịch vụ S3 vì chúng không có API báo hạn mức - không đặt thì hệ thống không biết còn trống bao nhiêu để chia tải. Ví dụ R2 miễn phí 10GB = 10737418240.',
  },
  {
    key: 'max_file_size_bytes',
    label: 'Kích thước file tối đa (byte)',
    help: 'File lớn hơn mức này sẽ không được đưa vào dịch vụ này. Để trống = không chặn. Ví dụ 100MB = 104857600.',
  },
  {
    key: 'allowed_mime_types',
    label: 'Loại file được phép',
    help: 'Cách nhau bằng dấu phẩy, hỗ trợ dạng nhóm. Ví dụ "image/*,application/pdf" để dịch vụ này chỉ nhận ảnh và PDF. Để trống = nhận mọi loại.',
  },
  {
    key: 'path_prefix',
    label: 'Tiền tố đường dẫn',
    help: 'Thêm vào trước mọi key khi upload, ví dụ "hvm/2026". Hữu ích khi dùng chung một bucket cho nhiều hệ thống.',
  },
  {
    key: 'public_base_url',
    label: 'URL công khai',
    help: 'Domain dùng để ghép link file. Mỗi dịch vụ lấy ở một chỗ khác nhau, xem phần hướng dẫn của dịch vụ đó.',
  },
]

/** Giải thích các chiến lược chia tải, để hiện ngay cạnh ô chọn chiến lược. */
export const STRATEGY_HINTS: Record<string, string> = {
  most_free:
    'Mỗi lần upload chọn dịch vụ còn trống nhiều nhất theo phần trăm. Lấp đều các dịch vụ, phù hợp khi một nơi đã gần đầy. Dịch vụ chưa đặt hạn mức sẽ không có cơ sở so sánh nên bị xếp sau.',
  priority_fill:
    'Dùng hết dịch vụ có độ ưu tiên cao nhất tới ngưỡng (mặc định 95%) rồi mới tràn sang dịch vụ tiếp theo. Dễ dự đoán, file cùng thời kỳ nằm chung một nơi.',
  weighted_round_robin:
    'Xoay vòng theo trọng số bạn đặt, không quan tâm còn trống bao nhiêu. Dùng khi bạn muốn kiểm soát chính xác tỉ lệ file giữa các dịch vụ.',
  single_default: 'Luôn upload vào dịch vụ được đánh dấu mặc định. Các dịch vụ khác chỉ để đọc file cũ hoặc làm dự phòng.',
}
