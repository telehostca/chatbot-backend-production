import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from './user.entity';

@Entity('user_plans')
export class UserPlan {
  @ApiProperty({ description: 'ID único del plan' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Nombre del plan' })
  @Column({ unique: true })
  name: string;

  @ApiProperty({ description: 'Descripción del plan' })
  @Column()
  description: string;

  @ApiProperty({ description: 'Precio del plan' })
  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @ApiProperty({ description: 'Moneda del plan' })
  @Column({ default: 'USD' })
  currency: string;

  @ApiProperty({ description: 'Ciclo de facturación' })
  @Column({ type: 'enum', enum: ['monthly', 'yearly', 'lifetime'], default: 'monthly' })
  billing_cycle: string;

  @ApiProperty({ description: 'Características del plan' })
  @Column({ type: 'json', nullable: true })
  features: any; // Array de características del plan

  @ApiProperty({ description: 'Máximo de chatbots permitidos' })
  @Column({ default: 0 })
  max_chatbots: number;

  @ApiProperty({ description: 'Máximo de mensajes por mes' })
  @Column({ default: 1000 })
  max_messages_per_month: number;

  @ApiProperty({ description: 'Integración con WhatsApp habilitada' })
  @Column({ default: true })
  whatsapp_integration: boolean;

  @ApiProperty({ description: 'Respuestas con IA habilitadas' })
  @Column({ default: false })
  ai_responses: boolean;

  @ApiProperty({ description: 'Analíticas habilitadas' })
  @Column({ default: false })
  analytics: boolean;

  @ApiProperty({ description: 'Personalización de marca habilitada' })
  @Column({ default: false })
  custom_branding: boolean;

  @ApiProperty({ description: 'Plan activo' })
  @Column({ default: true })
  is_active: boolean;

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({ description: 'Fecha de actualización' })
  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => User, user => user.plan)
  users: User[];
} 