import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ChatbotInstance } from './chatbot-instance.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 255, nullable: true })
  logo: string;

  @Column({ name: 'contact_email', length: 100, nullable: true })
  contactEmail: string;

  @Column({ name: 'contact_phone', length: 20, nullable: true })
  contactPhone: string;

  @Column({ type: 'text', nullable: true })
  settings: {
    timezone?: string;
    language?: string;
    currency?: string;
    theme?: string;
  };

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'max_chatbots', type: 'int', default: 5 })
  maxChatbots: number;

  @Column({ name: 'plan_type', type: 'varchar', length: 20, default: 'trial' })
  planType: 'trial' | 'basic' | 'pro' | 'enterprise';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ChatbotInstance, chatbot => chatbot.organization)
  chatbots: ChatbotInstance[];
} 