import { AiImageSource, AiModuleType, AiStatus } from '@enums/ai-content.enum'
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { AiContentBatch } from './ai-content-batch.entity'

@Entity('ai_content_items')
export class AiContentItem {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  batch_id: number

  @ManyToOne(() => AiContentBatch, batch => batch.items, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'batch_id' })
  batch: AiContentBatch

  @Column({ type: 'varchar', length: 64 })
  module_type: AiModuleType

  @Column({ nullable: true })
  category_id: number

  @Column({ type: 'int', default: 1 })
  sequence_number: number

  @Column({ nullable: true, default: null })
  target_record_id: number | null

  @Column({ nullable: true, default: null })
  title: string | null

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null

  @Column({ type: 'longtext', nullable: true, default: null })
  content: string | null

  @Column({ type: 'text', nullable: true, default: null })
  image_url: string | null

  @Column({ type: 'varchar', length: 32, default: AiImageSource.NONE })
  image_source: AiImageSource

  @Column({ type: 'text', nullable: true, default: null })
  image_prompt: string | null

  @Column({ type: 'int', default: 0 })
  word_count: number

  @Column({ default: true })
  is_image: boolean

  @Column({ type: 'text' })
  prompt: string

  @Column({ type: 'varchar', length: 32, default: AiStatus.PENDING })
  status: AiStatus

  @Column({ type: 'datetime' })
  scheduled_at: Date

  @Column({ type: 'datetime', nullable: true, default: null })
  started_at: Date | null

  @Column({ type: 'datetime', nullable: true, default: null })
  completed_at: Date | null

  @Column({ type: 'int', default: 0 })
  retry_count: number

  @Column({ type: 'int', default: 0 })
  ai_request_count: number

  @Column({ type: 'text', nullable: true, default: null })
  error_message: string | null

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}

