import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ChatbotInstance } from '../../admin/entities/chatbot-instance.entity';

export enum NotificationCategory {
  DISCOUNT = 'discount',
  PROMOTION = 'promotion',
  WELCOME = 'welcome',
  REMINDER = 'reminder',
  FOLLOWUP = 'followup'
}

export enum NotificationAudience {
  ALL = 'all',
  ACTIVE_USERS = 'active_users',
  RECENT_BUYERS = 'recent_buyers',
  NEW_USERS = 'new_users',
  VIP_USERS = 'vip_users',
  INACTIVE_USERS = 'inactive_users',
  CART_ABANDONERS = 'cart_abandoners',
  VIP_CLIENTS = 'vip_clients',
  ALL_ACTIVE = 'all_active'
}

@Entity('notification_templates')
export class NotificationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column({
    type: 'varchar',
    default: NotificationCategory.PROMOTION
  })
  category: NotificationCategory;

  @Column({
    type: 'varchar',
    default: NotificationAudience.ALL
  })
  audience: NotificationAudience;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // Configuración de Cron
  @Column({ name: 'cron_enabled', default: false })
  cronEnabled: boolean;

  @Column({ name: 'cron_expression', nullable: true })
  cronExpression: string;

  @Column({ name: 'next_execution', nullable: true })
  nextExecution: Date;

  @Column({ name: 'last_execution', nullable: true })
  lastExecution: Date;

  // Estadísticas
  @Column({ name: 'sent_count', default: 0 })
  sentCount: number;

  @Column({ name: 'open_rate', type: 'decimal', precision: 3, scale: 2, default: 0 })
  openRate: number;

  @Column({ name: 'click_rate', type: 'decimal', precision: 3, scale: 2, default: 0 })
  clickRate: number;

  // Variables personalizables
  @Column('json', { nullable: true })
  variables: Record<string, any>;

  // Relación con ChatbotInstance
  @ManyToOne(() => ChatbotInstance, { nullable: true })
  @JoinColumn({ name: 'chatbot_id' })
  chatbot: ChatbotInstance;

  @Column({ name: 'chatbot_id', type: 'uuid', nullable: true })
  chatbotId: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 