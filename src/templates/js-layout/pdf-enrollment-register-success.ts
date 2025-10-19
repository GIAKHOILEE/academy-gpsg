export default function renderRegisterSuccess(doc: any, data: any) {
  doc.font('Roboto')
  // Header
  doc.image(data.logoPath, 50, 50, { width: 60 })
  doc
    .fontSize(12)
    .text('TỔNG GIÁO PHẬN THÀNH PHỐ HỒ CHÍ MINH', 120, 50)
    .text('HỌC VIỆN MỤC VỤ', 120)
    .text('6bis Tôn Đức Thắng, P. Sài Gòn, Tp. HCM', 120)
    .text('ĐT: (028) 6291 0366 - Zalo: 0706 757 366', 120)
    .text('Email: hvmvsaigon@gmail.com', 120)
    .moveDown()

  doc.fontSize(18).text('PHIẾU THU', { align: 'center' })
  doc.fontSize(12).text(`No. ${data.code}`, { align: 'right' })
  doc.text(`Ngày: ${data.day}/${data.month}/${data.year}`, { align: 'right' })

  doc.moveDown().fontSize(12).text('THÔNG TIN HỌC VIÊN:')
  doc.fontSize(10)
  doc.text(`Tên Thánh: ${data.saint_name}`)
  doc.text(`Họ và Tên: ${data.full_name}`)
  doc.text(`Ngày sinh: ${data.birth_date}`)
  doc.text(`Nơi sinh: ${data.birth_place}`)
  doc.text(`Điện thoại: ${data.phone}`)
  doc.text(`Email: ${data.email}`)
  doc.text(`Địa chỉ: ${data.address}`)
  doc.text(`Giáo xứ: ${data.parish}`)

  doc.moveDown().fontSize(12).text('THÔNG TIN KHÓA HỌC:')
  doc.fontSize(10)

  // Table
  const tableTop = doc.y
  doc.text('STT', 50, tableTop)
  doc.text('Môn học', 90, tableTop)
  doc.text('Lịch học', 270, tableTop)
  doc.text('Học phí', 500, tableTop)

  data.classes.forEach((cls, i) => {
    const y = tableTop + 25 + i * 20
    doc.text(cls.index.toString(), 50, y)
    doc.text(cls.name, 90, y)
    doc.text(`Thứ ${cls.schedule} | ${cls.start_time}-${cls.end_time} | ${cls.start_date}-${cls.end_date}`, 270, y)
    doc.text(`${cls.price} đ`, 500, y)
  })

  // Tổng kết
  doc.moveDown().fontSize(12)
  doc.text(`Tổng học phí: ${data.total_fee} đ`, { align: 'right' })
  doc.text(`Giảm học phí: ${data.discount} đ`, { align: 'right' })
  doc.text(`Thành tiền: ${data.total_fee} đ`, { align: 'right' })

  // Thanh toán
  doc.moveDown().text('Hình thức thanh toán: Đóng lệ phí tại phòng học vụ (A004)')
  doc.image(data.stampPath, doc.page.width / 2 - 40, doc.y + 10, { width: 80 })

  // Ghi chú
  doc
    .moveDown()
    .fontSize(10)
    .text(
      'Lưu ý:\nViệc chuyển đổi môn học có thể được thực hiện trước ngày khai giảng hoặc trong tuần học đầu tiên.\nSau khi khai giảng 14 ngày, học phí không được bảo lưu hoặc hoàn lại.',
    )
}
