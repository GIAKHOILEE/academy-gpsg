import { Subject } from '@modules/subjects/subjects.entity'
import { Column, CreateDateColumn, DeleteDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'float', default: 1.001 })
  index: number

  @Column({ type: 'boolean', default: true })
  is_active: boolean

  @Column({ unique: true })
  code: string

  @Column({ unique: true })
  name: string

  @Column({ nullable: true })
  description: string

  @OneToMany(() => Subject, subject => subject.department, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  subjects: Subject[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
