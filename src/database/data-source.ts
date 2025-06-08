import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';

// 👥 Entidades de usuarios y sistema SaaS
import { User } from '../users/entities/user.entity';
import { UserPlan } from '../users/entities/user-plan.entity';
import { UserSubscription } from '../users/entities/user-subscription.entity';
import { UserUsage } from '../users/entities/user-usage.entity';

// 💳 Entidades de pagos
import { Payment } from '../payments/entities/payment.entity';

// 💬 Entidades de chat
import { ChatSession } from '../chat/entities/chat-session.entity';
import { ChatMessage } from '../chat/entities/message.entity';
import { MessageTemplate } from '../chat/entities/message-template.entity';
import { PersistentSession } from '../chat/entities/persistent-session.entity';
import { SearchHistory } from '../chat/entities/search-history.entity';
import { ShoppingCart } from '../chat/entities/shopping-cart.entity';

// 🏢 Entidades de administración
import { Chatbot } from '../admin/entities/chatbot.entity';
import { Conversation } from '../admin/entities/conversation.entity';
import { AdminMessage } from '../admin/entities/message.entity';
import { Organization } from '../admin/entities/organization.entity';
import { ChatbotInstance } from '../admin/entities/chatbot-instance.entity';

// 🎯 Entidades de promociones
import { Promotion } from '../promotions/entities/promotion.entity';
import { Discount } from '../promotions/entities/discount.entity';

// 🔔 Entidades de notificaciones
import { NotificationEntity } from '../notifications/entities/notification.entity';
import { NotificationTemplate } from '../notifications/entities/notification-template.entity';
import { CronConfig } from '../notifications/entities/cron-config.entity';

// 🧠 Entidades RAG/IA
import { KnowledgeBase } from '../rag/entities/knowledge-base.entity';
import { DocumentChunk } from '../rag/entities/document-chunk.entity';

// Cargar variables de entorno
config({ path: join(__dirname, '../../.env') });
config({ path: join(__dirname, '../../env.local') });

// 🐘 Configuración PostgreSQL únicamente
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '5432');
const dbUsername = process.env.DB_USERNAME || 'postgres';
const dbPassword = process.env.DB_PASSWORD || '0024';
const dbDatabase = process.env.DB_DATABASE || 'chatbot_backend';
const dbSsl = process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production';

console.log('🚀 Sistema SaaS - PostgreSQL Configuration:', {
  host: dbHost,
  port: dbPort,
  database: dbDatabase,
  username: dbUsername,
  ssl: dbSsl ? 'enabled' : 'disabled',
  environment: process.env.NODE_ENV || 'development'
});

// 📋 Todas las entidades del sistema SaaS
const entities = [
  // 👥 Sistema de usuarios y planes
  User,
  UserPlan,
  UserSubscription,
  UserUsage,
  
  // 💳 Sistema de pagos
  Payment,
  
  // 💬 Sistema de chat
  ChatSession,
  ChatMessage,
  MessageTemplate,
  PersistentSession,
  SearchHistory,
  ShoppingCart,
  
  // 🏢 Sistema de administración
  Chatbot,
  Conversation,
  AdminMessage,
  Organization,
  ChatbotInstance,
  
  // 🎯 Sistema de promociones
  Promotion,
  Discount,
  
  // 🔔 Sistema de notificaciones
  NotificationEntity,
  NotificationTemplate,
  CronConfig,

  // 🧠 Sistema RAG/IA
  KnowledgeBase,
  DocumentChunk
];

// 🐘 Configuración optimizada para PostgreSQL
export default new DataSource({
  type: 'postgres',
  host: dbHost,
  port: dbPort,
  username: dbUsername,
  password: dbPassword,
  database: dbDatabase,
  entities,
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development' ? ['error'] : false,
  ssl: dbSsl ? { rejectUnauthorized: false } : false,
  // retryAttempts: 10,
  // retryDelay: 3000,
  // connectTimeoutMS: 15000,
  extra: {
    max: 25,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 600000
  }
}); 