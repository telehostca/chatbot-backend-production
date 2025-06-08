import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('notifications')
export class NotificationEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'phone_number' })
  phoneNumber: string;

  @Column('text')
  message: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'scheduled'
  })
  status: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'bulk'
  })
  type: string;

  @Column({ name: 'schedule_date', nullable: true })
  scheduleDate: Date;

  @Column({ name: 'sent_at', nullable: true })
  sentAt: Date;

  @Column({ name: 'cancelled_at', nullable: true })
  cancelledAt: Date;

  @Column({ nullable: true, type: 'text' })
  error: string;

  @Column({ name: 'campaign_id', nullable: true })
  campaignId: string;

  @Column({ nullable: true, type: 'text' })
  metadata: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 