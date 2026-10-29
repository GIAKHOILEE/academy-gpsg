/**
 * Giá trị mặc định để dịch vụ hvm-storage chạy được ngay sau lần deploy đầu tiên,
 * chưa cần cấu hình gì. Biến môi trường HVM_STORAGE_URL / HVM_STORAGE_API_KEY
 * (nếu có) luôn thắng các giá trị này.
 *
 * Key dưới đây trùng với INTEGRATION_BOOTSTRAP_KEY mặc định của hvm-storage.
 * Sau khi xoay key trên /admin/integrations của hvm-storage thì dán key mới vào
 * env HVM_STORAGE_API_KEY, không sửa file này.
 */
export const HVM_STORAGE_DEFAULT_URL = 'https://app.hvmvsaigon.edu.vn'
export const HVM_STORAGE_DEFAULT_API_KEY = 'hvmk_academy_3f9c2b7e8d1a4c6f5b0e9d8c7a6b5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a'

/** Tên gợi ý của biến môi trường, dùng chung cho seeder và thông báo lỗi. */
export const HVM_STORAGE_URL_ENV = 'HVM_STORAGE_URL'
export const HVM_STORAGE_API_KEY_ENV = 'HVM_STORAGE_API_KEY'
