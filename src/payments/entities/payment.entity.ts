import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/entities/user.entity';
import { UserSubscription } from '../../users/entities/user-subscription.entity';

@Entity('payments')
export class Payment {
  @ApiProperty({ description: 'ID único del pago' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'ID del usuario' })
  @Column()
  user_id: string;

  @ApiProperty({ description: 'Monto del pago' })
  @Column({ nullable: true })
  subscription_id: number;

  @ApiProperty({ description: 'Monto del pago' })
  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @ApiProperty({ description: 'Moneda del pago' })
  @Column({ default: 'USD' })
  currency: string;

  @ApiProperty({ description: 'Estado del pago' })
  @Column({ type: 'enum', enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' })
  status: string;

  @ApiProperty({ description: 'Método de pago' })
  @Column({ type: 'enum', enum: ['stripe', 'paypal', 'bank_transfer', 'crypto'], default: 'stripe' })
  payment_method: string;

  @ApiProperty({ description: 'ID externo del pago' })
  @Column({ nullable: true })
  external_payment_id: string;

  @ApiProperty({ description: 'ID de transacción' })
  @Column({ nullable: true })
  transaction_id: string;

  @ApiProperty({ description: 'Detalles del pago' })
  @Column({ type: 'json', nullable: true })
  payment_details: any;

  @ApiProperty({ description: 'Descripción del pago' })
  @Column({ nullable: true })
  description: string;

  @ApiProperty({ description: 'URL de factura' })
  @Column({ nullable: true })
  invoice_url: string;

  @ApiProperty({ description: 'URL de recibo' })
  @Column({ nullable: true })
  receipt_url: string;

  @ApiProperty({ description: 'Razón de fallo' })
  @Column({ nullable: true })
  failure_reason: string;

  @ApiProperty({ description: 'Fecha de procesamiento' })
  @Column({ nullable: true })
  processed_at: Date;

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn()
  created_at: Date;

  @ApiProperty({ description: 'Fecha de actualización' })
  @UpdateDateColumn()
  updated_at: Date;

  // Relaciones
  @ManyToOne(() => User, user => user.payments)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => UserSubscription, subscription => subscription.payments)
  @JoinColumn({ name: 'subscription_id' })
  subscription: UserSubscription;
} 