import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('contact')
export class Contact {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar', length: 255, nullable: true })
  icon: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  logo: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  copyright: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  hotline: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  phone: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  slogan: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  time_work: string

  @Column({ type: 'text', nullable: true })
  map: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  facebook: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  viber: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  instagram: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  twitter: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  youtube: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  zalo: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  skype: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  telegram: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  whatsapp: string

  @Column({ type: 'varchar', length: 255, nullable: true })
  linkedin: string

  @CreateDateColumn()
  created_at: Date

  @UpdateDateColumn()
  updated_at: Date
}
