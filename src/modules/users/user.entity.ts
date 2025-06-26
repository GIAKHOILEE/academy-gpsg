import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm'
import { UserStatus } from '@enums/status.enum'
import { Gender, Role } from '@enums/role.enum'

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ nullable: true })
  full_name: string

  @Column({ unique: true, nullable: true })
  username: string

  @Column({ nullable: true, unique: true })
  code: string

  @Column({ unique: true, nullable: true })
  email: string

  @Column({ nullable: true })
  password: string

  @Column({ nullable: true })
  saint_name: string

  @Column({ nullable: true })
  gender: Gender

  @Column({ nullable: true })
  phone_number: string

  @Column({ nullable: true })
  address: string

  @Column({
    nullable: true,
    default:
      'https://hvmvsaigon.edu.vn/img_data/images/Logo/logo.png?fbclid=IwY2xjawK06L1leHRuA2FlbQIxMQABHsnTQpPdhGmH5uQ_J38nn3Qq0SpH1wvD9RedHNeFEjJG7h6j4c3kIyx4yBHC_aem_aWpVMiPMe_YW4_baT8qkHQ',
  })
  avatar: string

  // nơi sinh
  @Column({ nullable: true })
  birth_place: string

  @Column({ nullable: true })
  birth_date: string

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
    default: UserStatus.ACTIVE,
  })
  status: UserStatus

  @Column({ nullable: true })
  is_temporary: boolean

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
