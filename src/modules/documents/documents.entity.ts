import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { DocumentsOrderEntity } from './documents-order.entity'

@Entity('documents')
export class DocumentsEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar', length: 255, nullable: true })
  batch_code: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string

  @Column({ type: 'float', default: 1.001 })
  index: number

  @Column({ type: 'int', default: 0 })
  quantity: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  import_price: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  sell_price: number

  @Column({ type: 'varchar', length: 255, nullable: true })
  image: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string

  @Column({ nullable: true })
  day_import: string

  @Column({ type: 'boolean', default: false })
  is_sold: boolean

  @OneToMany(() => DocumentsOrderEntity, documentOrder => documentOrder.document)
  documents_order: DocumentsOrderEntity[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
