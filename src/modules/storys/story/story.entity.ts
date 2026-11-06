import { AiStatus } from '@enums/ai-content.enum'
import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Topic } from '../topic/topic.entity'

@Entity('stories')
export class Story {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'float', default: 1.001 })
  index: number

  @Column()
  title: string

  @Column({ type: 'text', nullable: true })
  thumbnail: string

  @Column({ type: 'longtext' })
  content: string

  @Column()
  topic_id: number

  @ManyToOne(() => Topic, topic => topic.stories, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'topic_id' })
  topic: Topic

  @Column({ type: 'varchar', length: 32, nullable: true, default: null })
  ai_status: AiStatus | null

  @Column({ nullable: true, default: null })
  ai_batch_id: number | null

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
