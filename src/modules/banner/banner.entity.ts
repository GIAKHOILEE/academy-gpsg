import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm'

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'float', default: 1.001 })
  index: number

  @Column({ type: 'varchar', length: 255, nullable: true })
  image: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  url: string

  @Column({ type: 'boolean', default: true })
  isActive: boolean

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date

  @DeleteDateColumn({ type: 'timestamp' })
  deletedAt: Date
}
