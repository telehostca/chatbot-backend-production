import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationTemplate, NotificationCategory, NotificationAudience } from '../entities/notification-template.entity';
import { CronConfig } from '../entities/cron-config.entity';
import { NotificationsService } from '../notifications.service';
import { ChatbotInstance } from '../../admin/entities/chatbot-instance.entity';
import { User } from '../../users/entities/user.entity';
import { PersistentSession } from '../../chat/entities/persistent-session.entity';

export interface CreateNotificationTemplateDto {
  title: string;
  content: string;
  category: NotificationCategory;
  audience: NotificationAudience;
  chatbotId?: string;
  isActive?: boolean;
  cronEnabled?: boolean;
  cronExpression?: string;
  variables?: Record<string, any>;
}

export interface UpdateNotificationTemplateDto extends Partial<CreateNotificationTemplateDto> {
  nextExecution?: Date;
}

export interface CronConfigDto {
  enabled: boolean;
  maxNotificationsPerHour: number;
  retryAttempts: number;
  batchSize: number;
  timezone?: string;
  allowedTimeRanges?: { start: string; end: string }[];
  blockedDays?: string[];
}

@Injectable()
export class NotificationTemplatesService {
  private readonly logger = new Logger(NotificationTemplatesService.name);

  constructor(
    @InjectRepository(NotificationTemplate, 'users')
    private readonly templateRepository: Repository<NotificationTemplate>,
    @InjectRepository(CronConfig, 'users')
    private readonly cronConfigRepository: Repository<CronConfig>,
    @InjectRepository(ChatbotInstance, 'users')
    private readonly chatbotRepository: Repository<ChatbotInstance>,
    @InjectRepository(User, 'users')
    private readonly userRepository: Repository<User>,
    @InjectRepository(PersistentSession, 'users')
    private readonly sessionRepository: Repository<PersistentSession>,
    private readonly notificationsService: NotificationsService
  ) {}

  // ============================================================================
  // GESTIÓN DE PLANTILLAS
  // ============================================================================

  async createTemplate(dto: CreateNotificationTemplateDto): Promise<NotificationTemplate> {
    try {
      const template = this.templateRepository.create({
        ...dto,
        nextExecution: dto.cronEnabled && dto.cronExpression 
          ? this.calculateNextExecution(dto.cronExpression) 
          : null
      });

      const savedTemplate = await this.templateRepository.save(template);
      
      this.logger.log(`🆕 Plantilla de notificación creada: ${savedTemplate.title}`);
      return savedTemplate;
    } catch (error) {
      this.logger.error(`Error creando plantilla: ${error.message}`);
      throw error;
    }
  }

  async updateTemplate(id: string, dto: UpdateNotificationTemplateDto): Promise<NotificationTemplate> {
    try {
      const template = await this.templateRepository.findOne({ where: { id } });
      if (!template) {
        throw new NotFoundException('Plantilla no encontrada');
      }

      // Recalcular próxima ejecución si cambia el cron
      if (dto.cronEnabled && dto.cronExpression) {
        dto.nextExecution = this.calculateNextExecution(dto.cronExpression);
      } else if (dto.cronEnabled === false) {
        dto.nextExecution = null;
      }

      await this.templateRepository.update(id, dto);
      
      const updatedTemplate = await this.templateRepository.findOne({ 
        where: { id },
        relations: ['chatbot', 'chatbot.organization']
      });
      
      this.logger.log(`📝 Plantilla actualizada: ${updatedTemplate.title}`);
      return updatedTemplate;
    } catch (error) {
      this.logger.error(`Error actualizando plantilla: ${error.message}`);
      throw error;
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      const result = await this.templateRepository.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException('Plantilla no encontrada');
      }
      
      this.logger.log(`🗑️ Plantilla eliminada: ${id}`);
    } catch (error) {
      this.logger.error(`Error eliminando plantilla: ${error.message}`);
      throw error;
    }
  }

  async getAllTemplates(): Promise<NotificationTemplate[]> {
    try {
      return await this.templateRepository.find({
        relations: ['chatbot', 'chatbot.organization'],
        order: { createdAt: 'DESC' }
      });
    } catch (error) {
      this.logger.error(`Error obteniendo plantillas: ${error.message}`);
      throw error;
    }
  }

  async getTemplateById(id: string): Promise<NotificationTemplate> {
    try {
      const template = await this.templateRepository.findOne({
        where: { id },
        relations: ['chatbot', 'chatbot.organization']
      });

      if (!template) {
        throw new NotFoundException('Plantilla no encontrada');
      }

      return template;
    } catch (error) {
      this.logger.error(`Error obteniendo plantilla: ${error.message}`);
      throw error;
    }
  }

  async toggleTemplate(id: string): Promise<NotificationTemplate> {
    try {
      const template = await this.getTemplateById(id);
      template.isActive = !template.isActive;
      
      await this.templateRepository.save(template);
      
      this.logger.log(`🔄 Plantilla ${template.isActive ? 'activada' : 'desactivada'}: ${template.title}`);
      return template;
    } catch (error) {
      this.logger.error(`Error cambiando estado de plantilla: ${error.message}`);
      throw error;
    }
  }

  // ============================================================================
  // CONFIGURACIÓN DE CRON
  // ============================================================================

  async getCronConfig(): Promise<CronConfig> {
    try {
      let config = await this.cronConfigRepository.findOne({ where: {} });
      
      if (!config) {
        config = this.cronConfigRepository.create({
          enabled: true,
          maxNotificationsPerHour: 50,
          retryAttempts: 3,
          batchSize: 100,
          timezone: 'America/Caracas'
        });
        await this.cronConfigRepository.save(config);
        this.logger.log(`🚀 CRON JOB DE NOTIFICACIONES ACTIVADO automáticamente`);
      }
      
      return config;
    } catch (error) {
      this.logger.error(`Error obteniendo configuración de cron: ${error.message}`);
      throw error;
    }
  }

  async updateCronConfig(dto: CronConfigDto): Promise<CronConfig> {
    try {
      let config = await this.getCronConfig();
      
      // Convertir blockedDays array a string JSON para almacenamiento
      const updateData = {
        ...dto,
        blockedDays: dto.blockedDays ? JSON.stringify(dto.blockedDays) : null
      };
      
      await this.cronConfigRepository.update(config.id, updateData);
      config = await this.cronConfigRepository.findOne({ where: { id: config.id } });
      
      this.logger.log(`⚙️ Configuración de cron actualizada: habilitado=${config.enabled}`);
      return config;
    } catch (error) {
      this.logger.error(`Error actualizando configuración de cron: ${error.message}`);
      throw error;
    }
  }

  // ============================================================================
  // HELPER METHODS PARA BLOCKED DAYS
  // ============================================================================

  private parseBlockedDays(blockedDaysString: string): string[] {
    try {
      return blockedDaysString ? JSON.parse(blockedDaysString) : [];
    } catch (error) {
      this.logger.warn(`Error parsing blockedDays: ${error.message}`);
      return [];
    }
  }

  private isTimeInBlockedDays(date: Date, blockedDaysString: string): boolean {
    const blockedDays = this.parseBlockedDays(blockedDaysString);
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[date.getDay()];
    return blockedDays.includes(currentDay);
  }

  // ============================================================================
  // CRON JOBS
  // ============================================================================

  @Cron('*/5 * * * *') // Cada 5 minutos
  async processPendingNotifications(): Promise<void> {
    try {
      const config = await this.getCronConfig();
      
      if (!config.enabled) {
        return; // Cron jobs deshabilitados
      }

      const now = new Date();
      const templates = await this.templateRepository.find({
        where: {
          isActive: true,
          cronEnabled: true
        },
        relations: ['chatbot']
      });

      for (const template of templates) {
        if (template.nextExecution && template.nextExecution <= now) {
          await this.executeNotificationTemplate(template, config);
        }
      }

    } catch (error) {
      this.logger.error(`Error en cron job de notificaciones: ${error.message}`);
    }
  }

  private async executeNotificationTemplate(template: NotificationTemplate, config: CronConfig): Promise<void> {
    try {
      this.logger.log(`🚀 Ejecutando plantilla programada: ${template.title}`);

      // Obtener audiencia según el tipo
      const recipients = await this.getAudiencePhoneNumbers(template.audience, template.chatbotId);

      if (recipients.length === 0) {
        this.logger.warn(`No hay destinatarios para la plantilla: ${template.title}`);
        await this.updateNextExecution(template);
        return;
      }

      // Limitar por configuración
      const limitedRecipients = recipients.slice(0, config.batchSize);

      // Enviar notificaciones
      const results = await this.notificationsService.sendBulkNotification(
        limitedRecipients,
        this.replaceVariables(template.content, template.variables || {}),
        {
          batchSize: config.batchSize,
          delayBetweenMessages: Math.max(1000, 3600000 / config.maxNotificationsPerHour) // Respetar límite por hora
        }
      );

      // Actualizar estadísticas
      template.sentCount += results.sent;
      template.lastExecution = new Date();
      await this.updateNextExecution(template);
      await this.templateRepository.save(template);

      // Actualizar configuración global
      config.totalNotificationsSent += results.sent;
      config.totalFailures += results.failed;
      config.lastRunAt = new Date();
      await this.cronConfigRepository.save(config);

      this.logger.log(`✅ Plantilla ejecutada: ${template.title} - Enviadas: ${results.sent}, Fallidas: ${results.failed}`);

    } catch (error) {
      this.logger.error(`Error ejecutando plantilla ${template.title}: ${error.message}`);
    }
  }

  private async updateNextExecution(template: NotificationTemplate): Promise<void> {
    if (template.cronExpression) {
      template.nextExecution = this.calculateNextExecution(template.cronExpression);
      await this.templateRepository.save(template);
    }
  }

  private calculateNextExecution(cronExpression: string): Date {
    // Implementación básica para expresiones cron comunes
    const now = new Date();
    const next = new Date(now);

    // Mapeo de expresiones cron comunes
    const cronMap = {
      '0 9 * * 1': () => { // Lunes a las 9 AM
        const days = (8 - now.getDay()) % 7 || 7;
        next.setDate(now.getDate() + days);
        next.setHours(9, 0, 0, 0);
      },
      '0 9 * * *': () => { // Diario a las 9 AM
        next.setDate(now.getDate() + 1);
        next.setHours(9, 0, 0, 0);
      },
      '0 9 * * 1-5': () => { // Días laborables a las 9 AM
        next.setDate(now.getDate() + 1);
        while (next.getDay() === 0 || next.getDay() === 6) {
          next.setDate(next.getDate() + 1);
        }
        next.setHours(9, 0, 0, 0);
      },
      '0 9 1 * *': () => { // Primer día del mes a las 9 AM
        next.setMonth(now.getMonth() + 1, 1);
        next.setHours(9, 0, 0, 0);
      },
      '0 */6 * * *': () => { // Cada 6 horas
        next.setTime(now.getTime() + 6 * 60 * 60 * 1000);
      }
    };

    const handler = cronMap[cronExpression];
    if (handler) {
      handler();
    } else {
      // Fallback: próxima hora
      next.setTime(now.getTime() + 60 * 60 * 1000);
    }

    return next;
  }

  private async getAudiencePhoneNumbers(audience: NotificationAudience, chatbotId?: string): Promise<string[]> {
    try {
      let phoneNumbers: string[] = [];

      switch (audience) {
        case NotificationAudience.ALL:
          phoneNumbers = await this.getAllUserPhones(chatbotId);
          break;
        case NotificationAudience.ACTIVE_USERS:
          phoneNumbers = await this.getActiveUserPhones(chatbotId);
          break;
        case NotificationAudience.RECENT_BUYERS:
          phoneNumbers = await this.getRecentBuyerPhones(chatbotId);
          break;
        case NotificationAudience.NEW_USERS:
          phoneNumbers = await this.getNewUserPhones(chatbotId);
          break;
        case NotificationAudience.VIP_USERS:
          phoneNumbers = await this.getVipUserPhones(chatbotId);
          break;
      }

      return phoneNumbers.filter(phone => phone && phone.length > 10);
    } catch (error) {
      this.logger.error(`Error obteniendo audiencia ${audience}: ${error.message}`);
      return [];
    }
  }

  private async getAllUserPhones(chatbotId?: string): Promise<string[]> {
    const query = this.sessionRepository.createQueryBuilder('session')
      .select('session.phoneNumber');
    
    if (chatbotId) {
      query.where('session.activeChatbotId = :chatbotId', { chatbotId });
    }
    
    const sessions = await query.getMany();
    return sessions.map(s => s.phoneNumber);
  }

  private async getActiveUserPhones(chatbotId?: string): Promise<string[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const query = this.sessionRepository
      .createQueryBuilder('session')
      .select('session.phoneNumber')
      .where('session.lastActivity >= :date', { date: thirtyDaysAgo });
    
    if (chatbotId) {
      query.andWhere('session.activeChatbotId = :chatbotId', { chatbotId });
    }

    const sessions = await query.getMany();
    return sessions.map(s => s.phoneNumber);
  }

  private async getRecentBuyerPhones(chatbotId?: string): Promise<string[]> {
    // Implementar lógica para compradores recientes
    return [];
  }

  private async getNewUserPhones(chatbotId?: string): Promise<string[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const query = this.sessionRepository
      .createQueryBuilder('session')
      .select('session.phoneNumber')
      .where('session.createdAt >= :date', { date: sevenDaysAgo });
    
    if (chatbotId) {
      query.andWhere('session.activeChatbotId = :chatbotId', { chatbotId });
    }

    const sessions = await query.getMany();
    return sessions.map(s => s.phoneNumber);
  }

  private async getVipUserPhones(chatbotId?: string): Promise<string[]> {
    // Implementar lógica para usuarios VIP
    return [];
  }

  private replaceVariables(content: string, variables: Record<string, any>): string {
    let result = content;
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), String(value));
    });
    
    return result;
  }

  // ============================================================================
  // TESTING
  // ============================================================================

  async testNotification(templateId: string, phoneNumber: string): Promise<boolean> {
    try {
      const template = await this.getTemplateById(templateId);
      
      const message = this.replaceVariables(template.content, {
        nombre: 'Usuario de Prueba',
        empresa: template.chatbot?.organization?.name || 'Tu Empresa',
        fecha: new Date().toLocaleDateString('es-ES'),
        ...template.variables
      });

      await this.notificationsService.scheduleNotification(
        phoneNumber,
        `🧪 [PRUEBA] 🧪 **PLANTILLA DE PRUEBA**\n\nEste es un mensaje de prueba creado automáticamente.\n\n🤖 Bot: ${template.chatbot?.name || 'Desconocido'}  \n📅 Fecha: {${new Date().toLocaleDateString('es-ES')}}\n⏰ Hora: {${new Date().toLocaleTimeString('es-ES')}}\n\n*Sistema funcionando correctamente* ✅`,
        new Date(),
        template.chatbotId
      );

      this.logger.log(`🧪 Notificación de prueba enviada: ${template.title} - ${new Date().toISOString().split('T')[0]} -> ${phoneNumber}`);
      return true;
    } catch (error) {
      this.logger.error(`Error enviando notificación de prueba: ${error.message}`);
      return false;
    }
  }
} 