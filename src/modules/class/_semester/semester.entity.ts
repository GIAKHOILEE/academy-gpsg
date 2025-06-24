import { Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
import { Column } from 'typeorm'
import { Classes } from '../class.entity'

@Entity()
export class Semester {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @OneToMany(() => Classes, classes => classes.semester, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  classes: Classes[]
}
