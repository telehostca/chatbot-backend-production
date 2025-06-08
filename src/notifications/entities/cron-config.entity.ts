import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('cron_config')
export class CronConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: false })
  enabled: boolean;

  @Column({ name: 'max_notifications_per_hour', default: 50 })
  maxNotificationsPerHour: number;

  @Column({ name: 'retry_attempts', default: 3 })
  retryAttempts: number;

  @Column({ name: 'batch_size', default: 100 })
  batchSize: number;

  @Column({ nullable: true })
  timezone: string;

  @Column({ name: 'allowed_time_ranges', type: 'json', nullable: true })
  allowedTimeRanges: {
    start: string; // formato "09:00"
    end: string;   // formato "18:00"
  }[];

  @Column({ name: 'blocked_days', type: 'text', nullable: true })
  blockedDays: string; // JSON string: '["saturday", "sunday"]'

  @Column({ name: 'last_run_at', nullable: true })
  lastRunAt: Date;

  @Column({ name: 'total_notifications_sent', default: 0 })
  totalNotificationsSent: number;

  @Column({ name: 'total_failures', default: 0 })
  totalFailures: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 