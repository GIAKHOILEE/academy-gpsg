import { Classes } from '@modules/class/class.entity'
import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true })
  code: string

  @Column({ unique: true })
  name: string

  @Column({ nullable: true })
  description: string

  @OneToMany(() => Classes, classes => classes.department, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  classes: Classes[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
