import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BasicChatbotService } from './basic-chatbot.service';
import { GenericChatbotService } from './services/generic-chatbot.service';
import { ChatbotFactoryCleanService } from './services/chatbot-factory-clean.service';
import { DatabaseConfigController } from './controllers/database-config.controller';
import { DatabaseMapperService } from './services/database-mapper.service';
import { SchemaDetectionService } from './services/schema-detection.service';
import { ChatbotInstance } from '../admin/entities/chatbot-instance.entity';
import { ExternalDbService } from '../external-db/external-db.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatbotInstance], 'users')
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