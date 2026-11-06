import { AiStatus } from '@enums/ai-content.enum'
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { WitnessFaith } from '../../witness-faiths/witness-faith.entity'

@Entity({ name: 'witness_faith_menus' })
export class WitnessFaithMenu {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column({ type: 'varchar', length: 32, nullable: true, default: null })
  ai_status: AiStatus | null

  @OneToMany(() => WitnessFaith, witnessFaith => witnessFaith.witness_faith_menu, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  witness_faiths: WitnessFaith[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
