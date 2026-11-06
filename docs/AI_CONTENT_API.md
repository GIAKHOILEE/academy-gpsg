# Tài Liệu API: Tính Năng AI Gen Content Hàng Loạt & Quản Lý Bài Viết AI (Dành cho Frontend)

Tài liệu này mô tả chi tiết luồng hoạt động, các trường (fields) mới được bổ sung vào 3 module hiện có (`story`, `witness-faiths`, `post-catalog-top`), cũng như toàn bộ Request/Response của bộ API tạo và quản lý bài viết AI.

---

## 1. Tổng quan Luồng Nghiệp vụ

1. **Gửi yêu cầu tạo hàng loạt (Bulk AI Generation):**
   - Admin chọn danh mục đích thuộc 1 trong 3 module:
     - **Story (`story`)**: truyền `topic_id`
     - **Witness Faiths (`witness-faiths`)**: truyền `witness_faith_menu_id`
     - **Post Catalog Top (`post-catalog-top`)**: truyền `post_catalog_id` (danh mục có `type = 1 (TOP)`)
   - Admin nhập: khoảng thời gian `deadline` (`start_day`, `end_day`), số lượng bài cần tạo (`quantity`), tùy chọn có tạo ảnh hay không (`is_image`), và nội dung yêu cầu (`prompt`).
2. **Hàng chờ (Queue) & Cronjob tự động tránh Rate Limit:**
   - Ngay khi Admin bấm tạo, API phản hồi ngay lập tức (không bắt FE phải chờ AI viết xong hết):
     - Tạo 1 đợt (`AiContentBatch`) quản lý tiến độ chung.
     - Tạo `quantity` bài viết giữ chỗ trong hàng chờ (`AiContentItem`) và tạo sẵn `quantity` bản ghi tương ứng trong bảng của module (`stories`, `witness_faiths`, `posts`) với trạng thái `ai_status = "PENDING"`.
     - Các bản ghi đang `PENDING` / `PROCESSING` / `FAILED` **chỉ hiển thị ở trang Admin**, tự động ẩn khỏi các API Public của User cho tới khi `ai_status = "COMPLETED"`.
   - Hệ thống chạy Cronjob mỗi phút:
     - Mỗi lần chỉ tạo **1 bài duy nhất** (độ dài chuẩn **1000 – 3000 từ** định dạng HTML bằng model `gemini-3.5-flash-lite`).
     - Sau khi bài trước tạo xong (`last_completed_at`), hệ thống nghỉ một khoảng thời gian (`interval_minutes`, mặc định `5 phút` hoặc tự động co giãn theo `end_day`) rồi mới tự động tạo bài tiếp theo để không chạm giới hạn (rate limit) của model.
3. **Tự động Gen Ảnh + Upload Server + Fallback Ảnh trên mạng:**
   - Nếu `is_image = true`:
     - Hệ thống gọi model `gemini-3.1-flash-lite-image` (nếu lỗi/vượt quota sẽ chuyển sang `gemini-2.5-flash-image`).
     - Khi gen ảnh thành công: tự động gọi service upload ảnh lên Server lưu trữ của hệ thống và gắn URL vào bài viết (`image_source = "AI_GENERATED"`).
     - Nếu cả 2 model ảnh đều bị chạm limit: tự động tìm link ảnh phù hợp trên mạng (Wikimedia Commons / Openverse / Unsplash) để gắn tạm vào bài viết (`image_source = "WEB_FALLBACK"`).

---

## 2. Các Enum sử dụng

### 2.1. `AiStatus` (`ai_status` / `status` — Trạng thái tiến trình AI)
| Giá trị | Ý nghĩa hiển thị trên FE |
| :--- | :--- |
| `null` | Bài viết / danh mục được tạo thủ công bình thường (không dùng AI) |
| `"PENDING"` | **Đang chờ gen** (Đang nằm trong hàng đợi chờ đến lượt cronjob) |
| `"PROCESSING"` | **Đang gen** (AI đang trong quá trình viết bài / tạo ảnh) |
| `"COMPLETED"` | **Đã gen xong** (Đã hoàn tất nội dung 1000-3000 từ & gắn vào module) |
| `"FAILED"` | **Gen thất bại** (Quá 3 lần thử bị lỗi, Admin có thể bấm Retry / Gen lại) |
| `"CANCELLED"` | **Đã hủy** (Admin đã hủy đợt chờ) |

### 2.2. `AiModuleType` (`module_type` — Định danh 3 module)
| Giá trị | Module tương ứng | Khoá ngoại danh mục | Bảng dữ liệu bài viết đích |
| :--- | :--- | :--- | :--- |
| `"story"` | Module Câu chuyện (Stories) | `topic_id` | `stories` |
| `"witness-faiths"` | Module Chứng nhân đức tin | `witness_faith_menu_id` | `witness_faiths` |
| `"post-catalog-top"` | Module Danh mục bài viết Top | `post_catalog_id` | `posts` (thuộc catalog `type = 1`) |

### 2.3. `AiImageSource` (`image_source` — Nguồn ảnh của bài viết AI)
| Giá trị | Ý nghĩa |
| :--- | :--- |
| `"AI_GENERATED"` | Ảnh do AI (`gemini-3.1-flash-lite-image` / `gemini-2.5-flash-image`) tạo và đã upload lên server |
| `"WEB_FALLBACK"` | Link ảnh tìm tự động trên mạng thế tạm khi model tạo ảnh bị chạm limit |
| `"MANUAL"` | Ảnh do Admin cập nhật thủ công |
| `"NONE"` | Bài viết không yêu cầu ảnh (`is_image = false` hoặc chưa tạo xong) |

---

## 3. Các Field mới được thêm vào 3 Module hiện có

Để FE dễ dàng hiển thị badge trạng thái AI ngay trên danh sách hiện có của 3 module, các API cũ đã được bổ sung thêm trường như sau:

### 3.1. Module `story` (`/admin/stories` & `/admin/topics`)
- **Trên bản ghi Story (`GET /admin/stories`, `GET /admin/stories/:id`, `POST /admin/stories`):**
  | Field mới | Kiểu | Mô tả |
  | :--- | :--- | :--- |
  | `ai_status` | `AiStatus \| null` | Trạng thái AI của bài truyện (`null`, `"PENDING"`, `"PROCESSING"`, `"COMPLETED"`, `"FAILED"`) |
  | `ai_batch_id` | `number \| null` | ID đợt gen AI hàng loạt đã tạo ra bài truyện này (dùng để dẫn link sang chi tiết đợt nếu cần) |
  | `ai_request_count` | `number` | **Tổng số request AI** mà bài viết này đã sử dụng (tạo bài, mở rộng từ, tạo ảnh, gen lại, dùng AI chỉnh sửa...) |
- **Query filter mới cho `GET /admin/stories`:**
  | Query Param | Kiểu | Mô tả |
  | :--- | :--- | :--- |
  | `ai_status` | `AiStatus` | Lọc danh sách truyện theo trạng thái AI (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`) |
- **Trên bản ghi Chủ đề Topic (`GET /admin/topics`, `GET /admin/topics/:id`):**
  | Field mới | Kiểu | Mô tả |
  | :--- | :--- | :--- |
  | `ai_status` | `AiStatus \| null` | Trạng thái AI tổng hợp của chủ đề (cho biết chủ đề này đang có đợt gen AI đang chờ `PENDING`, đang chạy `PROCESSING` hay đã xong `COMPLETED`) |

---

### 3.2. Module `witness-faiths` (`/admin/witness-faiths` & `/admin/witness-faith/menus`)
- **Trên bản ghi Witness Faith (`GET /admin/witness-faiths`, `GET /admin/witness-faiths/:id`, `POST /admin/witness-faiths`):**
  | Field mới | Kiểu | Mô tả |
  | :--- | :--- | :--- |
  | `ai_status` | `AiStatus \| null` | Trạng thái AI của bài viết chứng nhân đức tin |
  | `ai_batch_id` | `number \| null` | ID đợt gen AI hàng loạt |
  | `ai_request_count` | `number` | **Tổng số request AI** mà bài viết này đã sử dụng |
  | `created_at` | `string (ISO)` | Thời gian tạo bài viết (đã bổ sung vào danh sách trả về) |
- **Query filter mới cho `GET /admin/witness-faiths`:**
  | Query Param | Kiểu | Mô tả |
  | :--- | :--- | :--- |
  | `ai_status` | `AiStatus` | Lọc danh sách theo trạng thái AI (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`) |
- **Trên bản ghi Menu (`GET /admin/witness-faith/menus`, `GET /admin/witness-faith/menus/:id`):**
  | Field mới | Kiểu | Mô tả |
  | :--- | :--- | :--- |
  | `ai_status` | `AiStatus \| null` | Trạng thái AI tổng hợp của menu chứng nhân đức tin |

---

### 3.3. Module `post-catalog-top` & `post` (`/admin/post-catalog-top` & `/admin/post/top`)
- **Trên bản ghi Danh mục (`GET /admin/post-catalog-top`, `GET /admin/post-catalog-top/:id`, bao gồm cả các `children` đệ quy):**
  | Field mới | Kiểu | Mô tả |
  | :--- | :--- | :--- |
  | `ai_status` | `AiStatus \| null` | Trạng thái AI tổng hợp của danh mục Post Catalog Top |
- **Query filter mới cho `GET /admin/post-catalog-top`:**
  | Query Param | Kiểu | Mô tả |
  | :--- | :--- | :--- |
  | `ai_status` | `AiStatus` | Lọc danh mục theo trạng thái AI |
- **Trên bản ghi Bài viết (`GET /admin/post/top`, `GET /admin/post`, `GET /admin/post/:id`):**
  | Field mới | Kiểu | Mô tả |
  | :--- | :--- | :--- |
  | `ai_status` | `AiStatus \| null` | Trạng thái AI của bài viết |
  | `ai_batch_id` | `number \| null` | ID đợt gen AI hàng loạt |
  | `ai_request_count` | `number` | **Tổng số request AI** mà bài viết này đã sử dụng |
  | `created_at` | `string (ISO)` | Thời gian tạo bài viết |
  | `post_catalog.ai_status` | `AiStatus \| null` | Trạng thái AI của danh mục chứa bài viết |
- **Query filter mới cho `GET /admin/post/top` và `GET /admin/post`:**
  | Query Param | Kiểu | Mô tả |
  | :--- | :--- | :--- |
  | `ai_status` | `AiStatus` | Lọc bài viết theo trạng thái AI (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`) |

---

## 4. API Tạo Nội Dung AI Hàng Loạt tại 3 Module

FE có thể gọi trực tiếp API tại từng module hoặc gọi qua API tập trung `/admin/ai-content/batches`. Tất cả các API đều yêu cầu quyền `ADMIN` hoặc `STAFF` (Bearer Token).

### 4.1. Tạo hàng loạt ở Module Story — `POST /admin/stories/ai-generate`
**Request Body (JSON):**
```json
{
  "topic_id": 1,
  "start_day": "2026-11-06",
  "end_day": "2026-11-10",
  "quantity": 5,
  "is_image": true,
  "prompt": "Viết chuỗi câu chuyện cảm động về lòng bác ái và đức tin trong đời sống gia đình",
  "interval_minutes": 5
}
```
*(Lưu ý: Hệ thống hỗ trợ truyền phẳng `start_day`, `end_day` ở ngoài HOẶC truyền lồng trong object `"deadline": { "start_day": "...", "end_day": "..." }` / `"dealine": { "start_day": "...", "end_day": "..." }`, và hỗ trợ cả `"prompt"` lẫn `"promt"`).*

**Bảng mô tả các field trong Request Body:**
| Field | Kiểu | Bắt buộc | Mặc định | Mô tả |
| :--- | :--- | :---: | :---: | :--- |
| `topic_id` | `number` | **Có** | — | ID chủ đề (`Topic`) sẽ chứa các bài Story được tạo |
| `start_day` | `string` | **Có** | Hôm nay | Ngày bắt đầu đợt gen (`YYYY-MM-DD`, `DD/MM/YYYY` hoặc ISO). Có thể đặt trong `deadline.start_day` hoặc `dealine.start_day` |
| `end_day` | `string` | **Có** | +7 ngày | Ngày kết thúc đợt gen (`YYYY-MM-DD`, `DD/MM/YYYY` hoặc ISO). Có thể đặt trong `deadline.end_day` hoặc `dealine.end_day` |
| `quantity` | `number` | **Có** | `1` | Số lượng bài viết cần AI gen trong khoảng deadline (từ `1` đến `200`) |
| `is_image` | `boolean` | Không | `true` | `true`: Có gen ảnh minh họa cho bài viết; `false`: Không dùng ảnh |
| `prompt` | `string` | **Có** | — | Nội dung yêu cầu / chủ đề chi tiết để AI dựa vào đó viết danh sách các bài (hỗ trợ cả key `promt`) |
| `interval_minutes` | `number` | Không | `5` | Thời gian chờ (phút) giữa 2 bài liên tiếp tính từ lúc bài trước gen xong |

---

### 4.2. Tạo hàng loạt ở Module Witness Faiths — `POST /admin/witness-faiths/ai-generate`
**Request Body (JSON):**
```json
{
  "witness_faith_menu_id": 2,
  "start_day": "2026-11-06",
  "end_day": "2026-11-10",
  "quantity": 5,
  "is_image": true,
  "prompt": "Viết chuỗi bài khắc họa cuộc đời và tấm gương sống đạo của các Thánh Tử Đạo Việt Nam"
}
```
- Các field giống hệt mục `4.1`, chỉ thay `topic_id` bằng `witness_faith_menu_id` (`number`, **bắt buộc** — ID menu Chứng nhân đức tin).

---

### 4.3. Tạo hàng loạt ở Module Post Catalog Top — `POST /admin/post-catalog-top/ai-generate`
*(Hoặc gọi qua alias: `POST /admin/post/top/ai-generate`)*

**Request Body (JSON):**
```json
{
  "post_catalog_id": 3,
  "start_day": "2026-11-06",
  "end_day": "2026-11-10",
  "quantity": 5,
  "is_image": true,
  "prompt": "Viết chuỗi bài giới thiệu chuyên sâu về chương trình đào tạo Thần học và Mục vụ tại Học viện"
}
```
- Các field giống hệt mục `4.1`, chỉ thay `topic_id` bằng `post_catalog_id` (`number`, **bắt buộc** — ID danh mục thuộc `post-catalog-top`).

---

### 4.4. Cấu trúc Response chung khi gọi `ai-generate` (HTTP `201`)
```json
{
  "statusCode": 201,
  "messageCode": "STORY_AI_BATCH_CREATED",
  "data": {
    "batch": {
      "id": 10,
      "module_type": "story",
      "category_id": 1,
      "category_name": "Câu chuyện Đức Tin",
      "prompt": "Viết chuỗi câu chuyện cảm động về lòng bác ái...",
      "quantity": 5,
      "completed_count": 0,
      "failed_count": 0,
      "pending_count": 5,
      "is_image": true,
      "deadline": {
        "start_day": "06/11/2026",
        "end_day": "10/11/2026",
        "start_iso": "2026-11-06T00:00:00.000Z",
        "end_iso": "2026-11-10T16:59:59.999Z"
      },
      "interval_minutes": 5,
      "word_range": "1000-3000",
      "status": "PENDING",
      "last_completed_at": null,
      "last_error": null,
      "created_at": "06/11/2026 15:30",
      "updated_at": "06/11/2026 15:30"
    },
    "items": [
      {
        "id": 41,
        "batch_id": 10,
        "module_type": "story",
        "category_id": 1,
        "category_name": null,
        "sequence_number": 1,
        "target_record_id": 105,
        "title": "[AI đang chờ tạo #1/5] Viết chuỗi câu chuyện cảm động về lòng bác ái...",
        "description": null,
        "image_url": null,
        "image_source": "NONE",
        "word_count": 0,
        "is_image": true,
        "status": "PENDING",
        "scheduled_at": "2026-11-06T08:30:00.000Z",
        "started_at": null,
        "completed_at": null,
        "retry_count": 0,
        "error_message": null,
        "created_at": "06/11/2026 15:30"
      }
    ]
  }
}
```

---

## 5. Bộ API Quản Lý Tập Trung Bài Viết & Đợt Gen AI (`/admin/ai-content`)

Dành cho màn hình **Quản lý Nội dung AI** để Admin theo dõi tiến độ hàng chờ, chỉnh sửa nội dung, yêu cầu gen lại hoặc xóa bài viết trên cả 3 module.

### 5.1. Thống kê tổng quan & Trạng thái Worker — `GET /admin/ai-content/stats`
**Response `data` mẫu:**
```json
{
  "worker": {
    "is_processing": false,
    "content_model": "gemini-3.5-flash-lite",
    "image_models": ["gemini-3.1-flash-lite-image", "gemini-2.5-flash-image"],
    "default_interval_minutes": 5,
    "last_completed_at": "2026-11-06T08:35:12.000Z",
    "next_estimated_run_at": "2026-11-06T08:40:12.000Z"
  },
  "batches": {
    "total": 4,
    "pending": 1,
    "processing": 0,
    "completed": 3,
    "failed": 0
  },
  "articles": {
    "total": 20,
    "pending": 3,
    "processing": 0,
    "completed": 17,
    "failed": 0
  },
  "by_module": {
    "story": { "TOTAL": 10, "PENDING": 2, "PROCESSING": 0, "COMPLETED": 8, "FAILED": 0, "CANCELLED": 0 },
    "witness-faiths": { "TOTAL": 5, "PENDING": 1, "PROCESSING": 0, "COMPLETED": 4, "FAILED": 0, "CANCELLED": 0 },
    "post-catalog-top": { "TOTAL": 5, "PENDING": 0, "PROCESSING": 0, "COMPLETED": 5, "FAILED": 0, "CANCELLED": 0 }
  }
}
```
**Giải thích các field trong `worker`:**
| Field | Kiểu | Mô tả |
| :--- | :--- | :--- |
| `is_processing` | `boolean` | `true` nếu AI đang bận viết 1 bài ngay tại thời điểm gọi API |
| `content_model` | `string` | Model đang dùng để viết bài (`gemini-3.5-flash-lite`) |
| `image_models` | `string[]` | Danh sách model tạo ảnh theo thứ tự ưu tiên |
| `default_interval_minutes` | `number` | Số phút nghỉ mặc định giữa 2 bài |
| `last_completed_at` | `string \| null` | Thời gian (ISO) bài viết gần nhất vừa được AI tạo xong |
| `next_estimated_run_at` | `string \| null` | Thời điểm dự kiến (ISO) hệ thống sẽ tự động bắt đầu gen bài tiếp theo trong hàng chờ |

---

### 5.2. Kích hoạt chạy ngay bài tiếp theo trong hàng chờ — `POST /admin/ai-content/trigger-next`
- Dùng khi Admin không muốn đợi hết thời gian chờ 5 phút của cronjob mà muốn ép hệ thống lấy ngay 1 bài `PENDING` tiếp theo ra gen lập tức.

---

### 5.3. Tạo đợt gen AI từ trang Quản lý tập trung — `POST /admin/ai-content/batches`
**Request Body (JSON):**
```json
{
  "module_type": "story",
  "category_id": 1,
  "start_day": "2026-11-06",
  "end_day": "2026-11-10",
  "quantity": 5,
  "is_image": true,
  "prompt": "Viết chuỗi bài về đời sống cầu nguyện",
  "interval_minutes": 5
}
```
| Field | Kiểu | Bắt buộc | Mô tả |
| :--- | :--- | :---: | :--- |
| `module_type` | `AiModuleType` | **Có** | `"story"` \| `"witness-faiths"` \| `"post-catalog-top"` |
| `category_id` | `number` | **Có** | ID của Topic / WitnessFaithMenu / PostCatalogTop (hoặc có thể truyền đúng tên `topic_id`, `witness_faith_menu_id`, `post_catalog_id`) |
| `start_day`, `end_day`, `quantity`, `is_image`, `prompt`, `interval_minutes` | — | **Có** | Giống mục `4.1` |

---

### 5.4. Lấy danh sách các Đợt gen AI (Batches) — `GET /admin/ai-content/batches`
**Query Params:**
| Param | Kiểu | Mô tả |
| :--- | :--- | :--- |
| `page` | `number` | Trang hiện tại (mặc định `1`) |
| `limit` | `number` | Số bản ghi mỗi trang (mặc định `10`) |
| `module_type` | `AiModuleType` | Lọc theo module: `"story"`, `"witness-faiths"`, `"post-catalog-top"` |
| `status` | `AiStatus` | Lọc theo trạng thái đợt: `"PENDING"`, `"PROCESSING"`, `"COMPLETED"`, `"FAILED"`, `"CANCELLED"` |
| `category_id` | `number` | Lọc theo ID danh mục đích |
| `search` | `string` | Tìm kiếm theo nội dung `prompt` hoặc tên danh mục (`category_name`) |

---

### 5.5. Chi tiết 1 Đợt gen AI — `GET /admin/ai-content/batches/:id`
- Trả về thông tin chi tiết của đợt (`batch`) kèm mảng `items` (toàn bộ các bài viết thuộc đợt đó sắp xếp theo `sequence_number` từ `1..quantity`).

---

### 5.6. Cập nhật / Hủy / Thử lại / Xóa Đợt gen AI
| Phương thức | Endpoint | Mô tả & Tham số |
| :--- | :--- | :--- |
| `PUT` | `/admin/ai-content/batches/:id` | Cập nhật `start_day`, `end_day`, `prompt`, `is_image`, `interval_minutes` cho đợt và áp dụng cho các bài đang `PENDING` trong đợt. |
| `PUT` | `/admin/ai-content/batches/:id/cancel` | Hủy tất cả các bài đang `PENDING` chưa chạy trong đợt (và tự động dọn dẹp các bản ghi giữ chỗ rỗng trong module). |
| `PUT` | `/admin/ai-content/batches/:id/retry` | Đưa các bài bị `FAILED` hoặc `CANCELLED` trong đợt quay lại trạng thái `PENDING` để cronjob chạy lại. |
| `DELETE` | `/admin/ai-content/batches/:id` | Xóa đợt gen AI. Có hỗ trợ query `?delete_module_records=true` nếu muốn xóa luôn các bài viết đã tạo xong trong module (mặc định `false`: giữ lại các bài đã gen xong trong module). |

---

### 5.7. Lấy danh sách Bài viết AI (Articles) — `GET /admin/ai-content/articles`
**Query Params:**
| Param | Kiểu | Mô tả |
| :--- | :--- | :--- |
| `page` | `number` | Trang hiện tại (mặc định `1`) |
| `limit` | `number` | Số lượng mỗi trang (mặc định `10`) |
| `module_type` | `AiModuleType` | Lọc theo module (`"story"`, `"witness-faiths"`, `"post-catalog-top"`) |
| `status` | `AiStatus` | Lọc theo trạng thái (`"PENDING"`, `"PROCESSING"`, `"COMPLETED"`, `"FAILED"`, `"CANCELLED"`) |
| `batch_id` | `number` | Lọc các bài thuộc 1 đợt cụ thể |
| `category_id` | `number` | Lọc theo ID danh mục (`topic_id`, `witness_faith_menu_id`, `post_catalog_id`) |
| `image_source` | `AiImageSource` | Lọc theo nguồn ảnh (`"AI_GENERATED"`, `"WEB_FALLBACK"`, `"MANUAL"`, `"NONE"`) |
| `is_image` | `boolean` | Lọc các bài có/không yêu cầu ảnh (`true` / `false`) |
| `search` | `string` | Tìm kiếm theo tiêu đề bài viết (`title`) hoặc `prompt` |

**Mô tả từng field của 1 phần tử Article trả về:**
| Field | Kiểu | Mô tả |
| :--- | :--- | :--- |
| `id` | `number` | ID quản lý của bài viết AI trong bảng `ai_content_items` |
| `batch_id` | `number` | ID đợt gen AI chứa bài viết này |
| `module_type` | `AiModuleType` | Bài viết thuộc module nào (`"story"`, `"witness-faiths"`, `"post-catalog-top"`) |
| `category_id` | `number` | ID danh mục đích (`topic_id` / `witness_faith_menu_id` / `post_catalog_id`) |
| `category_name` | `string \| null` | Tên danh mục đích |
| `sequence_number` | `number` | Thứ tự của bài trong đợt (VD: bài số `1`, `2`, `3`...) |
| `target_record_id` | `number \| null` | **ID thực tế của bài viết trong bảng `stories` / `witness_faiths` / `posts`** |
| `title` | `string \| null` | Tiêu đề bài viết (tương ứng với `title` của Story/Post hoặc `name` của WitnessFaith) |
| `description` | `string \| null` | Mô tả ngắn của bài viết |
| `image_url` | `string \| null` | URL ảnh minh họa (đã upload lên server hoặc link ảnh fallback) |
| `image_source` | `AiImageSource` | Nguồn ảnh: `"AI_GENERATED"`, `"WEB_FALLBACK"`, `"MANUAL"`, `"NONE"` |
| `word_count` | `number` | Số từ thực tế của bài viết (nằm trong khoảng `1000 - 3000` từ khi đã `COMPLETED`) |
| `is_image` | `boolean` | Bài viết có bật tạo ảnh hay không |
| `status` | `AiStatus` | Trạng thái AI của bài viết (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`, `CANCELLED`) |
| `scheduled_at` | `string (ISO)` | Thời gian dự kiến chạy trong khoảng deadline |
| `started_at` | `string (ISO) \| null` | Thời điểm bắt đầu gọi AI |
| `completed_at` | `string (ISO) \| null` | Thời điểm AI tạo xong bài viết |
| `retry_count` | `number` | Số lần đã thử lại nếu gặp lỗi |
| `ai_request_count` | `number` | **Tổng số request AI** mà bài viết này đã dùng (tính cộng dồn tất cả các lần gen nội dung, mở rộng bài, tạo ảnh, gen lại và dùng AI chỉnh sửa) |
| `error_message` | `string \| null` | Chi tiết lỗi nếu quá trình gọi AI bị thất bại |
| `created_at` | `string` | Thời gian tạo bản ghi (`DD/MM/YYYY HH:mm`) |
| `batch` | `object` | Thông tin tóm tắt của đợt (`id`, `prompt`, `quantity`, `completed_count`, `status`) |

---

### 5.8. Xem chi tiết 1 Bài viết AI — `GET /admin/ai-content/articles/:id`
Ngoài toàn bộ các trường ở mục `5.7`, API chi tiết trả về thêm:
| Field bổ sung | Kiểu | Mô tả |
| :--- | :--- | :--- |
| `content` | `string (HTML) \| null` | Toàn bộ nội dung chi tiết bài viết (1000 – 3000 từ HTML) |
| `prompt` | `string` | Prompt dùng để tạo bài viết này |
| `image_prompt` | `string \| null` | Câu lệnh tiếng Anh AI đã dùng để vẽ ảnh minh họa |
| `module_record` | `object \| null` | Dữ liệu thực tế đang lưu bên bảng của module (`Story`, `WitnessFaith`, hoặc `Post`) |

---

### 5.9. Chỉnh sửa Bài viết AI (Tự động đồng bộ sang Module) — `PUT /admin/ai-content/articles/:id`
Khi Admin chỉnh sửa tại đây, hệ thống **tự động cập nhật đồng bộ sang bản ghi gốc** ở bảng `stories`, `witness_faiths` hoặc `posts`.

**Request Body (JSON - tất cả đều là optional):**
```json
{
  "title": "Tiêu đề bài viết sau khi biên tập",
  "description": "Mô tả ngắn gọn sau khi chỉnh sửa",
  "content": "<h2>Mở đầu</h2><p>Nội dung HTML...</p>",
  "image_url": "https://file.hvmv.edu.vn/new-image.jpg",
  "category_id": 2,
  "prompt": "Prompt mới nếu muốn chuẩn bị gen lại",
  "is_image": true
}
```

---

### 5.10. Gen ngay / Gen lại Nội dung hoặc Ảnh của 1 Bài viết
| Phương thức | Endpoint | Mô tả |
| :--- | :--- | :--- |
| `POST` | `/admin/ai-content/articles/:id/regenerate` | Yêu cầu AI **gen ngay lập tức** (hoặc viết lại mới hoàn toàn) nội dung 1000-3000 từ + ảnh cho bài viết này và cập nhật thẳng vào module. |
| `POST` | `/admin/ai-content/articles/:id/regenerate-image` | Giữ nguyên nội dung chữ, chỉ yêu cầu AI **tạo lại hình ảnh mới** (upload lên server hoặc tìm ảnh fallback) và gắn lại vào bài viết trong module. |
| `DELETE` | `/admin/ai-content/articles/:id` | Xóa bài viết AI và **xóa luôn** bản ghi tương ứng trong bảng `stories` / `witness_faiths` / `posts`. |

---

### 5.11. Dùng AI để Chỉnh sửa Nội dung Bài viết đã gen (Đổi màu, Đổi nội dung đoạn, Đổi căn lề, Cỡ chữ...)

FE có thể gọi tính năng **AI Chỉnh sửa nội dung** ở cả màn hình Quản lý AI tập trung lẫn trực tiếp tại màn hình chỉnh sửa của 3 module hoặc ngay trên thanh công cụ của Rich Text Editor (CKEditor / TinyMCE / Quill):

#### A. Các Endpoint hỗ trợ (Tất cả đều nhận cùng 1 cấu trúc Request Body bên dưới):
| Phương thức | Endpoint | Khi nào FE sử dụng? |
| :--- | :--- | :--- |
| `POST` | `/admin/ai-content/articles/:id/ai-edit` | Khi đang mở chi tiết bài viết AI theo `id` của bảng `ai_content_items` |
| `POST` | `/admin/stories/:id/ai-edit` | Khi đang sửa bài viết bên module **Story** (`:id` là ID của Story) |
| `POST` | `/admin/witness-faiths/:id/ai-edit` | Khi đang sửa bài viết bên module **Witness Faiths** (`:id` là ID của WitnessFaith) |
| `POST` | `/admin/post/top/:id/ai-edit` *(hoặc `/admin/post/:id/ai-edit`, `/admin/post-catalog-top/posts/:id/ai-edit`)* | Khi đang sửa bài viết bên module **Post Catalog Top / Post** (`:id` là ID của Post) |
| `POST` | `/admin/ai-content/ai-edit` | Endpoint đa năng cho **Rich Text Editor** (có thể truyền `content` + `selected_html` đang soạn thảo để lấy kết quả preview mà chưa cần lưu DB, hoặc truyền kèm `article_id` / `module_type` + `target_record_id`) |

#### B. Các trường (Fields) trong Request Body (`AiEditContentDto`):
| Field | Kiểu | Bắt buộc | Mặc định | Mô tả chi tiết |
| :--- | :--- | :---: | :---: | :--- |
| `prompt` *(hoặc `promt`, `instruction`)* | `string` | Tùy chọn* | — | Yêu cầu chỉnh sửa bằng ngôn ngữ tự nhiên cho AI. Ví dụ: *"Đổi màu đoạn này sang xanh dương, căn giữa và viết lại cho sâu sắc hơn"* hoặc *"Đổi màu tất cả tiêu đề lớn sang đỏ đô, rút gọn đoạn kết"*. (*Bắt buộc phải có `prompt` hoặc ít nhất 1 tùy chọn định dạng bên dưới*). |
| `selected_html` *(hoặc `selected_text`)* | `string` | Không | — | **Đoạn HTML hoặc văn bản mà Admin đang bôi đen trên Editor** để yêu cầu AI chỉ sửa riêng đoạn đó. Hệ thống sẽ sửa đoạn này rồi **tự động ghép vào đúng vị trí trong bài viết tổng thể**. Nếu không truyền, AI sẽ sửa trên toàn bộ bài viết. |
| `text_color` | `string` | Không | — | Đổi màu chữ nhanh: truyền mã HEX (`"#cc0000"`), RGB (`"rgb(0, 85, 255)"`) hoặc tên màu tiếng Việt (`"đỏ đô"`, `"xanh dương"`, `"xanh ngọc"`, `"nâu đỏ"`, `"xanh lá"`, `"tím"`, `"đen"`, `"xám"`). |
| `background_color` | `string` | Không | — | Đổi màu nền / đóng khung màu nền cho đoạn văn hoặc trích dẫn (VD: `"#fdfaf6"`, `"#fff3cd"`, `"kem"`). |
| `text_align` | `string` | Không | — | Đổi căn lề nhanh: `"left"` (căn trái), `"center"` (căn giữa), `"right"` (căn phải), `"justify"` (căn đều 2 bên). |
| `font_size` | `string` | Không | — | Đổi kích thước chữ nhanh (VD: `"18px"`, `"20px"`, `"22px"`, `"24px"`, `"30px"` hoặc truyền số `"22"`). |
| `bold` | `boolean` | Không | — | `true`: In đậm (`<strong>`), `false`: Bỏ in đậm. |
| `italic` | `boolean` | Không | — | `true`: In nghiêng (`<em>`), `false`: Bỏ in nghiêng. |
| `underline` | `boolean` | Không | — | `true`: Gạch chân (`<u>`), `false`: Bỏ gạch chân. |
| `content` | `string` | Không | Lấy từ DB | Nội dung HTML hiện tại trên Editor (nếu Admin vừa sửa tay trên Editor chưa bấm lưu nhưng muốn gọi AI sửa tiếp trên bản nháp đó). |
| `title` | `string` | Không | Lấy từ DB | Tiêu đề hiện tại trên Editor. |
| `description` | `string` | Không | Lấy từ DB | Mô tả ngắn hiện tại trên Editor. |
| `auto_save` | `boolean` | Không | `true` | `true`: Tự động lưu đè nội dung mới vào DB và đồng bộ sang bảng module (`stories`, `witness_faiths`, `posts`). `false`: Chỉ trả về HTML kết quả để FE hiển thị xem trước (Preview) trên Editor. |

#### C. Ví dụ 1: Bôi đen 1 đoạn trên Editor để đổi nội dung + đổi màu + đổi căn lề
```json
{
  "selected_html": "<p style=\"text-align: justify;\"><span style=\"font-size: 20px;\">Đoạn văn gốc cần chỉnh sửa...</span></p>",
  "prompt": "Viết lại đoạn này cho truyền cảm hứng hơn và nhấn mạnh ý nghĩa đức tin",
  "text_color": "xanh dương",
  "text_align": "center",
  "font_size": "22px",
  "italic": true,
  "auto_save": true
}
```

#### D. Ví dụ 2: Yêu cầu AI sửa trực tiếp trên toàn bài viết (không cần bôi đen)
```json
{
  "prompt": "Đổi màu tất cả các tiêu đề mục lớn sang màu đỏ đô, sửa đoạn mở đầu ngắn gọn hơn và căn phải dòng ký tên cuối bài",
  "auto_save": true
}
```

#### E. Cấu trúc Response trả về (HTTP `200`):
```json
{
  "statusCode": 200,
  "messageCode": "AI_ARTICLE_EDITED_BY_AI_SUCCESS",
  "data": {
    "edit_mode": "selection",
    "auto_saved": true,
    "edited_selection_html": "<p style=\"text-align: center; line-height: 1.75; margin-bottom: 14px;\"><em><span style=\"font-size: 22px; color: rgb(0, 85, 255);\">Đoạn văn sau khi đã được AI biên tập lại...</span></em></p>",
    "title": "Nghệ Thuật Đồng Hành Mục Vụ",
    "description": "Mô tả ngắn của bài viết...",
    "content": "<p style=\"text-align: center; ...\">...(Toàn bộ HTML bài viết đã ghép đoạn mới vào)...</p>",
    "word_count": 1485,
    "article": {
      "id": 2,
      "module_type": "post-catalog-top",
      "target_record_id": 3233,
      "status": "COMPLETED"
    }
  }
}
```
> **Mẹo cho FE:**
> - Nếu FE chỉ muốn thay thế nhanh vùng đang bôi đen trên Editor thì lấy trường `data.edited_selection_html`.
> - Hoặc FE có thể gán thẳng `editor.setData(data.content)` vì `data.content` đã tự động ghép đoạn vừa sửa vào đúng vị trí trong bài viết hoàn chỉnh!

---

## 6. Gợi ý Hiển thị UI/UX cho Frontend

1. **Tại 3 màn hình quản lý hiện có (`Story`, `Witness Faiths`, `Post Catalog Top`):**
   - Thêm nút **"Tạo hàng loạt bằng AI"** mở Modal gồm:
     - Select chọn Danh mục (`Topic` / `Witness Faith Menu` / `Post Catalog Top`).
     - DateRangePicker chọn `start_day` và `end_day`.
     - Input Number nhập `quantity` (Số lượng bài).
     - Switch `is_image` (Có tạo ảnh minh họa hay không).
     - Textarea nhập `prompt`.
   - Trên bảng danh sách bài viết và danh mục, hiển thị cột/badge **`ai_status`**:
     - `PENDING`: Badge màu vàng/xám (*"Chờ AI tạo"*).
     - `PROCESSING`: Badge màu xanh dương có icon loading xoay (*"AI đang viết..."*).
     - `COMPLETED`: Badge màu xanh lá (*"AI đã tạo"*).
     - `FAILED`: Badge màu đỏ (*"Lỗi tạo AI"*) kèm nút bấm gọi `POST /admin/ai-content/articles/:id/regenerate`.
2. **Tại màn hình Quản lý Nội dung AI tập trung (`/admin/ai-content`):**
   - Hiển thị các thẻ thống kê từ `GET /admin/ai-content/stats` và đồng hồ đếm ngược tới `next_estimated_run_at`.
   - Nếu `image_source === "WEB_FALLBACK"`, có thể hiển thị chú thích nhỏ *"Ảnh tạm từ Internet (do hết quota ảnh AI)"* kèm nút **"Tạo lại ảnh"** (`POST /admin/ai-content/articles/:id/regenerate-image`) hoặc cho phép Admin upload ảnh khác thay thế qua `PUT /admin/ai-content/articles/:id`.

