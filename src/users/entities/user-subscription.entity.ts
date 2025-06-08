import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { UserPlan } from './user-plan.entity';
import { Payment } from '../../payments/entities/payment.entity';

@Entity('user_subscriptions')
export class UserSubscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  plan_id: number;

  @Column({ type: 'enum', enum: ['active', 'inactive', 'cancelled', 'expired'], default: 'active' })
  status: string;

  @Column({ type: 'date' })
  start_date: Date;

  @Column({ type: 'date' })
  end_date: Date;

  @Column({ type: 'date', nullable: true })
  trial_end_date: Date;

  @Column({ default: false })
  is_trial: boolean;

  @Column({ default: false })
  auto_renew: boolean;

  @Column('decimal', { precision: 10, scale: 2 })
  amount_paid: number;

  @Column({ default: 'USD' })
  currency: string;

  @Column({ nullable: true })
  stripe_subscription_id: string;

  @Column({ nullable: true })
  cancelled_at: Date;

  @Column({ nullable: true })
  cancellation_reason: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relaciones
  @ManyToOne(() => User, user => user.subscriptions)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => UserPlan, plan => plan.users)
  @JoinColumn({ name: 'plan_id' })
  plan: UserPlan;

  @OneToMany(() => Payment, payment => payment.subscription)
  payments: Payment[];
} 