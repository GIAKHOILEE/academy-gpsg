import { Column, CreateDateColumn, DeleteDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('documents')
export class DocumentsEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar', length: 255, nullable: true })
  batch_code: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  code: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string

  @Column({ type: 'float', default: 1.001 })
  index: number

  @Column({ type: 'int', default: 0 })
  quantity: number

  @Column({ type: 'float', default: 0 })
  price: number

  @Column({ type: 'varchar', length: 255, nullable: true })
  image: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string

  @Column({ nullable: true })
  day_import: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
