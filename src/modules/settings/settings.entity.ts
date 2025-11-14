import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity('settings')
export class Settings {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ default: false })
  is_evaluate: boolean
}
