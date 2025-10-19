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

  @Column()
  thumbnail: string

  @Column({ type: 'mediumtext' })
  content: string

  @Column()
  topic_id: number

  @ManyToOne(() => Topic, topic => topic.stories, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'topic_id' })
  topic: Topic

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
