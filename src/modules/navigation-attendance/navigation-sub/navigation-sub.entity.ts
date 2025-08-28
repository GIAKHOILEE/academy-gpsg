import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm'
import { NavigationParentAttendance } from '../navigation-parent/navigation-parent.entity'

@Entity('sub_navigations_attendance')
export class NavigationSubAttendance {
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

  @ManyToOne(() => NavigationParentAttendance, navigation => navigation.subNavigations, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  navigation: NavigationParentAttendance

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
