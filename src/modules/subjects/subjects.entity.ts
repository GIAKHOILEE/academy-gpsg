import { Classes } from '@modules/class/class.entity'
import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('subjects')
export class Subject {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  code: string

  @Column()
  name: string

  @Column()
  image: string

  @Column({ default: 1 })
  credit: number

  @Column()
  description: string

  @Column({ type: 'text', nullable: true })
  content: string

  @OneToMany(() => Classes, classes => classes.subject, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  classes: Classes[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
