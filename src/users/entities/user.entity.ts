import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { Conversation } from '../../admin/entities/conversation.entity';
import { UserPlan } from './user-plan.entity';
import { UserSubscription } from './user-subscription.entity';
import { UserUsage } from './user-usage.entity';
import { Payment } from '../../payments/entities/payment.entity';

@Entity('users')
export class User {
  @ApiProperty({ description: 'ID único del usuario' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ description: 'Nombre del usuario' })
  @Column()
  name: string;

  @ApiProperty({ description: 'Email del usuario' })
  @Column({ unique: true })
  email: string;

  @ApiProperty({ description: 'Contraseña del usuario' })
  @Column()
  password: string;

  @ApiProperty({ description: 'Teléfono del usuario', required: false })
  @Column({ nullable: true })
  phone: string;

  @ApiProperty({ description: 'Código de cliente', required: false })
  @Column({ nullable: true })
  codigoCliente: string;

  @ApiProperty({ description: 'Estado del usuario' })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Saldo del usuario', required: false })
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  saldo: number;

  @ApiProperty({ description: 'Dirección del usuario', required: false })
  @Column({ nullable: true })
  direccion: string;

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de actualización' })
  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  role: string;

  @Column()
  status: string;

  @Column({ nullable: true })
  nombre: string;

  @Column({ nullable: true })
  rif: string;

  @Column({ name: 'direccion1', nullable: true })
  direccion1: string;

  @Column({ name: 'direccion2', nullable: true })
  direccion2: string;

  @Column({ name: 'idpais', nullable: true })
  idPais: number;

  @Column({ name: 'idestado', nullable: true })
  idEstado: number;

  @Column({ name: 'idciudad', nullable: true })
  idCiudad: number;

  @Column({ name: 'idmunicipio', nullable: true })
  idMunicipio: number;

  @Column({ name: 'codigopostal', nullable: true })
  codigoPostal: string;

  @Column({ name: 'telefono1', nullable: true })
  telefono1: string;

  @Column({ name: 'telefono2', nullable: true })
  telefono2: string;

  @Column({ name: 'tienecredito', nullable: true })
  tieneCredito: number;

  @Column({ name: 'esexento', nullable: true })
  esExento: number;

  @Column({ name: 'diascredito', nullable: true })
  diasCredito: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  pagos: number;

  @Column({ name: 'fechaultimaventa', type: 'timestamp', nullable: true })
  fechaUltimaVenta: Date;

  @Column({ name: 'fechacreacion', type: 'timestamp', nullable: true })
  fechaCreacion: Date;

  @Column({ name: 'fechacredito', type: 'timestamp', nullable: true })
  fechaCredito: Date;

  @Column({ name: 'esagentederetencion', nullable: true })
  esAgenteDeRetencion: number;

  @Column({ name: 'redsocial1', nullable: true })
  redSocial1: string;

  @Column({ name: 'redsocial2', nullable: true })
  redSocial2: string;

  @Column({ name: 'redsocial3', nullable: true })
  redSocial3: string;

  @Column({ nullable: true })
  coordenadas: string;

  @OneToMany(() => Conversation, conversation => conversation.user)
  conversations: Conversation[];

  // Campos del sistema SaaS
  @ApiProperty({ description: 'Plan actual del usuario', required: false })
  @Column({ nullable: true })
  plan_id: number;

  @ApiProperty({ description: 'Fecha de inicio de prueba gratuita', required: false })
  @Column({ nullable: true })
  trial_started_at: Date;

  @ApiProperty({ description: 'Fecha de fin de prueba gratuita', required: false })
  @Column({ nullable: true })
  trial_ends_at: Date;

  @ApiProperty({ description: 'Configuración de usuario', required: false })
  @Column({ type: 'json', nullable: true })
  settings: any;

  // Relaciones del sistema SaaS
  @ManyToOne(() => UserPlan, { nullable: true })
  @JoinColumn({ name: 'plan_id' })
  plan: UserPlan;

  @OneToMany(() => UserSubscription, subscription => subscription.user)
  subscriptions: UserSubscription[];

  @OneToMany(() => UserUsage, usage => usage.user)
  usage_records: UserUsage[];

  @OneToMany(() => Payment, payment => payment.user)
  payments: Payment[];
} 