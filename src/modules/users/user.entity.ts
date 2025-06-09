import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm'
import { Role } from '../../enums/role.enum'
import { UserStatus } from '../../enums/status.enum'

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  username: string

  @Column()
  email: string

  @Column()
  password: string

  @Column({ nullable: true })
  saint_name: string

  @Column({ nullable: true })
  phone_number: string

  @Column({ nullable: true })
  address: string

  @Column()
  avatar: string

  // nơi sinh
  @Column({ nullable: true })
  birth_place: string

  @Column({ nullable: true })
  birth_date: Date

  // giáo xứ
  @Column({ nullable: true })
  parish: string

  // giáo hat
  @Column({ nullable: true })
  deanery: string

  // giáo phận
  @Column({ nullable: true })
  diocese: string

  // dòng tu
  @Column({ nullable: true })
  congregation: string

  @Column({
    type: 'tinyint',
    default: Role.STUDENT,
  })
  role: Role

  @Column({
    type: 'tinyint',
    default: UserStatus.INACTIVE,
  })
  status: UserStatus

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
