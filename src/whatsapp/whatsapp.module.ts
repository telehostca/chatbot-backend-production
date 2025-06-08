/**
 * Módulo que maneja la integración con WhatsApp.
 * Este módulo proporciona:
 * - Controlador para manejar webhooks y mensajes
 * - Servicio para interactuar con la API de WhatsApp
 * - Configuración de conexión a la base de datos
 * 
 * @module WhatsappModule
 */
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { BasicChatbotSimpleService } from './basic-chatbot-simple.service';
import { WhatsAppConfigService } from './services/whatsapp-config.service';
import { ChatbotFactoryCleanService } from '../chatbot/services/chatbot-factory-clean.service';
import { GenericChatbotService } from '../chatbot/services/generic-chatbot.service';
import { DatabaseMapperService } from '../chatbot/services/database-mapper.service';
import { ExternalDbService } from '../external-db/external-db.service';
import { ExternalDbModule } from '../external-db/external-db.module';
import { EvolutionApiProvider } from './providers/evolution-api.provider';
import { WabaSmsProvider } from './providers/waba-sms.provider';
import { ChatModule } from '../chat/chat.module';
import { MediaModule } from '../media/media.module';
import { ValeryModule } from '../valery/valery.module';
import { AdminModule } from '../admin/admin.module';
import { AIModule } from '../ai/ai.module';
import { Chatbot } from '../admin/entities/chatbot.entity';
import { ChatbotInstance } from '../admin/entities/chatbot-instance.entity';
import { Conversation } from '../admin/entities/conversation.entity';
import { AdminMessage } from '../admin/entities/message.entity';
import { Organization } from '../admin/entities/organization.entity';
import { MultiTenantService } from '../admin/services/multi-tenant.service';
import { WhatsAppProvider } from './interfaces/whatsapp-provider.interface';

@Module({
  imports: [
    ConfigModule,
    MediaModule,
    AIModule,
    ExternalDbModule.forRoot(),

    forwardRef(() => ChatModule),
    // forwardRef(() => ValeryModule.forRoot()), // Temporalmente deshabilitado

    forwardRef(() => AdminModule.forRoot()),
    TypeOrmModule.forFeature([
      Chatbot,
      ChatbotInstance,
      Conversation,
      AdminMessage,
      Organization
    ], 'users'),
  ],
  controllers: [WhatsappController],
  providers: [
    WhatsappService,
    BasicChatbotSimpleService,
    WhatsAppConfigService,
    {
      provide: 'CHATBOT_SERVICE_INTERFACE',
      useClass: ChatbotFactoryCleanService,
    },
    GenericChatbotService,
    ChatbotFactoryCleanService,
    {
      provide: 'WHATSAPP_PROVIDERS',
      useFactory: (configService: ConfigService): WhatsAppProvider[] => {
        return [
          new EvolutionApiProvider(configService),
          new WabaSmsProvider(configService),
        ];
      },
      inject: [ConfigService]
    },
    MultiTenantService,
    DatabaseMapperService
  ],
  exports: [
    WhatsappService,
    MultiTenantService,
    GenericChatbotService,
    ChatbotFactoryCleanService,
  ]
})
export class WhatsappModule {} 