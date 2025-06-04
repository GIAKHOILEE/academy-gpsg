import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm'
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
