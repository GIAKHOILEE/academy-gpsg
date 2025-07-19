import { Classes } from '@modules/class/class.entity'
import { Department } from '@modules/departments/departments.entity'
import { Column, CreateDateColumn, DeleteDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

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

  @Column({ nullable: true })
  department_id: number

  @ManyToOne(() => Department, department => department.subjects, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  department: Department

  @OneToMany(() => Classes, classes => classes.subject, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  classes: Classes[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
