import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { UpdateDateColumn } from 'typeorm'
import { Classes } from '@modules/class/class.entity'

@Entity('lesson')
export class Lesson {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'float', default: 1.001 })
  index: number

  @Column()
  title: string

  @Column()
  description: string

  @Column({ nullable: true, type: 'json' })
  video_url: string[]

  @Column({ nullable: true, type: 'json' })
  slide_url: string[]

  @Column({ nullable: true, type: 'json' })
  document_url: string[]

  @ManyToOne(() => Classes, classes => classes.lessons, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  class: Classes

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date

  @DeleteDateColumn({ type: 'timestamp' })
  deletedAt: Date
}
