import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('user_usage')
export class UserUsage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column({ default: 0 })
  messages_sent_this_month: number;

  @Column({ default: 0 })
  chatbots_created: number;

  @Column({ default: 0 })
  api_calls_this_month: number;

  @Column({ default: 0 })
  storage_used_mb: number;

  @Column({ type: 'date' })
  usage_month: Date; // Para tracking mensual

  @Column({ type: 'json', nullable: true })
  feature_usage: any; // Uso detallado de características

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relaciones
  @ManyToOne(() => User, user => user.usage_records)
  @JoinColumn({ name: 'user_id' })
  user: User;
} 