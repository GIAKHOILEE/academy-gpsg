import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
} from 'typeorm'
import { Post } from '../post/post.entity'
import { PostStatus } from '@enums/post.enum'

@Entity('post_catalogs')
export class PostCatalog {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ default: 1.001, type: 'float' })
  index: number

  @Column({ length: 255 })
  name: string

  @Column({ length: 255 })
  slug: string

  @Column({ default: PostStatus.BOTTOM })
  status: PostStatus

  @ManyToOne(() => PostCatalog, catalog => catalog.children, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: PostCatalog | null // Catalog

  @OneToMany(() => PostCatalog, catalog => catalog.parent)
  children: PostCatalog[] // Catalog[]

  @OneToMany(() => Post, post => post.post_catalog)
  posts: Post[]

  @Column({ default: true })
  is_active: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  @DeleteDateColumn()
  deleteAt: Date
}
