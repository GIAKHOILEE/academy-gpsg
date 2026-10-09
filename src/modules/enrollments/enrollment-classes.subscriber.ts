import { LearnType } from '@enums/class.enum'
import { EntityManager, EntitySubscriberInterface, EventSubscriber, InsertEvent, UpdateEvent } from 'typeorm'
import { EnrollmentClasses } from './enrollment-classes.entity'
import { Enrollments } from './enrollments.entity'

/**
 * Giữ bảng `enrollment_classes` luôn khớp với `enrollments.class_ids`.
 *
 * Đặt ở tầng subscriber thay vì gọi tay ở từng service: mọi đường ghi enrollment
 * (tạo đơn, admin sửa đơn, transaction ở module khác...) đều đi qua đây, không lo
 * sót chỗ nào. Subscriber chạy bằng `event.manager` nên nằm chung transaction với
 * thao tác gốc — rollback thì cả hai cùng rollback.
 *
 * Xoá cứng enrollment không cần xử lý: khoá ngoại đã ON DELETE CASCADE.
 * Xoá mềm cũng không cần: truy vấn thống kê vẫn join sang enrollments để lọc
 * `deleted_at IS NULL`, nên đơn bị xoá mềm tự động không được tính.
 */
@EventSubscriber()
export class EnrollmentClassesSubscriber implements EntitySubscriberInterface<Enrollments> {
  listenTo() {
    return Enrollments
  }

  async afterInsert(event: InsertEvent<Enrollments>): Promise<void> {
    await this.sync(event.manager, event.entity)
  }

  async afterUpdate(event: UpdateEvent<Enrollments>): Promise<void> {
    // `repository.update(id, {...})` chỉ mang theo các cột được set. Nếu lần ghi này
    // không đụng tới class_ids thì không có gì để đồng bộ.
    const entity = event.entity as Enrollments | undefined
    if (!entity?.id || !Array.isArray(entity.class_ids)) return
    await this.sync(event.manager, entity)
  }

  private async sync(manager: EntityManager, enrollment: Enrollments | undefined): Promise<void> {
    if (!enrollment?.id) return

    const repo = manager.getRepository(EnrollmentClasses)
    const rows = Array.isArray(enrollment.class_ids) ? enrollment.class_ids : []

    // Gộp theo class_id để không vi phạm unique nếu payload có phần tử trùng
    const wanted = new Map<number, LearnType>()
    for (const item of rows) {
      const classId = Number(item?.class_id)
      if (!Number.isInteger(classId) || classId <= 0) continue
      wanted.set(classId, item?.learn_type ?? LearnType.OFFLINE)
    }

    const existing = await repo.find({ where: { enrollment_id: enrollment.id } })

    const obsolete = existing.filter(row => !wanted.has(row.class_id))
    if (obsolete.length > 0) {
      await repo.delete(obsolete.map(row => row.id))
    }

    const existingByClassId = new Map(existing.map(row => [row.class_id, row]))
    const toSave: Partial<EnrollmentClasses>[] = []

    for (const [class_id, learn_type] of wanted) {
      const current = existingByClassId.get(class_id)
      if (!current) {
        toSave.push({ enrollment_id: enrollment.id, class_id, learn_type })
      } else if (current.learn_type !== learn_type) {
        toSave.push({ id: current.id, enrollment_id: enrollment.id, class_id, learn_type })
      }
    }

    if (toSave.length > 0) {
      await repo.save(toSave)
    }
  }
}
