# Danh Sách Field Và Chú Thích 5 Bảng Dữ Liệu Core

Tài liệu chi tiết danh sách tất cả các trường (fields) và tác dụng của từng trường trong 5 bảng dữ liệu chính của hệ thống Academy: **Khoa (`departments`)**, **Môn học (`subjects`)**, **Niên khóa (`scholastic`)**, **Học kỳ (`semester`)**, và **Lớp học (`classes`)**.

---

## 1. Bảng Khoa (departments)
Tệp entity: src/modules/departments/departments.entity.ts

- id (number): Khoá chính (Primary Key), mã định danh duy nhất của khoa trong hệ thống.
- code (string): Mã khoa, chuỗi viết tắt duy nhất (ví dụ: CNTT, QTKD).
- name (string): Tên đầy đủ duy nhất của khoa (ví dụ: Khoa Công nghệ thông tin).
- description (string): Mô tả chi tiết thông tin giới thiệu về khoa.
- index (float): Thứ tự hiển thị, chỉ số ưu tiên dùng để sắp xếp danh sách khoa trên giao diện.
- is_active (boolean): Trạng thái hoạt động của khoa (true: đang hoạt động, false: tạm ẩn/tạm ngưng).
- created_at (Date): Thời gian tạo bản ghi khoa trong cơ sở dữ liệu.
- updated_at (Date): Thời gian cập nhật thông tin khoa lần gần nhất.
- deleted_at (Date): Thời gian xóa mềm bản ghi khoa (Soft delete).

---

## 2. Bảng Môn học (subjects)
Tệp entity: src/modules/subjects/subjects.entity.ts

- id (number): Khoá chính (Primary Key), mã định danh duy nhất của môn học.
- code (string): Mã môn học, chuỗi mã hóa quản lý môn (ví dụ: MATH101, ENG01).
- name (string): Tên hiển thị của môn học (ví dụ: Toán cao cấp A1).
- credit (number): Số tín chỉ / đơn vị học trình của môn học.
- image (string): Đường dẫn URL hình ảnh đại diện / minh họa cho môn học.
- description (string): Mô tả ngắn gọn giới thiệu tổng quan về môn học.
- content (text): Nội dung chi tiết, giáo trình hoặc đề cương chương trình môn học.
- post_link (string): Đường dẫn liên kết bài viết giới thiệu môn học (nếu có).
- department_id (number): Khóa ngoại (Foreign Key), liên kết tới departments.id (Môn học thuộc về khoa nào).
- created_at (Date): Thời gian bản ghi môn học được tạo.
- updated_at (Date): Thời gian cập nhật thông tin môn học gần nhất.
- deleted_at (Date): Thời gian xóa mềm môn học (Soft delete).

---

## 3. Bảng Niên khóa (scholastic)
Tệp entity: src/modules/class/_scholastic/scholastic.entity.ts

- id (number): Khoá chính (Primary Key), mã định danh duy nhất của niên khóa.
- name (string): Tên niên khóa hiển thị (ví dụ: 2023 - 2024, 2024 - 2025).
- index (float): Thứ tự hiển thị, chỉ số ưu tiên sắp xếp niên khóa trên giao diện.

---

## 4. Bảng Học kỳ (semester)
Tệp entity: src/modules/class/_semester/semester.entity.ts

- id (number): Khoá chính (Primary Key), mã định danh duy nhất của học kỳ.
- name (string): Tên học kỳ hiển thị (ví dụ: Học kỳ I, Học kỳ II, Học kỳ Hè).
- index (float): Thứ tự hiển thị, chỉ số ưu tiên sắp xếp học kỳ trên giao diện.

---

## 5. Bảng Lớp học (classes)
Tệp entity: src/modules/class/class.entity.ts

- id (number): Khoá chính (Primary Key), mã định danh duy nhất của lớp học.
- code (string): Mã lớp học, mã quản lý duy nhất của lớp.
- name (string): Tên gọi của lớp học.
- status (enum ClassStatus): Trạng thái lớp học (ví dụ: ENROLLING - đang mở ghi danh, đang học, đã kết thúc).
- classroom (string): Tên phòng học hoặc địa điểm tổ chức lớp học.
- price (number): Học phí của lớp học cho mỗi học viên đăng ký.
- salary (decimal): Mức lương / thù lao trả cho giáo viên giảng dạy trên mỗi tiết học.
- extra_allowance (decimal): Mức trợ cấp / phụ cấp bổ sung cho giáo viên.
- number_periods (float): Tổng số tiết học quy định của lớp học.
- number_lessons (number): Tổng số buổi học thực tế của lớp.
- max_students (number): Số lượng học viên tối đa được phép ghi danh vào lớp.
- condition (text): Điều kiện đăng ký hoặc yêu cầu đầu vào dành cho học viên.
- schedule (json): Cấu trúc dữ liệu JSON lưu trữ lịch học (thứ trong tuần, ca học, giờ học).
- registration_start_date (string): Ngày bắt đầu mở cổng ghi danh / đăng ký lớp.
- end_enrollment_day (string): Ngày hạn chót nhận đăng ký lớp học.
- start_time (string): Giờ bắt đầu của ca học trong ngày.
- end_time (string): Giờ kết thúc của ca học trong ngày.
- opening_day (string): Ngày khai giảng, chính thức bắt đầu khóa học.
- closing_day (string): Ngày bế giảng, chính thức kết thúc khóa học.
- is_active (boolean): Trạng thái kích hoạt (true: đang mở/hiển thị lớp, false: tạm ẩn lớp).
- is_evaluate (boolean): Cờ cho phép học viên thực hiện đánh giá lớp học / giảng viên.
- learn_offline (boolean): Cờ xác định hình thức học trực tiếp (Offline) tại lớp.
- learn_online (boolean): Cờ xác định hình thức học trực tuyến (Online).
- learn_video (boolean): Cờ xác định hình thức học qua các video bài giảng thu sẵn.
- learn_meeting (boolean): Cờ xác định hình thức học trực tuyến qua phòng họp (Zoom, Google Meet).
- is_free (boolean): Cờ xác định lớp học miễn phí (không thu học phí).
- content (text): Nội dung chi tiết, giáo trình và chương trình giảng dạy của lớp.
- subject_id (number): Khóa ngoại (Foreign Key), tham chiếu tới subjects.id (Lớp học thuộc môn học nào).
- teacher_id (number): Khóa ngoại (Foreign Key), tham chiếu tới teachers.id (Giáo viên đảm nhận lớp).
- scholastic_id (number): Khóa ngoại (Foreign Key), tham chiếu tới scholastic.id (Lớp học thuộc niên khóa nào).
- semester_id (number): Khóa ngoại (Foreign Key), tham chiếu tới semester.id (Lớp học thuộc học kỳ nào).
- created_at (Date): Thời gian khởi tạo bản ghi lớp học.
- updated_at (Date): Thời gian cập nhật thông tin lớp học lần gần nhất.
