/**
 * Entidad que representa una sesión persistente de WhatsApp.
 * Almacena información del cliente, estado de autenticación y contexto.
 * 
 * @class PersistentSession
 */
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { ChatMessage } from './message.entity';
import { SearchHistory } from './search-history.entity';
import { ShoppingCart } from './shopping-cart.entity';

@Entity('persistent_sessions')
@Index(['phoneNumber'], { unique: true })
export class PersistentSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Número de teléfono normalizado del usuario
   */
  @Column({ unique: true, name: 'phone_number' })
  phoneNumber: string;

  /**
   * Código del cliente en la base de datos externa (si está autenticado)
   */
  @Column({ nullable: true, name: 'client_id' })
  clientId: string;

  /**
   * Nombre del cliente
   */
  @Column({ nullable: true, name: 'client_name' })
  clientName: string;

  /**
   * Número de identificación (cédula/RIF)
   */
  @Column({ nullable: true, name: 'identification_number' })
  identificationNumber: string;

  /**
   * Nombre de perfil de WhatsApp
   */
  @Column({ nullable: true, name: 'client_pushname' })
  clientPushname: string;

  /**
   * Si el cliente está autenticado
   */
  @Column({ default: false, name: 'is_authenticated' })
  isAuthenticated: boolean;

  /**
   * Si es un cliente nuevo (no existe en BD externa)
   */
  @Column({ default: true, name: 'is_new_client' })
  isNewClient: boolean;

  /**
   * Contexto actual de la conversación
   */
  @Column({ default: 'initial' })
  context: string;

  /**
   * Estado de la sesión: 'active', 'paused', 'ended'
   */
  @Column({ default: 'active' })
  status: string;

  /**
   * Último mensaje del usuario
   */
  @Column('text', { nullable: true, name: 'last_user_message' })
  lastUserMessage: string;

  /**
   * Última respuesta del bot
   */
  @Column('text', { nullable: true, name: 'last_bot_response' })
  lastBotResponse: string;

  /**
   * Momento del último mensaje
   */
  @Column({ nullable: true, name: 'last_activity' })
  lastActivity: Date;

  /**
   * Contador total de mensajes en la sesión
   */
  @Column({ default: 0, name: 'message_count' })
  messageCount: number;

  /**
   * Contador de búsquedas realizadas
   */
  @Column({ default: 0, name: 'search_count' })
  searchCount: number;

  /**
   * ID del chatbot activo para esta sesión
   */
  @Column({ nullable: true, name: 'active_chatbot_id' })
  activeChatbotId: string;

  /**
   * Metadatos adicionales de la sesión (JSON)
   */
  @Column('json', { nullable: true })
  metadata: any;

  /**
   * Relación con el historial de búsquedas
   */
  @OneToMany(() => SearchHistory, search => search.session)
  searchHistory: SearchHistory[];

  /**
   * Relación con el carrito de compras
   */
  @OneToMany(() => ShoppingCart, cart => cart.session)
  shoppingCart: ShoppingCart[];

  /**
   * Relación con los mensajes de la sesión
   */
  @OneToMany(() => ChatMessage, message => message.session)
  messages: ChatMessage[];

  /**
   * Momento de creación de la sesión
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Momento de última actualización
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 