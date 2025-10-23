import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { DocumentsEntity } from './documents.entity'

@Entity('documents_order')
export class DocumentsOrderEntity {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => DocumentsEntity, document => document.id, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: DocumentsEntity

  @Column({ type: 'int' })
  document_id: number

  @Column({ type: 'int' })
  series: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: number

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  profit: number

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  phone: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  note: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
