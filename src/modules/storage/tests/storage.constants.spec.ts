import { StorageDriver } from '@enums/storage.enum'
import {
  resolveS3Endpoint,
  resolveS3ForcePathStyle,
  resolveS3Region,
  S3_PRESETS,
  S3_PRESET_MAP,
  STORAGE_DRIVER_SCHEMAS,
  STORAGE_DRIVER_SCHEMA_MAP,
  STRATEGY_LABELS,
} from '../storage.constants'
import { DRIVER_GUIDES, S3_PRESET_GUIDES } from '../storage.guides'

describe('Preset và endpoint của driver S3', () => {
  it('ghép đúng endpoint R2 từ account id', () => {
    expect(resolveS3Endpoint('cloudflare_r2', { account_id: 'abc123' })).toBe('https://abc123.r2.cloudflarestorage.com')
  })

  it('ghép đúng endpoint theo region cho các dịch vụ dùng region', () => {
    expect(resolveS3Endpoint('aws_s3', { region: 'ap-southeast-1' })).toBe('https://s3.ap-southeast-1.amazonaws.com')
    expect(resolveS3Endpoint('backblaze_b2', { region: 'us-west-004' })).toBe('https://s3.us-west-004.backblazeb2.com')
    expect(resolveS3Endpoint('wasabi', { region: 'eu-central-1' })).toBe('https://s3.eu-central-1.wasabisys.com')
    expect(resolveS3Endpoint('do_spaces', { region: 'sgp1' })).toBe('https://sgp1.digitaloceanspaces.com')
    expect(resolveS3Endpoint('hetzner', { region: 'fsn1' })).toBe('https://fsn1.your-objectstorage.com')
    expect(resolveS3Endpoint('linode', { region: 'us-east-1' })).toBe('https://us-east-1.linodeobjects.com')
    expect(resolveS3Endpoint('vultr', { region: 'sgp1' })).toBe('https://sgp1.vultrobjects.com')
    expect(resolveS3Endpoint('scaleway', { region: 'fr-par' })).toBe('https://s3.fr-par.scw.cloud')
    expect(resolveS3Endpoint('contabo', { region: 'eu2' })).toBe('https://eu2.contabostorage.com')
    expect(resolveS3Endpoint('alibaba_oss', { region: 'ap-southeast-1' })).toBe('https://oss-ap-southeast-1.aliyuncs.com')
    expect(resolveS3Endpoint('tencent_cos', { region: 'ap-singapore' })).toBe('https://cos.ap-singapore.myqcloud.com')
    expect(resolveS3Endpoint('ovh', { region: 'gra' })).toBe('https://s3.gra.io.cloud.ovh.net')
    expect(resolveS3Endpoint('exoscale', { region: 'ch-gva-2' })).toBe('https://sos-ch-gva-2.exo.io')
  })

  it('dùng region mặc định của preset khi không truyền region', () => {
    expect(resolveS3Endpoint('aws_s3', {})).toBe('https://s3.ap-southeast-1.amazonaws.com')
    expect(resolveS3Region('aws_s3', {})).toBe('ap-southeast-1')
    expect(resolveS3Region('cloudflare_r2', {})).toBe('auto')
  })

  it('ghép endpoint nhiều biến của Oracle và Supabase', () => {
    expect(resolveS3Endpoint('oracle_oci', { namespace: 'mynamespace', region: 'ap-singapore-1' })).toBe(
      'https://mynamespace.compat.objectstorage.ap-singapore-1.oraclecloud.com',
    )
    expect(resolveS3Endpoint('supabase', { project_ref: 'abcdefghijklmnop' })).toBe('https://abcdefghijklmnop.storage.supabase.co/storage/v1/s3')
  })

  it('endpoint người dùng tự nhập luôn thắng mẫu của preset', () => {
    expect(resolveS3Endpoint('aws_s3', { region: 'us-east-1', endpoint: 'https://proxy.noi-bo.vn' })).toBe('https://proxy.noi-bo.vn')
  })

  it('cắt dấu / ở cuối endpoint để không sinh key có // ở giữa', () => {
    expect(resolveS3Endpoint('minio', { endpoint: 'https://minio.example.com:9000///' })).toBe('https://minio.example.com:9000')
  })

  it('preset không có mẫu endpoint mà người dùng chưa nhập thì trả chuỗi rỗng', () => {
    expect(resolveS3Endpoint('minio', {})).toBe('')
    expect(resolveS3Endpoint('custom', {})).toBe('')
    expect(resolveS3Endpoint('idrive_e2', {})).toBe('')
  })

  it('GCS dùng endpoint chung, không phụ thuộc region', () => {
    expect(resolveS3Endpoint('gcs', {})).toBe('https://storage.googleapis.com')
    expect(resolveS3Endpoint('gcs', { region: 'asia-southeast1' })).toBe('https://storage.googleapis.com')
  })

  it('path style lấy mặc định theo preset, và config ghi đè được', () => {
    // Các dịch vụ chỉ hỗ trợ path-style
    expect(resolveS3ForcePathStyle('minio', {})).toBe(true)
    expect(resolveS3ForcePathStyle('contabo', {})).toBe(true)
    expect(resolveS3ForcePathStyle('supabase', {})).toBe(true)
    expect(resolveS3ForcePathStyle('oracle_oci', {})).toBe(true)
    // Các dịch vụ dùng virtual-hosted
    expect(resolveS3ForcePathStyle('cloudflare_r2', {})).toBe(false)
    expect(resolveS3ForcePathStyle('aws_s3', {})).toBe(false)
    // Người dùng ghi đè
    expect(resolveS3ForcePathStyle('aws_s3', { force_path_style: true })).toBe(true)
    expect(resolveS3ForcePathStyle('minio', { force_path_style: false })).toBe(false)
    // Chuỗi 'true'/'false' từ form multipart cũng phải hiểu đúng
    expect(resolveS3ForcePathStyle('aws_s3', { force_path_style: 'true' })).toBe(true)
    expect(resolveS3ForcePathStyle('minio', { force_path_style: 'false' })).toBe(false)
    // Chuỗi rỗng = chưa chọn, phải rơi về mặc định của preset
    expect(resolveS3ForcePathStyle('minio', { force_path_style: '' })).toBe(true)
  })
})

describe('Tính toàn vẹn của schema và hướng dẫn', () => {
  it('mỗi preset có id duy nhất', () => {
    const ids = S3_PRESETS.map(preset => preset.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('mọi preset đều có hướng dẫn lấy thông tin cấu hình', () => {
    for (const preset of S3_PRESETS) {
      expect(S3_PRESET_GUIDES[preset.id]).toBeDefined()
      // Hướng dẫn đã được lắp vào preset ở cuối storage.constants.ts
      expect(preset.guide).toBeDefined()
      expect(preset.guide.steps.length).toBeGreaterThan(0)
    }
  })

  it('mọi driver đều có schema, capabilities và hướng dẫn', () => {
    for (const driver of Object.values(StorageDriver)) {
      const schema = STORAGE_DRIVER_SCHEMA_MAP.get(driver)
      expect(schema).toBeDefined()
      expect(schema.fields.length).toBeGreaterThan(0)
      expect(schema.capabilities).toBeDefined()
      expect(DRIVER_GUIDES[driver]).toBeDefined()
      expect(schema.guide).toBeDefined()
    }
  })

  it('mỗi field trong một schema có key duy nhất', () => {
    for (const schema of STORAGE_DRIVER_SCHEMAS) {
      const keys = schema.fields.map(field => field.key)
      expect(new Set(keys).size).toBe(keys.length)
    }
  })

  it('field dạng select luôn có options', () => {
    for (const schema of STORAGE_DRIVER_SCHEMAS) {
      for (const field of schema.fields) {
        if (field.type === 'select') expect(field.options?.length).toBeGreaterThan(0)
      }
    }
  })

  it('mọi secret đều dùng type password hoặc textarea, không để lộ dạng text thường', () => {
    for (const schema of STORAGE_DRIVER_SCHEMAS) {
      for (const field of schema.fields) {
        if (field.secret) expect(['password', 'textarea']).toContain(field.type)
      }
    }
  })

  it('điều kiện showIf chỉ trỏ tới field có thật trong cùng schema', () => {
    for (const schema of STORAGE_DRIVER_SCHEMAS) {
      const keys = new Set(schema.fields.map(field => field.key))
      for (const field of schema.fields) {
        if (field.showIf) expect(keys.has(field.showIf.key)).toBe(true)
      }
    }
  })

  it('biến riêng của preset đều có mặt trong field của driver S3', () => {
    const s3Fields = new Set(STORAGE_DRIVER_SCHEMA_MAP.get(StorageDriver.S3).fields.map(field => field.key))

    for (const preset of S3_PRESETS) {
      for (const variable of preset.vars || []) {
        expect(s3Fields.has(variable.key)).toBe(true)
      }
    }
  })

  it('mọi biến trong mẫu endpoint đều có chỗ để nhập', () => {
    // Nếu mẫu endpoint cần {foo} mà không có field foo thì sẽ ghép ra endpoint sai
    const s3Fields = new Set(STORAGE_DRIVER_SCHEMA_MAP.get(StorageDriver.S3).fields.map(field => field.key))

    for (const preset of S3_PRESETS) {
      if (!preset.endpoint) continue
      const variables = [...preset.endpoint.matchAll(/\{(\w+)\}/g)].map(match => match[1])
      for (const variable of variables) {
        expect(s3Fields.has(variable)).toBe(true)
      }
    }
  })

  it('S3_PRESET_MAP tra được đúng preset theo id', () => {
    expect(S3_PRESET_MAP.get('cloudflare_r2').label).toBe('Cloudflare R2')
    expect(S3_PRESET_MAP.get('khong-ton-tai')).toBeUndefined()
  })

  it('mọi chiến lược chia tải đều có nhãn hiển thị', () => {
    for (const key of ['most_free', 'priority_fill', 'weighted_round_robin', 'single_default']) {
      expect(STRATEGY_LABELS[key]).toBeTruthy()
    }
  })
})
