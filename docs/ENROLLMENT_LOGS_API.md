# Tài Liệu API: Lịch Sử Thao Tác Đơn Đăng Ký — Enrollment Audit Logs (Dành cho Frontend)

Tài liệu này mô tả chi tiết luồng hoạt động, bảng ánh xạ dữ liệu, Request/Response và hướng dẫn tích hợp UI cho bộ API theo dõi lịch sử thao tác trên đơn đăng ký (`enrollments`), **bao gồm cả các đơn đã bị xóa cứng khỏi hệ thống**.

---

## 1. Tổng quan Nghiệp vụ & Phân quyền

1. **Tự động ghi log — FE không cần gọi API ghi log riêng:**
   - Mọi thao tác tạo đơn, cập nhật đơn, khôi phục đơn, xóa cứng đơn, gửi email thủ công, cron hệ thống tự xóa mềm quá hạn 10 ngày, hay hệ thống tự đồng bộ từ trang sửa học viên đều được Backend tự động ghi vào bảng `enrollment_logs` trong cùng transaction.
   - Bảng `enrollment_logs` là dạng **append-only** (không có khóa ngoại `CASCADE`), nên log không bao giờ bị mất kể cả khi đơn bị xóa cứng hoặc tài khoản nhân viên bị xóa.
2. **Chính sách xóa cứng (`DELETE /admin/enrollments/:id`) vẫn giữ nguyên:**
   - Khi Admin/Staff xóa một đơn, bản ghi trong bảng `enrollments` bị xóa cứng như cũ.
   - Trước khi xóa, Backend tự chụp lại **toàn bộ trạng thái đơn** (kèm thông tin các lớp học và mã học viên) lưu vào trường `snapshot` của dòng log `DELETE`. FE dùng `snapshot` (hoặc `latest_snapshot`) để hiển thị lại đầy đủ nội dung đơn đã bị xóa.
3. **Phân biệt rõ thao tác của Người dùng vs Hệ thống:**
   - Mọi bản ghi log đều có trường `reason` (tiếng Việt) giải thích rõ nguyên nhân thao tác (đặc biệt khi do hệ thống tự chạy cron quá hạn 10 ngày hoặc tự đồng bộ từ hồ sơ học viên), kèm `actor_type` (`USER` | `GUEST` | `SYSTEM`) và `metadata.triggered_by`.
4. **Xác thực & Phân quyền:**
   - Tất cả 3 API dưới đây yêu cầu Header:
     ```http
     Authorization: Bearer <access_token>
     Accept-Language: vi
     ```
   - Vai trò được phép truy cập:
     - `SUPER_ADMIN` (`0`)
     - `ADMIN` (`1`)
     - `STAFF` (`4`)
     - *(và `FINANCE` (`5`) theo cấu hình `RolesGuard` chung của hệ thống)*

---

## 2. Các Enum & Bảng Ánh Xạ Hiển Thị

### 2.1. `EnrollmentLogAction` (`action` — Loại hành động)

| Giá trị | Nhãn tiếng Việt gợi ý | Gợi ý màu Badge | Khi nào phát sinh |
| :--- | :--- | :---: | :--- |
| `"CREATE"` | Tạo đơn mới | Xanh lá | Học viên hoặc khách tạo đơn (`POST /enrollments`) |
| `"UPDATE"` | Cập nhật đơn | Xanh dương | Admin/Staff sửa thông tin đơn (`PUT /admin/enrollments/:id`) |
| `"RESTORE"` | Khôi phục đơn | Xanh ngọc | Admin/Staff khôi phục đơn từ danh sách xóa mềm (có thể kèm sửa thông tin) |
| `"SOFT_DELETE"` | Xóa mềm đơn | Cam | Xóa mềm đơn |
| `"AUTO_SOFT_DELETE"` | Hệ thống tự xóa mềm | Cam đậm / Xám | Cron 00:00 mỗi ngày tự xóa mềm đơn chờ thanh toán quá 10 ngày |
| `"DELETE"` | Xóa vĩnh viễn | Đỏ | Admin/Staff xóa cứng đơn (`DELETE /admin/enrollments/:id`), luôn có `snapshot` |
| `"SYNC_FROM_STUDENT"` | Đồng bộ từ học viên | Tím | Hệ thống tự đồng bộ thông tin cá nhân xuống đơn khi sửa hồ sơ học viên (`PUT /admin/students/:id`) |
| `"SYSTEM_UPDATE"` | Hệ thống tự cập nhật | Xám / Tím nhạt | Lưới an toàn tự động ghi nhận nếu có job/module hệ thống tác động trực tiếp lên đơn |
| `"SEND_PAYMENT_EMAIL"` | Gửi mail hóa đơn | Xanh lam nhạt | Admin/Staff bấm gửi email xác nhận thanh toán (`POST /admin/enrollments/:id/send-payment-email`) |
| `"SEND_ACCOUNT_EMAIL"` | Gửi mail tài khoản | Xanh lam nhạt | Admin/Staff bấm gửi email thông tin tài khoản (`POST /admin/enrollments/:id/send-account-email`) |
| `"SEND_INSTRUCTION_EMAIL"` | Gửi mail hướng dẫn | Xanh lam nhạt | Admin/Staff bấm gửi email hướng dẫn học online (`POST /admin/enrollments/:id/send-instruction-email`) |

### 2.2. `EnrollmentLogActorType` (`actor_type` — Loại tác nhân)

| Giá trị | Ý nghĩa | Gợi ý hiển thị cột "Người thực hiện" |
| :--- | :--- | :--- |
| `"USER"` | Tài khoản đã đăng nhập (Super Admin, Admin, Staff, hoặc Học viên đã login) | Hiển thị `actor_name` + badge vai trò (`actor_role`) + `actor_username` |
| `"GUEST"` | Khách chưa đăng nhập tự đăng ký khóa học | Hiển thị `actor_name` + tag `"Khách"` (`actor_username` chứa email/SĐT nếu có) |
| `"SYSTEM"` | Hệ thống tự động thực hiện (Cronjob / Background job) | Hiển thị icon robot/bánh răng + `"Hệ thống"` (badge nổi bật khác với nhân viên) |

### 2.3. `EnrollmentExistenceState` (`enrollment_state` — Trạng thái tồn tại hiện tại của đơn)

| Giá trị | Ý nghĩa | Gợi ý hiển thị Badge trên FE |
| :--- | :--- | :--- |
| `"ACTIVE"` | Đơn đang hoạt động trong bảng `enrollments` | Không cần badge hoặc badge xanh `"Đang hoạt động"` — cho bấm mở chi tiết đơn |
| `"SOFT_DELETED"` | Đơn đang ở thùng rác / danh sách đã xóa mềm | Badge cam `"Đã xóa mềm"` — vẫn có thể xem/khôi phục |
| `"HARD_DELETED"` | Đơn đã bị xóa cứng vĩnh viễn khỏi bảng `enrollments` | Badge đỏ `"Đã xóa vĩnh viễn"` — **không gọi `GET /admin/enrollments/:id`** (sẽ 404), thay vào đó mở modal xem từ `snapshot` / `latest_snapshot` |

### 2.4. Các Enum của dữ liệu đơn (dùng để format giá trị `old` / `new` trong `changes` & `snapshot`)

| Enum | Bảng ánh xạ |
| :--- | :--- |
| `status` (`StatusEnrollment`) | `1`: Chờ thanh toán (`PENDING`), `2`: Đã hoàn thành (`DONE`), `3`: Thanh toán sau (`PAY_LATE`), `4`: Nợ học phí (`DEBT`) |
| `payment_status` (`PaymentStatus`) | `1`: Đã thanh toán (`PAID`), `2`: Chưa thanh toán (`UNPAID`) |
| `payment_method` (`PaymentMethod`) | `1`: Tiền mặt (`CASH`), `2`: Chuyển khoản (`TRANSFER`) |
| `learn_type` (`LearnType`) | `1`: Học trực tiếp (`OFFLINE`), `2`: Học qua Video (`VIDEO`), `3`: Học online Meeting (`MEETING`) |
| `gender` (`Gender`) | `0`: Khác (`OTHER`), `1`: Nam (`MALE`), `2`: Nữ (`FEMALE`) |
| `actor_role` (`Role`) | `0`: Super Admin, `1`: Admin, `2`: Học viên, `3`: Giảng viên, `4`: Nhân viên (`STAFF`), `5`: Kế toán (`FINANCE`) |

---

## 3. Danh Sách Các API Endpoint

Base URL: `/admin/enrollments`

### 3.1. Tra cứu toàn bộ lịch sử thao tác (Global Audit Log)

```http
GET /admin/enrollments/logs
```

Dùng cho **màn hình quản lý lịch sử tổng hợp** (tra cứu mọi thao tác trên tất cả các đơn, lọc theo nhân viên, lọc theo đơn đã bị xóa cứng, lọc theo thao tác của hệ thống...).

#### Query Parameters

| Param | Kiểu | Bắt buộc | Mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- |
| `page` | `number` | Không | `1` | Trang hiện tại |
| `limit` | `number` | Không | `20` | Số dòng mỗi trang (tối đa `100`) |
| `enrollment_id` | `number` | Không | — | Lọc chính xác theo ID đơn đăng ký (kể cả đơn đã xóa cứng) |
| `enrollment_code` | `string` | Không | — | Lọc theo mã đơn (match chứa, không phân biệt hoa thường) |
| `search` | `string` | Không | — | Tìm kiếm tổng hợp trên: mã đơn, tên học viên (hỗ trợ tiếng Việt không dấu), mã học viên, tên/username người thao tác, và **nguyên nhân (`reason`)** |
| `actor_id` | `number` | Không | — | Lọc thao tác của 1 nhân viên/user cụ thể |
| `actor_type` | `USER \| GUEST \| SYSTEM` | Không | — | Lọc theo loại tác nhân (vd: `SYSTEM` để xem tất cả tác vụ hệ thống làm) |
| `action` | `string` | Không | — | Lọc 1 hành động (`DELETE`) hoặc **nhiều hành động cách nhau dấu phẩy** (`UPDATE,RESTORE,DELETE`) |
| `only_hard_deleted` | `boolean` | Không | — | Truyền `true` để chỉ xem log của những đơn hiện **đã bị xóa cứng** khỏi bảng `enrollments` |
| `from_date` | `string` | Không | — | Từ ngày (`YYYY-MM-DD` hoặc ISO string). Nếu truyền `YYYY-MM-DD` sẽ tính từ `00:00:00.000` |
| `to_date` | `string` | Không | — | Đến ngày (`YYYY-MM-DD` hoặc ISO string). Nếu truyền `YYYY-MM-DD` sẽ tính đến `23:59:59.999` |
| `orderBy` | `string` | Không | `created_at` | Cột sắp xếp: `created_at`, `id`, `enrollment_id`, `action` |
| `orderDirection` | `ASC \| DESC` | Không | `DESC` | Chiều sắp xếp (`DESC`: mới nhất trước) |

#### Ví dụ Request
```http
# Xem tất cả thao tác mới nhất
GET /admin/enrollments/logs?page=1&limit=20

# Xem tất cả các đơn đã bị xóa cứng
GET /admin/enrollments/logs?action=DELETE&only_hard_deleted=true&page=1&limit=20

# Xem tất cả các thao tác do Hệ thống tự làm
GET /admin/enrollments/logs?actor_type=SYSTEM&page=1&limit=20

# Tìm theo mã đơn đã xóa hoặc tên học viên không dấu
GET /admin/enrollments/logs?search=nguyen van a&from_date=2026-11-01&to_date=2026-11-30

# Xem 1 nhân viên (actor_id=5) đã sửa/xóa những gì
GET /admin/enrollments/logs?actor_id=5&action=UPDATE,RESTORE,DELETE
```

#### Response Mẫu (`200 OK`)
```json
{
  "statusCode": 200,
  "messageCode": "ENROLLMENT_LOGS_GET_SUCCESS",
  "data": [
    {
      "id": 105,
      "enrollment_id": 22,
      "enrollment_code": "DEL22",
      "student_id": 5,
      "student_name": "Phạm Văn D",
      "student_name_normalized": "pham_van_d",
      "student_code": "2026-0005",
      "action": "DELETE",
      "reason": "Quản trị viên xóa vĩnh viễn đơn đăng ký",
      "actor_type": "USER",
      "actor_id": 2,
      "actor_name": "Nguyễn Thị Admin",
      "actor_username": "admin01",
      "actor_role": 1,
      "changes": null,
      "snapshot": {
        "id": 22,
        "code": "DEL22",
        "registration_date": "2026-11-10T03:20:00.000Z",
        "payment_method": 2,
        "payment_status": 1,
        "status": 2,
        "voucher_code": null,
        "discount": 0,
        "class_ids": [
          {
            "class_id": 3,
            "class_code": "KT01",
            "class_name": "Kinh Thánh Căn Bản",
            "price": 400000,
            "learn_type": 1
          }
        ],
        "total_fee": 400000,
        "prepaid": 0,
        "debt": 0,
        "note": "Đã đóng chuyển khoản",
        "user_note": null,
        "is_read_note": null,
        "is_logged": true,
        "saint_name": "Giuse",
        "gender": 1,
        "full_name": "Phạm Văn D",
        "email": "phamd@example.com",
        "phone_number": "0909123456",
        "birth_date": "1995-05-20",
        "address": "TP.HCM",
        "shipping_name": null,
        "shipping_phone": null,
        "shipping_address": null,
        "shipping_note": null,
        "birth_place": "TP.HCM",
        "parish": "Tân Định",
        "deanery": "Tân Định",
        "diocese": "TP.HCM",
        "congregation": null,
        "student_id": 5,
        "student_code": "2026-0005",
        "created_at": "2026-11-10T03:20:00.000Z",
        "updated_at": "2026-11-15T08:00:00.000Z",
        "deleted_at": null
      },
      "metadata": {
        "hard_deleted": true,
        "was_soft_deleted": false,
        "source": "admin_enrollment",
        "ip": "113.161.72.10",
        "user_agent": "Mozilla/5.0 ..."
      },
      "created_at": "2026-11-20T06:45:12.000Z",
      "enrollment_state": "HARD_DELETED"
    },
    {
      "id": 104,
      "enrollment_id": 45,
      "enrollment_code": "AB12C",
      "student_id": 12,
      "student_name": "Trần Thị Hoa",
      "student_name_normalized": "tran_thi_hoa",
      "student_code": "2026-0012",
      "action": "UPDATE",
      "reason": "Quản trị viên cập nhật thông tin đơn đăng ký",
      "actor_type": "USER",
      "actor_id": 7,
      "actor_name": "Lê Văn Nhân Viên",
      "actor_username": "staff02",
      "actor_role": 4,
      "changes": {
        "status": { "old": 1, "new": 4 },
        "prepaid": { "old": 0, "new": 200000 },
        "debt": { "old": 500000, "new": 300000 },
        "class_ids": {
          "old": [
            { "class_id": 10, "class_code": "TH01", "class_name": "Thần Học 1", "price": 500000, "learn_type": 1 }
          ],
          "new": [
            { "class_id": 10, "class_code": "TH01", "class_name": "Thần Học 1", "price": 500000, "learn_type": 2 }
          ]
        }
      },
      "snapshot": null,
      "metadata": {
        "created_new_student_account": false,
        "source": "admin_enrollment",
        "ip": "113.161.72.11"
      },
      "created_at": "2026-11-20T06:30:00.000Z",
      "enrollment_state": "ACTIVE"
    },
    {
      "id": 103,
      "enrollment_id": 31,
      "enrollment_code": "OD031",
      "student_id": null,
      "student_name": "Nguyễn Văn Quá Hạn",
      "student_name_normalized": "nguyen_van_qua_han",
      "student_code": null,
      "action": "AUTO_SOFT_DELETE",
      "reason": "Hệ thống tự động xóa mềm đơn do quá 10 ngày chưa thanh toán (trạng thái chờ thanh toán)",
      "actor_type": "SYSTEM",
      "actor_id": null,
      "actor_name": "Hệ thống",
      "actor_username": "system",
      "actor_role": null,
      "changes": {
        "deleted_at": { "old": null, "new": "2026-11-20T00:00:01.123Z" }
      },
      "snapshot": null,
      "metadata": {
        "reason_code": "OVERDUE_10_DAYS_UNPAID",
        "triggered_by": "SYSTEM_CRON",
        "cron_job": "overDue10Day",
        "overdue_days": 10,
        "enrollment_created_at": "2026-11-09T04:15:00.000Z",
        "source": "cron_overdue_10_day"
      },
      "created_at": "2026-11-20T00:00:01.000Z",
      "enrollment_state": "SOFT_DELETED"
    },
    {
      "id": 102,
      "enrollment_id": 45,
      "enrollment_code": "AB12C",
      "student_id": 12,
      "student_name": "Trần Thị Hoa",
      "student_name_normalized": "tran_thi_hoa",
      "student_code": "2026-0012",
      "action": "SYNC_FROM_STUDENT",
      "reason": "Hệ thống tự động đồng bộ thông tin đơn khi hồ sơ học viên (2026-0012) được cập nhật",
      "actor_type": "USER",
      "actor_id": 2,
      "actor_name": "Nguyễn Thị Admin",
      "actor_username": "admin01",
      "actor_role": 1,
      "changes": {
        "phone_number": { "old": "0901111111", "new": "0902222222" },
        "parish": { "old": "Gia Định", "new": "Tân Định" }
      },
      "snapshot": null,
      "metadata": {
        "reason_code": "STUDENT_PROFILE_SYNC",
        "triggered_by": "SYSTEM_SYNC",
        "source": "student_profile_update",
        "student_id": 12,
        "student_code": "2026-0012"
      },
      "created_at": "2026-11-19T14:20:00.000Z",
      "enrollment_state": "ACTIVE"
    }
  ],
  "meta": {
    "total": 4,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

### 3.2. Xem chi tiết 1 bản ghi log

```http
GET /admin/enrollments/logs/:logId
```

Dùng khi admin bấm vào 1 dòng log (đặc biệt để mở drawer/modal xem chi tiết `changes` hoặc xem toàn bộ `snapshot` của đơn đã xóa).

#### Path Parameters
| Param | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :---: | :--- |
| `logId` | `number` | **Có** | ID của bản ghi log (`enrollment_logs.id`) |

#### Response Mẫu (`200 OK`)
```json
{
  "statusCode": 200,
  "messageCode": "ENROLLMENT_LOG_GET_SUCCESS",
  "data": {
    "id": 105,
    "enrollment_id": 22,
    "enrollment_code": "DEL22",
    "action": "DELETE",
    "reason": "Quản trị viên xóa vĩnh viễn đơn đăng ký",
    "actor_type": "USER",
    "actor_id": 2,
    "actor_name": "Nguyễn Thị Admin",
    "actor_username": "admin01",
    "actor_role": 1,
    "changes": null,
    "snapshot": { "...": "Đầy đủ thông tin đơn trước khi xóa" },
    "metadata": { "hard_deleted": true, "was_soft_deleted": false, "source": "admin_enrollment" },
    "created_at": "2026-11-20T06:45:12.000Z",
    "enrollment_state": "HARD_DELETED"
  }
}
```

#### Lỗi có thể gặp
- `404 Not Found` — `messageCode` / message: `"Lịch sử đơn đăng ký không tồn tại"` (`ENROLLMENT_LOG_NOT_FOUND`).

---

### 3.3. Xem timeline lịch sử của 1 đơn cụ thể (kể cả đã xóa mềm / xóa cứng)

```http
GET /admin/enrollments/:id/logs
```

Dùng cho:
- Tab **"Lịch sử chỉnh sửa"** bên trong trang/modal Chi tiết đơn đăng ký.
- Trang/Modal **"Xem toàn bộ lịch sử đơn đã xóa"** (khi bấm vào `enrollment_id` từ danh sách log tổng hợp `GET /admin/enrollments/logs`).

> **Quan trọng:** API này **KHÔNG trả 404** khi đơn `:id` đã bị xóa cứng! Nó trả về `enrollment_state: "HARD_DELETED"`, kèm `latest_snapshot` (ảnh chụp đầy đủ nhất của đơn trước khi bị xóa) và toàn bộ danh sách `logs` từ lúc tạo đến lúc xóa.

#### Path Parameters
| Param | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :---: | :--- |
| `id` | `number` | **Có** | ID của đơn đăng ký (`enrollment_id`) |

#### Query Parameters
| Param | Kiểu | Mặc định | Mô tả |
| :--- | :--- | :---: | :--- |
| `page` | `number` | `1` | Trang hiện tại |
| `limit` | `number` | `20` | Số dòng mỗi trang (tối đa `100`) |
| `actor_id` | `number` | — | Lọc theo người thao tác |
| `actor_type` | `USER \| GUEST \| SYSTEM` | — | Lọc theo loại tác nhân |
| `action` | `string` | — | Lọc 1 hoặc nhiều hành động cách nhau dấu phẩy |
| `from_date` | `string` | — | Từ ngày (`YYYY-MM-DD` hoặc ISO) |
| `to_date` | `string` | — | Đến ngày (`YYYY-MM-DD` hoặc ISO) |
| `orderBy` | `string` | `created_at` | `created_at`, `id`, `action` |
| `orderDirection` | `ASC \| DESC` | `DESC` | `DESC` (mới nhất trên cùng) hoặc `ASC` (dòng thời gian từ lúc tạo đến lúc xóa) |

#### Response Mẫu (`200 OK`)
```json
{
  "statusCode": 200,
  "messageCode": "ENROLLMENT_LOGS_GET_SUCCESS",
  "data": {
    "enrollment_id": 22,
    "enrollment_code": "DEL22",
    "enrollment_state": "HARD_DELETED",
    "latest_snapshot": {
      "id": 22,
      "code": "DEL22",
      "full_name": "Phạm Văn D",
      "saint_name": "Giuse",
      "student_id": 5,
      "student_code": "2026-0005",
      "status": 2,
      "payment_status": 1,
      "payment_method": 2,
      "total_fee": 400000,
      "prepaid": 0,
      "debt": 0,
      "discount": 0,
      "class_ids": [
        {
          "class_id": 3,
          "class_code": "KT01",
          "class_name": "Kinh Thánh Căn Bản",
          "price": 400000,
          "learn_type": 1
        }
      ]
    },
    "logs": [
      {
        "id": 105,
        "enrollment_id": 22,
        "enrollment_code": "DEL22",
        "action": "DELETE",
        "reason": "Quản trị viên xóa vĩnh viễn đơn đăng ký",
        "actor_type": "USER",
        "actor_id": 2,
        "actor_name": "Nguyễn Thị Admin",
        "actor_username": "admin01",
        "actor_role": 1,
        "changes": null,
        "snapshot": { "...": "Đầy đủ dữ liệu đơn trước khi xóa" },
        "metadata": { "hard_deleted": true, "was_soft_deleted": false, "source": "admin_enrollment" },
        "created_at": "2026-11-20T06:45:12.000Z"
      },
      {
        "id": 89,
        "enrollment_id": 22,
        "enrollment_code": "DEL22",
        "action": "UPDATE",
        "reason": "Quản trị viên cập nhật thông tin đơn đăng ký",
        "actor_type": "USER",
        "actor_id": 7,
        "actor_name": "Lê Văn Nhân Viên",
        "actor_username": "staff02",
        "actor_role": 4,
        "changes": {
          "status": { "old": 1, "new": 2 },
          "payment_status": { "old": 2, "new": 1 }
        },
        "snapshot": null,
        "metadata": { "created_new_student_account": false, "source": "admin_enrollment" },
        "created_at": "2026-11-12T03:10:00.000Z"
      },
      {
        "id": 60,
        "enrollment_id": 22,
        "enrollment_code": "DEL22",
        "action": "CREATE",
        "reason": "Học viên đã đăng nhập tạo đơn đăng ký khóa học",
        "actor_type": "USER",
        "actor_id": 55,
        "actor_name": "Phạm Văn D",
        "actor_username": "2026-0005",
        "actor_role": 2,
        "changes": null,
        "snapshot": { "...": "Dữ liệu đơn lúc mới tạo" },
        "metadata": { "is_logged": true, "source": "public_enrollment" },
        "created_at": "2026-11-10T03:20:00.000Z"
      }
    ]
  },
  "meta": {
    "total": 3,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

## 4. Bảng Ánh Xạ Tên Trường Trong `changes` (Để Render Diff `Cũ → Mới`)

Trường `changes` có cấu trúc `Record<string, { old: any; new: any }>` và **chỉ chứa những trường thực sự thay đổi**. FE dùng bảng dưới đây để đổi key sang nhãn tiếng Việt và format giá trị:

| Key trong `changes` | Nhãn tiếng Việt | Kiểu & Cách format |
| :--- | :--- | :--- |
| `status` | Trạng thái đơn | Enum `StatusEnrollment` (`1`: Chờ thanh toán, `2`: Đã hoàn thành, `3`: Thanh toán sau, `4`: Nợ học phí) |
| `payment_status` | Trạng thái thanh toán | Enum `PaymentStatus` (`1`: Đã thanh toán, `2`: Chưa thanh toán) |
| `payment_method` | Phương thức thanh toán | Enum `PaymentMethod` (`1`: Tiền mặt, `2`: Chuyển khoản) |
| `class_ids` | Danh sách lớp đăng ký | Mảng `EnrollmentLogClassSnapshot[]` — hiển thị `[class_code] class_name (hình thức học)` |
| `total_fee` | Tổng học phí | Tiền tệ VNĐ (`number`, vd `400.000 đ`) |
| `prepaid` | Tiền đã đóng / trả trước | Tiền tệ VNĐ (`number`) |
| `debt` | Công nợ còn lại | Tiền tệ VNĐ (`number`) |
| `discount` | Số tiền giảm giá | Tiền tệ VNĐ (`number`) |
| `voucher_code` | Mã voucher | `string \| null` |
| `student_id` | ID học viên | `number \| null` (có thể ẩn nếu đã hiển thị `student_code`) |
| `student_code` | Mã học viên | `string \| null` |
| `note` | Ghi chú quản trị | `string \| null` |
| `user_note` | Ghi chú học viên | `string \| null` |
| `is_read_note` | Đã đọc ghi chú | `boolean \| null` (`true`: Đã đọc, `false`: Chưa đọc) |
| `deleted_at` | Trạng thái xóa mềm | ISO datetime \| `null` (`null → timestamp`: Đã xóa mềm; `timestamp → null`: Đã khôi phục) |
| `saint_name` | Tên thánh | `string \| null` |
| `full_name` | Họ và tên | `string \| null` |
| `gender` | Giới tính | Enum `Gender` (`0`: Khác, `1`: Nam, `2`: Nữ) |
| `email` | Email | `string \| null` |
| `phone_number` | Số điện thoại | `string \| null` |
| `birth_date` | Ngày sinh | `YYYY-MM-DD` → format `DD/MM/YYYY` |
| `address` | Địa chỉ | `string \| null` |
| `birth_place` | Nơi sinh | `string \| null` |
| `parish` | Giáo xứ | `string \| null` |
| `deanery` | Giáo hạt | `string \| null` |
| `diocese` | Giáo phận | `string \| null` |
| `congregation` | Dòng tu | `string \| null` |
| `shipping_name` | Người nhận sách | `string \| null` |
| `shipping_phone` | SĐT nhận sách | `string \| null` |
| `shipping_address` | Địa chỉ nhận sách | `string \| null` |
| `shipping_note` | Ghi chú nhận sách | `string \| null` |

---

## 5. TypeScript Types & Helper Sẵn Dùng Cho Frontend

FE có thể copy trực tiếp đoạn code sau vào `types/enrollment-log.ts` và `api/enrollment-logs.ts`:

```ts
export type EnrollmentLogAction =
  | 'CREATE'
  | 'UPDATE'
  | 'RESTORE'
  | 'SOFT_DELETE'
  | 'AUTO_SOFT_DELETE'
  | 'DELETE'
  | 'SYNC_FROM_STUDENT'
  | 'SYSTEM_UPDATE'
  | 'SEND_PAYMENT_EMAIL'
  | 'SEND_ACCOUNT_EMAIL'
  | 'SEND_INSTRUCTION_EMAIL'

export type EnrollmentLogActorType = 'USER' | 'GUEST' | 'SYSTEM'

export type EnrollmentExistenceState = 'ACTIVE' | 'SOFT_DELETED' | 'HARD_DELETED'

export interface EnrollmentLogFieldChange<T = any> {
  old: T
  new: T
}

export interface EnrollmentLogClassSnapshot {
  class_id: number
  class_code: string | null
  class_name: string | null
  price: number | null
  learn_type: 1 | 2 | 3
}

export interface EnrollmentLogSnapshot {
  id: number
  code: string | null
  registration_date: string | null
  payment_method: number | null
  payment_status: number | null
  status: number | null
  voucher_code: string | null
  discount: number
  class_ids: EnrollmentLogClassSnapshot[]
  total_fee: number
  prepaid: number
  debt: number
  note: string | null
  user_note: string | null
  is_read_note: boolean | null
  is_logged: boolean
  saint_name: string | null
  gender: number | null
  full_name: string | null
  email: string | null
  phone_number: string | null
  birth_date: string | null
  address: string | null
  shipping_name: string | null
  shipping_phone: string | null
  shipping_address: string | null
  shipping_note: string | null
  birth_place: string | null
  parish: string | null
  deanery: string | null
  diocese: string | null
  congregation: string | null
  student_id: number | null
  student_code: string | null
  created_at: string | null
  updated_at: string | null
  deleted_at: string | null
}

export interface EnrollmentLogItem {
  id: number
  enrollment_id: number
  enrollment_code: string | null
  student_id: number | null
  student_name: string | null
  student_name_normalized: string | null
  student_code: string | null
  action: EnrollmentLogAction
  reason: string | null
  actor_type: EnrollmentLogActorType
  actor_id: number | null
  actor_name: string | null
  actor_username: string | null
  actor_role: number | null
  changes: Record<string, EnrollmentLogFieldChange> | null
  snapshot: EnrollmentLogSnapshot | null
  metadata: Record<string, any> | null
  created_at: string
  enrollment_state?: EnrollmentExistenceState
}

export interface PaginateEnrollmentLogsParams {
  page?: number
  limit?: number
  enrollment_id?: number
  enrollment_code?: string
  search?: string
  actor_id?: number
  actor_type?: EnrollmentLogActorType
  action?: string // VD: 'DELETE' hoặc 'UPDATE,RESTORE'
  only_hard_deleted?: boolean
  from_date?: string
  to_date?: string
  orderBy?: 'created_at' | 'id' | 'enrollment_id' | 'action'
  orderDirection?: 'ASC' | 'DESC'
}

export interface SingleEnrollmentLogsData {
  enrollment_id: number
  enrollment_code: string | null
  enrollment_state: EnrollmentExistenceState
  latest_snapshot: EnrollmentLogSnapshot | null
  logs: EnrollmentLogItem[]
}
```

### Ví dụ gọi API (Axios)
```ts
// 1. Danh sách log tổng hợp
export const getEnrollmentLogs = (params: PaginateEnrollmentLogsParams) =>
  axiosClient.get('/admin/enrollments/logs', { params })

// 2. Chi tiết 1 bản ghi log
export const getEnrollmentLogById = (logId: number) =>
  axiosClient.get(`/admin/enrollments/logs/${logId}`)

// 3. Lịch sử của 1 đơn (kể cả đã xóa cứng)
export const getLogsByEnrollmentId = (
  enrollmentId: number,
  params?: Omit<PaginateEnrollmentLogsParams, 'enrollment_id' | 'enrollment_code' | 'search' | 'only_hard_deleted'>,
) => axiosClient.get(`/admin/enrollments/${enrollmentId}/logs`, { params })
```

---

## 6. Hướng Dẫn Tích Hợp UI Khuyến Nghị Cho FE

1. **2 vị trí gắn giao diện để không bỏ sót đơn đã xóa cứng:**
   - **Vị trí A — Tab "Lịch sử thao tác" ngay trong Modal/Trang Chi tiết đơn đăng ký:** gọi `GET /admin/enrollments/:id/logs`. Hiển thị timeline theo thứ tự mới nhất trước, mỗi dòng hiển thị: thời gian, người thực hiện, badge `action`, dòng `reason`, và bảng diff `Trường | Giá trị cũ | Giá trị mới`.
   - **Vị trí B — Màn hình riêng "Lịch sử đơn đăng ký" trên Menu Admin (bên cạnh Danh sách đơn & Đơn đã xóa mềm):** gọi `GET /admin/enrollments/logs`.
     - Có thanh lọc nhanh: **Ô tìm kiếm (`search`)**, **Hành động (`action`)**, **Tác nhân (`actor_type`: Tất cả / Nhân viên / Khách / Hệ thống)**, **Khoảng ngày (`from_date` - `to_date`)**, và nút gạt/tab **"Chỉ xem đơn đã xóa vĩnh viễn"** (`only_hard_deleted=true`).
     - Khi bấm vào mã đơn của 1 dòng có `enrollment_state === 'HARD_DELETED'`, mở Drawer/Modal gọi `GET /admin/enrollments/:enrollment_id/logs`: phần trên hiển thị lại thông tin đơn từ `latest_snapshot` (kèm banner đỏ *"Đơn này đã bị xóa vĩnh viễn — đang hiển thị bản chụp trước khi xóa"*), phần dưới hiển thị toàn bộ lịch sử `logs` của đơn đó.
2. **Hiển thị phân biệt thao tác do Hệ thống làm:**
   - Kiểm tra `log.actor_type === 'SYSTEM' || Boolean(log.metadata?.triggered_by)` để gắn tag `"Tự động (Hệ thống)"` và in rõ `log.reason` ngay dưới tên hành động.
   - Riêng với `SYNC_FROM_STUDENT`: hiển thị `"Hệ thống đồng bộ từ hồ sơ học viên (kích hoạt bởi: <actor_name>)"` để vừa biết hệ thống tự chạy, vừa biết nhân viên nào đã sửa hồ sơ học viên.
3. **Lưu ý múi giờ hiển thị:**
   - Trường `created_at` trả về chuẩn ISO UTC (vd `2026-11-20T06:45:12.000Z`), FE format sang múi giờ Việt Nam (`Asia/Ho_Chi_Minh`, `DD/MM/YYYY HH:mm:ss`) bằng `dayjs` / `date-fns` / `Intl.DateTimeFormat`.
4. **Danh sách mã lỗi có thể trả về:**
   - `401 Unauthorized`: Chưa đăng nhập / token hết hạn.
   - `403 Forbidden`: Tài khoản không thuộc `SUPER_ADMIN`, `ADMIN`, `STAFF` (hoặc `FINANCE`).
   - `404 Not Found` (`ENROLLMENT_LOG_NOT_FOUND`): Không tìm thấy bản ghi log ở `GET /admin/enrollments/logs/:logId`.
