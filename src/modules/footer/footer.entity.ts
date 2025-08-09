import { FooterEnum } from '@enums/footer.enum'
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm'

@Entity('footer')
export class Footer {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'text', nullable: false })
  title: string

  @Column({ type: 'text', nullable: false })
  content: string

  @Column({ type: 'enum', enum: FooterEnum, nullable: false })
  type: FooterEnum

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date

  @DeleteDateColumn()
  deleted_at: Date
}
