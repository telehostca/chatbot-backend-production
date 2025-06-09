import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './controllers/admin.controller';
import { MultiTenantController } from './controllers/multi-tenant.controller';
import { NotificationTemplatesController } from './controllers/notification-templates.controller';
import { StatsController } from './controllers/stats.controller';
import { SessionsController } from './controllers/sessions.controller';
import { AdminService } from './services/admin.service';
import { MultiTenantService } from './services/multi-tenant.service';
import { ChatbotService } from './services/chatbot.service';
import { ConversationService } from './services/conversation.service';
import { PromotionService } from './services/promotion.service';
import { ReportService } from './services/report.service';
import { StatsService } from './services/stats.service';
import { SessionsService } from './services/sessions.service';
import { CartsModule } from '../carts/carts.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { ExternalDbModule } from '../external-db/external-db.module';
import { PersistentSession } from '../chat/entities/persistent-session.entity';
import { ChatMessage } from '../chat/entities/message.entity';
import { SearchHistory } from '../chat/entities/search-history.entity';
import { ShoppingCart } from '../chat/entities/shopping-cart.entity';
import { Discount } from '../promotions/entities/discount.entity';
import { Chatbot } from './entities/chatbot.entity';
import { Conversation } from './entities/conversation.entity';
import { AdminMessage } from './entities/message.entity';
import { Organization } from './entities/organization.entity';
import { ChatbotInstance } from './entities/chatbot-instance.entity';
import { User } from '../users/entities/user.entity';
import { Order } from '../orders/entities/order.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { KnowledgeBase } from '../rag/entities/knowledge-base.entity';
import { NotificationTemplate } from '../notifications/entities/notification-template.entity';

@Module({})
export class AdminModule {
  static forRoot(): DynamicModule {
    const imports = [
      TypeOrmModule.forFeature([
        PersistentSession,
        ChatMessage,
        SearchHistory,
        ShoppingCart,
        Discount,
        Chatbot,
        Conversation,
        AdminMessage,
        Organization,
        ChatbotInstance,
        User,
        Order,
        Promotion,
        KnowledgeBase,
        NotificationTemplate
      ], 'users'),
      CartsModule,
      PromotionsModule,
      NotificationsModule,
      WhatsappModule,
    ];

    // Solo incluir ExternalDbModule si está configurado
    if (process.env.EXTERNAL_DB_HOST) {
      imports.push(ExternalDbModule.forRoot());
    }

    return {
      module: AdminModule,
      imports,
      controllers: [
        AdminController,
        MultiTenantController,
        NotificationTemplatesController,
        StatsController,
        SessionsController
      ],
      providers: [
        AdminService,
        MultiTenantService,
        ChatbotService,
        ConversationService,
        PromotionService,
        ReportService,
        StatsService,
        SessionsService,
      ],
      exports: [
        AdminService,
        MultiTenantService,
        ChatbotService,
        ConversationService,
        PromotionService,
        ReportService,
        StatsService,
        SessionsService
      ],
    };
  }
} 