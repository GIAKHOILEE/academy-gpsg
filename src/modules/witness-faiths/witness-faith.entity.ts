import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'
import { WitnessFaithMenu } from './_witness-faith-menu/witness-faith-menu.entity'

@Entity({ name: 'witness_faiths' })
export class WitnessFaith {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column({ nullable: true })
  image: string

  @Column({ nullable: true })
  description: string

  @ManyToOne(() => WitnessFaithMenu, witnessFaithMenu => witnessFaithMenu.id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'witness_faith_menu_id' })
  witness_faith_menu: WitnessFaithMenu

  @Column({ nullable: true })
  witness_faith_menu_id: number

  @Column({ type: 'text', nullable: true })
  content: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
