import { AiStatus } from '@enums/ai-content.enum'
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, JoinColumn } from 'typeorm'
import { PostCatalog } from '../post-catalog/post-catalog.entity'

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'float', default: 1.001 })
  index: number

  @Column({ length: 255 })
  title: string

  @Column({ type: 'text', nullable: true, default: null })
  description: string

  @Column({ type: 'longtext', nullable: true, default: null })
  content: string

  @Column({ length: 255 })
  slug: string

  @Column({ type: 'text', nullable: true, default: null })
  image: string

  @Column({ default: true })
  is_active: boolean

  @Column({ default: true })
  is_banner: boolean

  @Column({ default: false })
  is_kiot: boolean

  @Column({ nullable: true })
  post_catalog_id: number

  @ManyToOne(() => PostCatalog, catalog => catalog.posts, { onUpdate: 'CASCADE', onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'post_catalog_id' })
  post_catalog: PostCatalog

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
