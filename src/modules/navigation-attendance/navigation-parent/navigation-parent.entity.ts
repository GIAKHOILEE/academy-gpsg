import { Entity, PrimaryGeneratedColumn, Column, OneToMany, DeleteDateColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { NavigationSubAttendance } from '../navigation-sub/navigation-sub.entity'

@Entity('navigations_attendance')
export class NavigationParentAttendance {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ default: 1.001, type: 'float' })
  index: number

  @Column()
  slug: string

  @Column()
  title: string

  @Column({ type: 'text', nullable: true })
  content: string

  @Column({ nullable: true })
  link: string

  @Column({ default: true })
  is_active: boolean

  @OneToMany(() => NavigationSubAttendance, subNavigation => subNavigation.navigation, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  subNavigations: NavigationSubAttendance[]

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
