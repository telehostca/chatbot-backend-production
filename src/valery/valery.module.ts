import { Module, forwardRef, DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ValeryService } from './valery.service';
import { ValeryDbService } from './valery-db.service';
import { ValeryChatbotService } from './valery-chatbot.service';
import { ValeryToolsService } from './tools/valery-tools.service';
import { ChatModule } from '../chat/chat.module';
import { ExternalDbModule } from '../external-db/external-db.module';
import { DatabaseMapperService } from '../chatbot/services/database-mapper.service';
import { Product } from '../products/entities/product.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { User } from '../users/entities/user.entity';
import { ChatbotInstance } from '../admin/entities/chatbot-instance.entity';
import { ProductsModule } from '../products/products.module';

@Module({})
export class ValeryModule {
  static forRoot(): DynamicModule {
    const imports = [
      ConfigModule,
      forwardRef(() => ChatModule),
      TypeOrmModule.forFeature([
        Product,
        Invoice,
        User,
        ChatbotInstance
      ], 'users'),
      ProductsModule
    ];

    // Incluir ExternalDbModule siempre - manejará conexiones dinámicas
    imports.push(ExternalDbModule.forRoot());

    return {
      module: ValeryModule,
      imports,
      providers: [
        ValeryService,
        ValeryDbService,
        ValeryChatbotService,
        ValeryToolsService,
        DatabaseMapperService,
      ],
      exports: [
        ValeryService,
        ValeryDbService,
        ValeryChatbotService,
        ValeryToolsService,
      ],
    };
  }
} 