import { AiModuleType, AiStatus } from '@enums/ai-content.enum'
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { AiContentItem } from './ai-content-item.entity'

@Entity('ai_content_batches')
export class AiContentBatch {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar', length: 64 })
  module_type: AiModuleType

  @Column({ nullable: true })
  category_id: number

  @Column({ nullable: true })
  category_name: string

  @Column({ type: 'text' })
  prompt: string

  @Column({ type: 'int', default: 1 })
  quantity: number

  @Column({ type: 'int', default: 0 })
  completed_count: number

  @Column({ type: 'int', default: 0 })
  failed_count: number

  @Column({ default: true })
  is_image: boolean

  @Column({ type: 'datetime' })
  start_day: Date

  @Column({ type: 'datetime' })
  end_day: Date

  @Column({ type: 'int', default: 5 })
  interval_minutes: number

  @Column({ type: 'int', default: 1000 })
  min_words: number

  @Column({ type: 'int', default: 3000 })
  max_words: number

  @Column({ type: 'varchar', length: 32, default: AiStatus.PENDING })
  status: AiStatus

  @Column({ type: 'datetime', nullable: true, default: null })
  last_completed_at: Date | null

  @Column({ type: 'text', nullable: true, default: null })
  last_error: string | null

  @OneToMany(() => AiContentItem, item => item.batch, { cascade: true })
  items: AiContentItem[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}

