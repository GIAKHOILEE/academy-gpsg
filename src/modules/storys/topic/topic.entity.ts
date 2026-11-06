import { AiStatus } from '@enums/ai-content.enum'
import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { Story } from '../story/story.entity'

@Entity('topics')
export class Topic {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true })
  name: string

  @Column({ nullable: true })
  description: string

  @Column({ type: 'varchar', length: 32, nullable: true, default: null })
  ai_status: AiStatus | null

  @OneToMany(() => Story, story => story.topic, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  stories: Story[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
