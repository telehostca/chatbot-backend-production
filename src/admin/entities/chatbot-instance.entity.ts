import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Organization } from './organization.entity';
import { KnowledgeBase } from '../../rag/entities/knowledge-base.entity';

// Transformador para campos JSON
const jsonTransformer = {
  to: (value: any) => JSON.stringify(value),
  from: (value: string) => {
    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch (error) {
      return value;
    }
  }
};

@Entity('chatbot_instances')
export class ChatbotInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 255, nullable: true })
  avatar: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  // Configuración de IA
  @Column({ name: 'ai_config', type: 'text', transformer: jsonTransformer })
  aiConfig: {
    provider: 'deepseek' | 'openai' | 'claude' | 'gemini' | 'custom';
    apiKey: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    whisperApiKey?: string;
    whisperUrl?: string;
    visionApiKey?: string;
    visionUrl?: string;
  };

  // Configuración de WhatsApp
  @Column({ name: 'whatsapp_config', type: 'text', transformer: jsonTransformer })
  whatsappConfig: {
    provider: 'evolution-api' | 'waba-sms' | 'custom';
    instanceName: string;
    apiUrl: string;
    apiKey: string;
    webhookUrl?: string;
    phoneNumber?: string;
  };

  // Configuración de Base de Datos Externa
  @Column({ name: 'external_db_config', type: 'text', nullable: true, transformer: jsonTransformer })
  externalDbConfig: {
    enabled: boolean;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
    type?: 'mysql' | 'postgres' | 'mssql';
    ssl?: boolean;
  };

  // Configuración de mapeo de Base de Datos para DatabaseMapperService
  @Column({ name: 'db_mapping_config', type: 'text', nullable: true, transformer: jsonTransformer })
  dbMappingConfig: any;

  // Configuración del Chatbot
  @Column({ name: 'chatbot_config', type: 'text', transformer: jsonTransformer })
  chatbotConfig: {
    language: string;
    personality: 'professional' | 'friendly' | 'casual' | 'enthusiastic';
    responseStyle: 'formal' | 'casual' | 'technical';
    useEmojis: boolean;
    responseTimeMs: number;
    maxCartItems: number;
    sessionTimeoutHours: number;
    enableSentimentAnalysis: boolean;
    enableSpellCorrection: boolean;
  };

  // Configuración de Notificaciones
  @Column({ name: 'notification_config', type: 'text', transformer: jsonTransformer })
  notificationConfig: {
    cartReminders: boolean;
    specialOffers: boolean;
    statusUpdates: boolean;
    reminderIntervalHours: number;
    maxReminders: number;
  };

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: 'active' | 'inactive' | 'maintenance' | 'suspended';

  // Estadísticas básicas
  @Column({ name: 'total_conversations', type: 'int', default: 0 })
  totalConversations: number;

  @Column({ name: 'total_messages', type: 'int', default: 0 })
  totalMessages: number;

  @Column({ name: 'total_revenue', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalRevenue: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relación con Organization
  @ManyToOne(() => Organization, organization => organization.chatbots)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  // Relación con bases de conocimiento RAG
  @OneToMany(() => KnowledgeBase, kb => kb.chatbot)
  knowledgeBases: KnowledgeBase[];
} 