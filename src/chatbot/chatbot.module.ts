import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BasicChatbotService } from './basic-chatbot.service';
import { GenericChatbotService } from './services/generic-chatbot.service';
import { ChatbotFactoryCleanService } from './services/chatbot-factory-clean.service';
import { DatabaseConfigController } from './controllers/database-config.controller';
import { DatabaseMapperService } from './services/database-mapper.service';
import { SchemaDetectionService } from './services/schema-detection.service';
import { ChatbotInstance } from '../admin/entities/chatbot-instance.entity';
import { PersistentSession } from '../chat/entities/persistent-session.entity';
import { ExternalDbService } from '../external-db/external-db.service';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatbotInstance, PersistentSession], 'users'),
    forwardRef(() => ChatModule)
  ],
  controllers: [
    DatabaseConfigController
  ],
  providers: [
    BasicChatbotService,
    GenericChatbotService,
    ChatbotFactoryCleanService,
    DatabaseMapperService,
    SchemaDetectionService,
    ExternalDbService
  ],
  exports: [
    BasicChatbotService,
    GenericChatbotService,
    ChatbotFactoryCleanService,
    DatabaseMapperService
  ]
})
export class ChatbotModule {}