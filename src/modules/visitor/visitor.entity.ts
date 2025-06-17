import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('visitor')
export class Visitor {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  ip: string

  @Column()
  user_agent: string

  @CreateDateColumn()
  created_at: Date
}
