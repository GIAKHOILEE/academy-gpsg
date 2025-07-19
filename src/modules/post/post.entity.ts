import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, JoinColumn } from 'typeorm'
import { PostCatalog } from '../post-catalog/post-catalog.entity'
import { PostStatus } from '@enums/post.enum'

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 255 })
  title: string

  @Column({ type: 'text', nullable: true, default: null })
  description: string

  @Column({ type: 'text', nullable: true, default: null })
  content: string

  @Column({ length: 255 })
  slug: string

  @Column({ length: 255, nullable: true, default: null })
  image: string

  @Column({ default: true })
  is_active: boolean

  @Column({ default: true })
  is_banner: boolean

  @ManyToOne(() => PostCatalog, catalog => catalog.posts, { onUpdate: 'CASCADE', onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_catalog_id' })
  post_catalog: PostCatalog

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
