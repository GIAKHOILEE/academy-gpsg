import { Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
import { Column } from 'typeorm'
import { Classes } from '../class.entity'

@Entity()
export class Scholastic {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'float', default: 1.001 })
  index: number

  @Column()
  name: string

  @OneToMany(() => Classes, classes => classes.scholastic, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  classes: Classes[]
}
