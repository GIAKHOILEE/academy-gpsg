import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToOne } from 'typeorm'
import { JoinColumn } from 'typeorm'
import { User } from '../users/user.entity'
@Entity({ name: 'students' })
export class Student {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  code: string

  @OneToOne(() => User, user => user.id, { onDelete: 'CASCADE', onUpdate: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column()
  user_id: number

  @Column({ nullable: true })
  image_4x6: string

  @Column({ nullable: true })
  diploma_image: string

  @Column({ nullable: true })
  transcript_image: string

  @Column({ nullable: true })
  other_document: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
