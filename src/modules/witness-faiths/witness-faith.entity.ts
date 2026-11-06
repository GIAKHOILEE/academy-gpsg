import { AiStatus } from '@enums/ai-content.enum'
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { WitnessFaithMenu } from './_witness-faith-menu/witness-faith-menu.entity'

@Entity({ name: 'witness_faiths' })
export class WitnessFaith {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column({ type: 'text', nullable: true })
  image: string

  @Column({ type: 'text', nullable: true })
  description: string

  @ManyToOne(() => WitnessFaithMenu, witnessFaithMenu => witnessFaithMenu.witness_faiths, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'witness_faith_menu_id' })
  witness_faith_menu: WitnessFaithMenu

  @Column({ nullable: true })
  witness_faith_menu_id: number

  @Column({ type: 'longtext', nullable: true })
  content: string

  @Column({ type: 'varchar', length: 32, nullable: true, default: null })
  ai_status: AiStatus | null

  @Column({ nullable: true, default: null })
  ai_batch_id: number | null

  @Column({ type: 'int', default: 0 })
  ai_request_count: number

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
