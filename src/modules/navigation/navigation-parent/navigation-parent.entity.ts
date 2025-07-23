import { Entity, PrimaryGeneratedColumn, Column, OneToMany, DeleteDateColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { NavigationSub } from '../navigation-sub/navigation-sub.entity'

@Entity('navigations')
export class NavigationParent {
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

  @OneToMany(() => NavigationSub, subNavigation => subNavigation.navigation, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  subNavigations: NavigationSub[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
