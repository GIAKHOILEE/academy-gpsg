import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  image: string

  @Column()
  name: string

  @Column({ nullable: true })
  description: string

  @Column({ type: 'text' })
  content: string

  @Column()
  link: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
