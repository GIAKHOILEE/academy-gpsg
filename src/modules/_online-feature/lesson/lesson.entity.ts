import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
import { UpdateDateColumn } from 'typeorm'
import { Classes } from '@modules/class/class.entity'
import { Discuss } from '../discuss/discuss.entity'

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

  @OneToMany(() => Discuss, discusses => discusses.lesson, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  discusses: Discuss[]

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date

  @DeleteDateColumn({ type: 'timestamp' })
  deletedAt: Date
}
