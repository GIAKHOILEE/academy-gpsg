import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm'
import { NavigationParent } from '../navigation-parent/navigation-parent.entity'

@Entity('sub_navigations')
export class NavigationSub {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ default: 1.001, type: 'float' })
  index: number

  @Column()
  slug: string

  @Column()
  title: string

  @Column()
  link: string

  @Column({ default: true })
  is_active: boolean

  @ManyToOne(() => NavigationParent, navigation => navigation.subNavigations, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  navigation: NavigationParent

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
