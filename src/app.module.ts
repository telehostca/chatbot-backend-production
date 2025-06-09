/**
 * Módulo principal de la aplicación.
 * Este módulo configura:
 * - Conexiones a bases de datos
 * - Variables de entorno
 * - Módulos de la aplicación
 * - Configuración global
 * 
 * @module AppModule
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
import { ValeryModule } from './valery/valery.module';
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
// import { TestSaasController } from './test-saas.controller'; // COMENTADO TEMPORALMENTE
import { SetupController } from './setup/setup.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', 'env.local'],
    }),
    TypeOrmModule.forRootAsync({
      name: 'users',
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const usersDbConfig = configService.get('database.users');
        if (!usersDbConfig) {
          throw new Error('No se encontró la configuración de database.users');
        }
        
        // Configuración exclusiva para PostgreSQL
        return {
          name: 'users',
          type: 'postgres',
          host: usersDbConfig.host,
          port: usersDbConfig.port,
          username: usersDbConfig.username,
          password: usersDbConfig.password,
          database: usersDbConfig.database,
          entities: [
            // 👥 Entidades del sistema SaaS
            User,
            UserPlan,
            UserSubscription,
            UserUsage,
            Payment,
            // 💬 Entidades de chat
            ChatSession,
            ChatMessage,
            PersistentSession,
            SearchHistory,
            ShoppingCart,
            MessageTemplate,
            // 🛍️ Entidades de productos
            Product,
            Invoice,
            // 🏢 Entidades de administración
            Chatbot,
            Conversation,
            AdminMessage,
            Organization,
            ChatbotInstance,
            // 🎯 Entidades de promociones
            Promotion,
            Discount,
            Order,
            // 🔔 Entidades de notificaciones
            NotificationEntity,
            NotificationTemplate,
            CronConfig,
            // 🧠 Entidades RAG/IA
            KnowledgeBase,
            DocumentChunk
          ],
          synchronize: false, // ❌ Deshabilitado para usar migraciones manuales
          autoLoadEntities: false,
          logging: configService.get('nodeEnv') === 'development',
          retryAttempts: usersDbConfig.retryAttempts || 3,
          retryDelay: usersDbConfig.retryDelay || 3000,
          ssl: usersDbConfig.ssl || false,
        };
      },
      inject: [ConfigService],
    }),
    // ✅ Módulos del sistema SaaS
    UsersModule,
    SaasModule,
    AuthModule,
    WhatsappModule,
    AIModule,
    OrdersModule,
    PaymentsModule,
    CartsModule,
    NotificationsModule,
    // Incluir ExternalDbModule siempre - manejará conexiones dinámicas
    ExternalDbModule.forRoot(),
    HealthModule,
    ChatModule,
    // ValeryModule.forRoot(), // Módulo temporalmente deshabilitado
    ProductsModule,
    PromotionsModule,
    AdminModule.forRoot(),
    ReportsModule,
    RAGModule,
    ChatbotModule,
  ],
  controllers: [
    // TestSaasController, // COMENTADO TEMPORALMENTE
    SetupController
  ],
  providers: [EnhancedAIAgentService],
})
export class AppModule {} 