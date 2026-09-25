import { LearnType } from '@enums/class.enum'
import { Classes } from '@modules/class/class.entity'
import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm'
import { Enrollments } from './enrollments.entity'

/**
 * Bảng quan hệ giữa đơn ghi danh và lớp học.
 *
 * Cột `enrollments.class_ids` là JSON nên MySQL không index được: mọi thống kê
 * đụng tới nó đều phải quét toàn bộ bảng enrollments rồi bung JSON_TABLE.
 * Bảng này giữ đúng dữ liệu đó ở dạng quan hệ, có index trên cả hai chiều,
 * nên truy vấn "các đơn thuộc lớp của kỳ X" đi hoàn toàn bằng index.
 *
 * `enrollments.class_ids` vẫn là nguồn sự thật (source of truth) do rất nhiều
 * nghiệp vụ đang đọc trực tiếp từ đó. Bảng này được EnrollmentClassesSubscriber
 * đồng bộ tự động trong cùng transaction mỗi khi enrollment được ghi.
 */
@Entity({ name: 'enrollment_classes' })
@Unique('uniq_enrollment_class', ['enrollment_id', 'class_id'])
@Index('idx_enrollment_classes_class', ['class_id'])
export class EnrollmentClasses {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => Enrollments, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'enrollment_id' })
  enrollment: Enrollments

  @Column()
  enrollment_id: number

  @ManyToOne(() => Classes, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Classes

  @Column()
  class_id: number

  @Column({ type: 'enum', enum: LearnType, default: LearnType.OFFLINE })
  learn_type: LearnType
}
