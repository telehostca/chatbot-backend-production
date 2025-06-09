/**
 * Módulo principal de la aplicación - Solo PostgreSQL
 * Configuración limpia sin SQLite
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { UsersModule } from './users/users.module';
import { SaasModule } from './saas/saas.module';
import { AuthModule } from './auth/auth.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AIModule } from './ai/ai.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { CartsModule } from './carts/carts.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ExternalDbModule } from './external-db/external-db.module';
import { HealthModule } from './health/health.module';
import { User } from './users/entities/user.entity';
import { UserPlan } from './users/entities/user-plan.entity';
import { UserSubscription } from './users/entities/user-subscription.entity';
import { UserUsage } from './users/entities/user-usage.entity';
import { Payment } from './payments/entities/payment.entity';
import { ChatModule } from './chat/chat.module';
import { ChatSession } from './chat/entities/chat-session.entity';
import { ChatMessage } from './chat/entities/message.entity';
import { PersistentSession } from './chat/entities/persistent-session.entity';
import { SearchHistory } from './chat/entities/search-history.entity';
import { ShoppingCart } from './chat/entities/shopping-cart.entity';
import { MessageTemplate } from './chat/entities/message-template.entity';
import { ChatbotModule } from './chatbot/chatbot.module';
import { Product } from './products/entities/product.entity';
import { Invoice } from './invoices/entities/invoice.entity';
import { Chatbot } from './admin/entities/chatbot.entity';
import { Conversation } from './admin/entities/conversation.entity';
import { AdminMessage } from './admin/entities/message.entity';
import { Organization } from './admin/entities/organization.entity';
import { ChatbotInstance } from './admin/entities/chatbot-instance.entity';
import { Promotion } from './promotions/entities/promotion.entity';
import { Discount } from './promotions/entities/discount.entity';
import { Order } from './orders/entities/order.entity';
import { NotificationEntity } from './notifications/entities/notification.entity';
import { NotificationTemplate } from './notifications/entities/notification-template.entity';
import { CronConfig } from './notifications/entities/cron-config.entity';
import { ProductsModule } from './products/products.module';
import { PromotionsModule } from './promotions/promotions.module';
import { AdminModule } from './admin/admin.module';
import { ReportsModule } from './reports/reports.module';
import { EnhancedAIAgentService } from './ai/services/enhanced-ai-agent.service';
import { RAGModule } from './rag/rag.module';
import { KnowledgeBase } from './rag/entities/knowledge-base.entity';
import { DocumentChunk } from './rag/entities/document-chunk.entity';
// import { TestSaasController } from './test-saas.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'chatbot_saas_local',
      synchronize: false, // ❌ Deshabilitado para usar migraciones manuales
      autoLoadEntities: true,
      logging: true,
    }),
    TypeOrmModule.forFeature([ChatMessage], 'users'),
    UsersModule,
    SaasModule,
    AuthModule,
    WhatsappModule,
    AIModule,
    OrdersModule,
    PaymentsModule,
    CartsModule,
    NotificationsModule,
    ExternalDbModule.forRoot(),
    HealthModule,
    ChatModule,
    ProductsModule,
    PromotionsModule,
    AdminModule.forRoot(),
    ReportsModule,
    RAGModule,
    ChatbotModule,
  ],
  controllers: [], // [TestSaasController],
  providers: [EnhancedAIAgentService],
})
export class AppPostgreSQLModule {} 