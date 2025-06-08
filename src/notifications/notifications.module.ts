import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service';
import { NotificationsController, NotificationTemplatesController } from './notifications.controller';
import { NotificationTemplatesService } from './services/notification-templates.service';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { NotificationEntity } from './entities/notification.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { CronConfig } from './entities/cron-config.entity';
import { ChatbotInstance } from '../admin/entities/chatbot-instance.entity';
import { User } from '../users/entities/user.entity';
import { PersistentSession } from '../chat/entities/persistent-session.entity';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([
      NotificationEntity,
      NotificationTemplate,
      CronConfig,
      ChatbotInstance,
      User,
      PersistentSession
    ], 'users'),
    forwardRef(() => WhatsappModule)
  ],
  controllers: [
    NotificationsController,
    NotificationTemplatesController
  ],
  providers: [
    NotificationsService,
    NotificationTemplatesService
  ],
  exports: [
    NotificationsService,
    NotificationTemplatesService
  ]
})
export class NotificationsModule {} 