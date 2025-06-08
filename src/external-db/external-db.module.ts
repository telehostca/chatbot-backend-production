import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExternalDbService } from './external-db.service';
import { ExternalDbController } from './external-db.controller';
import { ChatbotInstance } from '../admin/entities/chatbot-instance.entity';

@Module({})
export class ExternalDbModule {
  static forRoot(): DynamicModule {
    return {
      module: ExternalDbModule,
      imports: [
        // Importar ChatbotInstance para poder cargar configuraciones de BD
        TypeOrmModule.forFeature([ChatbotInstance], 'users')
      ],
      controllers: [ExternalDbController],
      providers: [ExternalDbService],
      exports: [ExternalDbService],
    };
  }
} 