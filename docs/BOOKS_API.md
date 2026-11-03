# Tài Liệu API Giáo Trình / Sách & Quản Lý Ship Sách (Dành cho Frontend)

## 1. Tổng quan Luồng Nghiệp vụ Mới

1. **Gắn lớp học vào Sách (`Book` ↔ `Classes`):**
   - Khi Admin tạo hoặc sửa một cuốn **Sách / Giáo trình**, Admin truyền mảng `class_ids` (danh sách ID các lớp sử dụng cuốn sách đó).
   - Bên API tạo/sửa Lớp học (`Classes`) **không còn** nhận `book_ids` nữa.
2. **Học viên đăng ký học Online (`Enrollments`):**
   - Khi học viên gửi form đăng ký học (`POST /enrollments`), nếu có chọn lớp học Online (`learn_type = 2` (Video) hoặc `learn_type = 3` (Meeting)), FE cho học viên nhập thêm trường `shipping_address` (**địa chỉ mới để nhận sách**, độc lập với `address` cá nhân của học viên).
   - Khi Admin duyệt đơn đăng ký (`PUT /admin/enrollments/:id`) chuyển `status` sang khác `1 (PENDING)` (tức là `2: DONE`, `3: PAY_LATE`, `4: DEBT`), hệ thống tự động tạo các bản ghi trong bảng `student_books` cho học viên đối với tất cả sách của các lớp học Online trong đơn kèm `class_id` và `shipping_address` của đơn.
3. **Quản lý Ship sách (`student_books`) & Cơ chế Đồng bộ / Đánh dấu (`change_status`):**
   - Giáo trình/sách gắn với **Học viên (`Student`)** tại bảng `student_books`, kèm cột `class_id` thể hiện học viên nhận cuốn sách này từ lớp nào.
   - **Khi thêm hoặc xóa lớp khỏi sách (`PUT /admin/books/:id`, `PATCH /admin/books/:id/classes`):**
     - Nếu thêm lớp: Tự động gắn sách cho các học viên đang học online ở lớp mới (`change_status = 0`).
     - Nếu xóa lớp khỏi sách (và học viên không còn học online ở lớp nào khác dùng sách này):
       - Nếu `book_status = 1 (NOT_SENT)` -> **Xóa** bản ghi `student_books`.
       - Nếu `book_status = 2 (SENDING)` hoặc `3 (RECEIVED)` -> **Không xóa**, giữ lại bản ghi và đánh dấu `change_status = 1 (CLASS_REMOVED)`.
   - **Khi học viên đổi lớp / rời lớp (`PUT /admin/enrollments/:id`, `DELETE /admin/enrollments/:id`, `DELETE /admin/class/remove-students/:id`):**
     - Nếu học viên không còn học online ở bất kỳ lớp nào dùng cuốn sách đó:
       - Nếu `book_status = 1 (NOT_SENT)` -> **Xóa** bản ghi `student_books`.
       - Nếu `book_status = 2 (SENDING)` hoặc `3 (RECEIVED)` -> **Không xóa**, giữ lại bản ghi và đánh dấu `change_status = 2 (STUDENT_CHANGED_CLASS)`.

---

## 2. Các Enum sử dụng

### `BookDeliveryStatus` (`book_status` - Trạng thái giao sách)
| Giá trị | Tên hằng | Ý nghĩa |
| :---: | :--- | :--- |
| `1` | `NOT_SENT` | Chưa gửi |
| `2` | `SENDING` | Đang gửi / Đã gửi bưu điện |
| `3` | `RECEIVED` | Đã nhận sách |

### `StudentBookChangeStatus` (`change_status` - Đánh dấu biến động lớp/sách khi sách đang gửi hoặc đã nhận)
| Giá trị | Tên hằng | Ý nghĩa |
| :---: | :--- | :--- |
| `0` | `NORMAL` | Bình thường (Học viên vẫn đang học lớp sử dụng sách này) |
| `1` | `CLASS_REMOVED` | Lớp học đã bị gỡ khỏi sách khi sách đang gửi (`2`) hoặc đã nhận (`3`) |
| `2` | `STUDENT_CHANGED_CLASS` | Học viên đã đổi lớp / rời lớp khi sách đang gửi (`2`) hoặc đã nhận (`3`) |

### `LearnType` (Hình thức học khi đăng ký)
| Giá trị | Tên hằng | Ý nghĩa |
| :---: | :--- | :--- |
| `1` | `OFFLINE` | Học trực tiếp (không tạo ship sách) |
| `2` | `VIDEO` | Học qua Video (Online - tự động gắn sách cần ship) |
| `3` | `MEETING` | Học qua Meeting/Zoom (Online - tự động gắn sách cần ship) |

---

## 3. API Quản lý Danh mục Sách / Giáo trình (Admin & Public)

### 3.1. Tạo mới Sách — `POST /admin/books`
**Body (JSON):**
```json
{
  "name": "Giáo trình Thần học Cơ bản",
  "code": "GT-TH-01",
  "author": "Lm. Nguyễn Văn A",
  "publisher": "NXB Tôn Giáo",
  "publication_year": 2026,
  "image": "https://example.com/book.jpg",
  "description": "Mô tả giáo trình",
  "class_ids": [1, 2, 5]
}
```

| Field | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :---: | :--- |
| `name` | `string` | Có | Tên giáo trình / sách |
| `code` | `string` | Không | Mã sách (unique nếu có truyền) |
| `author` | `string` | Không | Tác giả |
| `publisher` | `string` | Không | Nhà xuất bản |
| `publication_year` | `number` | Không | Năm xuất bản |
| `image` | `string` | Không | URL ảnh bìa |
| `description` | `string` | Không | Mô tả |
| `class_ids` | `number[]` | Không | Danh sách ID các lớp học gắn với cuốn sách này |

---

### 3.2. Cập nhật Sách — `PUT /admin/books/:id`
- **Body:** Giống `POST /admin/books` (tất cả các field đều là optional).
- Nếu truyền `class_ids` (VD: `[1, 3]`): Hệ thống sẽ cập nhật lại danh sách lớp của sách và tự động đồng bộ `student_books` (thêm học viên lớp mới; xóa bản ghi `NOT_SENT` hoặc đánh dấu `change_status = 1` cho bản ghi `SENDING`/`RECEIVED` của lớp bị gỡ).

---

### 3.3. Cập nhật nhanh danh sách Lớp gắn vào Sách — `PATCH /admin/books/:id/classes`
**Body (JSON):**
```json
{
  "class_ids": [1, 2, 5]
}
```

---

### 3.4. Danh sách Sách — `GET /admin/books` (hoặc Public `GET /books`)
**Query Params:**
| Param | Kiểu | Mô tả |
| :--- | :--- | :--- |
| `page` | `number` | Trang hiện tại (mặc định `1`) |
| `limit` | `number` | Số bản ghi mỗi trang (mặc định `10`) |
| `search` | `string` | Tìm kiếm chung |
| `name` | `string` | Lọc theo tên sách |
| `code` | `string` | Lọc theo mã sách |
| `author` | `string` | Lọc theo tác giả |
| `publisher` | `string` | Lọc theo nhà xuất bản |
| `class_id` | `number` | Lọc các cuốn sách đang gắn với lớp `class_id` |

**Response `data` item mẫu (áp dụng cho cả `GET /admin/books/:id` và `GET /books/:id`):**
```json
{
  "id": 1,
  "code": "GT-TH-01",
  "name": "Giáo trình Thần học Cơ bản",
  "author": "Lm. Nguyễn Văn A",
  "publisher": "NXB Tôn Giáo",
  "publication_year": 2026,
  "image": "https://example.com/book.jpg",
  "description": "Mô tả giáo trình",
  "classes": [
    {
      "id": 1,
      "code": "TH_K1",
      "name": "Thần học căn bản",
      "status": 1,
      "is_online": true,
      "learn_offline": true,
      "learn_video": true,
      "learn_meeting": false,
      "opening_day": "2026-11-01",
      "closing_day": "2027-01-30"
    }
  ],
  "created_at": "2026-10-30T09:00:00.000Z",
  "updated_at": "2026-10-30T09:00:00.000Z"
}
```

---

## 4. API Đăng ký Học (`Enrollments`) - Thêm `shipping_address`

### 4.1. Tạo đơn đăng ký học — `POST /enrollments`
& **Cập nhật đơn đăng ký học — `PUT /admin/enrollments/:id`**

Bổ sung thêm trường `shipping_address` trong Body:
```json
{
  "class_ids": [
    { "class_id": 1, "learn_type": 2 }
  ],
  "payment_method": 2,
  "full_name": "Nguyễn Văn B",
  "gender": 1,
  "phone_number": "0901234567",
  "address": "Địa chỉ hộ khẩu / thường trú của học viên",
  "shipping_address": "Số 456 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM"
}
```

| Field mới | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :---: | :--- |
| `shipping_address` | `string` | Không | Địa chỉ mới để nhận sách (dùng khi học viên đăng ký lớp có `learn_type = 2` hoặc `3`). Không ghi đè vào `address` của học viên. |

> **Lưu ý:** Trong response của `GET /admin/enrollments` và `GET /admin/enrollments/:id` cũng trả về thêm trường `shipping_address`.

---

## 5. API Quản lý Ship Sách cho Học viên (Admin)

### 5.1. Danh sách Ship sách cho Học viên — `GET /admin/books/student-books`
API chính để Admin theo dõi và đi gửi sách cho học viên.

**Query Params:**
| Param | Kiểu | Mô tả |
| :--- | :--- | :--- |
| `page` | `number` | Trang hiện tại |
| `limit` | `number` | Số lượng mỗi trang |
| `book_status` | `number` | Lọc theo trạng thái giao sách: `1` (Chưa gửi), `2` (Đang gửi), `3` (Đã nhận) |
| `change_status` | `number` | Lọc theo trạng thái biến động: `0` (Bình thường), `1` (Lớp bị gỡ khỏi sách), `2` (Học viên đổi/rời lớp) |
| `student_id` | `number` | Lọc theo ID học viên |
| `book_id` | `number` | Lọc theo ID sách |
| `class_id` | `number` | **Lọc theo ID lớp học** (mới) |
| `semester_id` | `number` | **Lọc theo ID học kỳ** của lớp (mới) |
| `scholastic_id` | `number` | **Lọc theo ID niên khóa** của lớp (mới) |
| `full_name` | `string` | Tìm theo họ tên học viên (hỗ trợ có dấu / không dấu) |
| `code` | `string` | Tìm theo mã học viên |
| `phone_number` | `string` | Tìm theo số điện thoại học viên |
| `book_name` | `string` | Tìm theo tên sách |
| `book_code` | `string` | Tìm theo mã sách |
| `shipping_address` | `string` | Tìm theo địa chỉ nhận sách |

**Response `data` item mẫu:**
```json
{
  "id": 10,
  "student_id": 25,
  "book_id": 1,
  "class_id": 1,
  "book_status": 1,
  "change_status": 0,
  "shipping_address": "Số 456 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM",
  "book_delivery_note": null,
  "book_received_date": null,
  "created_at": "2026-10-30T09:15:00.000Z",
  "updated_at": "2026-10-30T09:15:00.000Z",
  "student": {
    "id": 25,
    "code": "HV2026025",
    "full_name": "Nguyễn Văn B",
    "first_name": "B",
    "saint_name": "Giuse",
    "email": "nguyenvanb@example.com",
    "phone_number": "0901234567",
    "gender": 1,
    "avatar": "https://..."
  },
  "book": {
    "id": 1,
    "code": "GT-TH-01",
    "name": "Giáo trình Thần học Cơ bản",
    "author": "Lm. Nguyễn Văn A",
    "publisher": "NXB Tôn Giáo",
    "publication_year": 2026,
    "image": "https://example.com/book.jpg",
    "description": "Mô tả giáo trình"
  },
  "class": {
    "id": 1,
    "name": "Thần học căn bản",
    "code": "TH_K1",
    "semester": {
      "id": 2,
      "name": "Học kỳ I"
    },
    "scholastic": {
      "id": 5,
      "name": "2026 - 2027"
    }
  }
}
```

---

### 5.2. Cập nhật Trạng thái Ship Sách / Địa chỉ nhận sách
FE có thể gọi **1 trong 2** endpoint sau (tùy chỗ đứng trên UI):
- **Cách 1 (Theo `id` của bản ghi `student_books`):** `PATCH /admin/books/student-books/:id`
- **Cách 2 (Theo `bookId` và `studentId`):** `PATCH /admin/books/:bookId/students/:studentId`

**Body (JSON):**
```json
{
  "book_status": 2,
  "change_status": 0,
  "class_id": 1,
  "shipping_address": "Số 789 Trần Hưng Đạo, Q.5, TP.HCM",
  "book_delivery_note": "VNPost: VN123456789",
  "book_received_date": "2026-10-30"
}
```

| Field | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :---: | :--- |
| `book_status` | `number` | Không | `1`: Chưa gửi, `2`: Đang gửi, `3`: Đã nhận sách |
| `change_status` | `number` | Không | `0`: Bình thường, `1`: Lớp đã xóa khỏi sách, `2`: Học viên đã đổi lớp |
| `class_id` | `number` | Không | ID lớp học mà học viên nhận sách |
| `shipping_address` | `string` | Không | Cập nhật địa chỉ nhận sách mới |
| `book_delivery_note` | `string` | Không | Ghi chú giao hàng / Mã vận đơn bưu điện |
| `book_received_date` | `string` | Không | Ngày nhận sách (`YYYY-MM-DD`). Nếu chuyển `book_status = 3` mà không truyền ngày, BE tự động điền ngày hiện tại. |

---

### 5.3. Các API phụ trợ khác cho Admin & Học viên
- **`GET /admin/books/student-books/:id`**: Xem chi tiết 1 bản ghi ship sách (có đầy đủ `student`, `book`, `class`).
- **`POST /admin/books/student-books`**: Admin gán thủ công 1 cuốn sách cho học viên (`{ student_id, book_id, class_id?, shipping_address?, book_status?, book_delivery_note? }`).
- **`DELETE /admin/books/student-books/:id`**: Xóa 1 bản ghi sách của học viên.
- **`GET /admin/books/students/:studentId`** (hoặc xem trường `books` trong **`GET /admin/students/:id`**): Lấy danh sách tất cả giáo trình/sách của 1 học viên cụ thể (hỗ trợ filter `class_id`, `semester_id`, `scholastic_id`, `book_status`, `change_status`).
- **`GET /student/books`** *(Role `STUDENT`)*: Học viên đang đăng nhập tự xem danh sách giáo trình/sách của mình và trạng thái giao sách.
