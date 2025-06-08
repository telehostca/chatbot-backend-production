import { Controller, Post, Body, Logger, Get, Put, Delete, Param } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationTemplatesService, CreateNotificationTemplateDto, UpdateNotificationTemplateDto, CronConfigDto } from './services/notification-templates.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('notifications')
export class NotificationsController {
  private readonly logger = new Logger(NotificationsController.name);

  constructor(
    private notificationsService: NotificationsService,
    private notificationTemplatesService: NotificationTemplatesService
  ) {}

  @Post('order-confirmation')
  async sendOrderConfirmation(@Body() data: { phoneNumber: string; orderDetails: any }) {
    this.logger.log(`Enviando confirmación de orden a ${data.phoneNumber}`);
    try {
      await this.notificationsService.sendOrderConfirmation(data.phoneNumber, data.orderDetails);
      return { success: true, message: 'Notificación enviada exitosamente' };
    } catch (error) {
      this.logger.error(`Error al enviar confirmación de orden: ${error.message}`);
      throw error;
    }
  }

  @Post('payment-reminder')
  async sendPaymentReminder(@Body() data: { phoneNumber: string; orderDetails: any }) {
    this.logger.log(`Enviando recordatorio de pago a ${data.phoneNumber}`);
    try {
      await this.notificationsService.sendPaymentReminder(data.phoneNumber, data.orderDetails);
      return { success: true, message: 'Recordatorio enviado exitosamente' };
    } catch (error) {
      this.logger.error(`Error al enviar recordatorio de pago: ${error.message}`);
      throw error;
    }
  }

  @Post('order-status')
  @ApiOperation({ summary: 'Enviar actualización de estado de orden' })
  @ApiResponse({ status: 200, description: 'Notificación enviada exitosamente' })
  async sendOrderStatusUpdate(@Body() data: { phoneNumber: string; orderNumber: string; status: string }) {
    try {
      await this.notificationsService.sendOrderStatusUpdate(
        data.phoneNumber,
        data.orderNumber,
        data.status
      );
      return { status: 'success' };
    } catch (error) {
      this.logger.error(`Error al enviar actualización de estado: ${error.message}`);
      throw error;
    }
  }

  @Post('abandoned-cart')
  async sendAbandonedCartReminder(@Body() data: { phoneNumber: string; cartDetails: any }) {
    this.logger.log(`Enviando recordatorio de carrito abandonado a ${data.phoneNumber}`);
    try {
      await this.notificationsService.sendAbandonedCartReminder(data.phoneNumber, data.cartDetails);
      return { success: true, message: 'Recordatorio enviado exitosamente' };
    } catch (error) {
      this.logger.error(`Error al enviar recordatorio de carrito abandonado: ${error.message}`);
      throw error;
    }
  }

  @Post('instant-send')
  @ApiOperation({ summary: 'Enviar notificación instantánea a un número específico' })
  @ApiResponse({ status: 200, description: 'Notificación enviada exitosamente' })
  async sendInstantNotification(@Body() data: { 
    phoneNumber: string; 
    title: string; 
    message: string; 
    category?: string 
  }) {
    this.logger.log(`📱 Enviando notificación instantánea a ${data.phoneNumber}: ${data.title}`);
    try {
      const success = await this.notificationsService.sendInstantMessage(
        data.phoneNumber,
        data.title,
        data.message
      );
      
      if (success) {
        // Verificar si hay configuración de WhatsApp
        const hasWhatsAppConfig = process.env.WHATSAPP_DEFAULT_INSTANCE && 
                                process.env.WHATSAPP_DEFAULT_INSTANCE.trim() !== '';
        
        if (hasWhatsAppConfig) {
          return { 
            success: true, 
            message: '✅ Notificación enviada REALMENTE a WhatsApp',
            mode: 'real'
          };
        } else {
          return { 
            success: true, 
            message: '⚠️ Modo simulación: Mensaje NO enviado (falta configurar WhatsApp)',
            mode: 'simulation',
            note: 'Para envío real, configura WHATSAPP_API_URL y WHATSAPP_DEFAULT_INSTANCE en .env'
          };
        }
      } else {
        throw new Error('Fallo en el procesamiento del mensaje');
      }
    } catch (error) {
      this.logger.error(`Error enviando notificación instantánea: ${error.message}`);
      throw error;
    }
  }

  @Get('audience-numbers')
  @ApiOperation({ summary: 'Obtener números de teléfono según tipo de audiencia' })
  @ApiResponse({ status: 200, description: 'Lista de números obtenida exitosamente' })
  async getAudienceNumbers(@Body() query: { type: string }) {
    this.logger.log(`📋 Obteniendo números para audiencia: ${query.type}`);
    try {
      // Simular números por ahora - en producción vendría de la base de datos
      const audienceNumbers = {
        'ALL': ['+584141234567', '+584157654321', '+584161111111'],
        'ACTIVE_USERS': ['+584141234567', '+584157654321'],
        'NEW_USERS': ['+584161111111'],
        'RECENT_BUYERS': ['+584141234567'],
        'VIP_USERS': ['+584161111111']
      };
      
      const phoneNumbers = audienceNumbers[query.type] || [];
      return { 
        success: true, 
        phoneNumbers,
        count: phoneNumbers.length,
        audienceType: query.type
      };
    } catch (error) {
      this.logger.error(`Error obteniendo números de audiencia: ${error.message}`);
      throw error;
    }
  }
}

// ============================================================================
// 🚀 CONTROLADOR PARA PLANTILLAS DE NOTIFICACIONES
// ============================================================================

@Controller('notification-templates')
export class NotificationTemplatesController {
  private readonly logger = new Logger(NotificationTemplatesController.name);

  constructor(private notificationTemplatesService: NotificationTemplatesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las plantillas de notificación' })
  async getAllTemplates() {
    try {
      const templates = await this.notificationTemplatesService.getAllTemplates();
      this.logger.log(`📋 Devolviendo ${templates.length} plantillas de notificación`);
      return templates;
    } catch (error) {
      this.logger.error(`Error obteniendo plantillas: ${error.message}`);
      throw error;
    }
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva plantilla de notificación' })
  async createTemplate(@Body() dto: CreateNotificationTemplateDto) {
    try {
      this.logger.log(`🆕 Creando plantilla: ${dto.title}`);
      const template = await this.notificationTemplatesService.createTemplate(dto);
      return template;
    } catch (error) {
      this.logger.error(`Error creando plantilla: ${error.message}`);
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener plantilla por ID' })
  async getTemplateById(@Param('id') id: string) {
    try {
      const template = await this.notificationTemplatesService.getTemplateById(id);
      return template;
    } catch (error) {
      this.logger.error(`Error obteniendo plantilla ${id}: ${error.message}`);
      throw error;
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar plantilla de notificación' })
  async updateTemplate(@Param('id') id: string, @Body() dto: UpdateNotificationTemplateDto) {
    try {
      this.logger.log(`📝 Actualizando plantilla: ${id}`);
      const template = await this.notificationTemplatesService.updateTemplate(id, dto);
      return template;
    } catch (error) {
      this.logger.error(`Error actualizando plantilla ${id}: ${error.message}`);
      throw error;
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar plantilla de notificación' })
  async deleteTemplate(@Param('id') id: string) {
    try {
      this.logger.log(`🗑️ Eliminando plantilla: ${id}`);
      await this.notificationTemplatesService.deleteTemplate(id);
      return { success: true, message: 'Plantilla eliminada exitosamente' };
    } catch (error) {
      this.logger.error(`Error eliminando plantilla ${id}: ${error.message}`);
      throw error;
    }
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: 'Activar/desactivar plantilla' })
  async toggleTemplate(@Param('id') id: string) {
    try {
      this.logger.log(`🔄 Cambiando estado de plantilla: ${id}`);
      const template = await this.notificationTemplatesService.toggleTemplate(id);
      return template;
    } catch (error) {
      this.logger.error(`Error cambiando estado de plantilla ${id}: ${error.message}`);
      throw error;
    }
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Enviar notificación de prueba' })
  async testTemplate(@Param('id') id: string, @Body() data: { phoneNumber: string }) {
    try {
      this.logger.log(`🧪 Enviando notificación de prueba: ${id} -> ${data.phoneNumber}`);
      const success = await this.notificationTemplatesService.testNotification(id, data.phoneNumber);
      return { success, message: success ? 'Notificación de prueba enviada' : 'Error al enviar' };
    } catch (error) {
      this.logger.error(`Error enviando prueba ${id}: ${error.message}`);
      throw error;
    }
  }

  @Get('cron-config')
  @ApiOperation({ summary: 'Obtener configuración de cron jobs' })
  async getCronConfig() {
    try {
      const config = await this.notificationTemplatesService.getCronConfig();
      return config;
    } catch (error) {
      this.logger.error(`Error obteniendo config de cron: ${error.message}`);
      throw error;
    }
  }

  @Put('cron-config')
  @ApiOperation({ summary: 'Actualizar configuración de cron jobs' })
  async updateCronConfig(@Body() dto: CronConfigDto) {
    try {
      this.logger.log(`⚙️ Actualizando configuración de cron: enabled=${dto.enabled}`);
      const config = await this.notificationTemplatesService.updateCronConfig(dto);
      return config;
    } catch (error) {
      this.logger.error(`Error actualizando config de cron: ${error.message}`);
      throw error;
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtener estadísticas de notificaciones' })
  async getStats() {
    try {
      const templates = await this.notificationTemplatesService.getAllTemplates();
      const config = await this.notificationTemplatesService.getCronConfig();
      
      const stats = {
        totalTemplates: templates.length,
        activeTemplates: templates.filter(t => t.isActive).length,
        scheduledTemplates: templates.filter(t => t.cronEnabled && t.isActive).length,
        totalSent: config.totalNotificationsSent || 0,
        totalFailures: config.totalFailures || 0,
        successRate: config.totalNotificationsSent > 0 ? 
          ((config.totalNotificationsSent - (config.totalFailures || 0)) / config.totalNotificationsSent * 100).toFixed(1) : 
          '0',
        cronEnabled: config.enabled,
        lastRun: config.lastRunAt
      };
      
      return stats;
    } catch (error) {
      this.logger.error(`Error obteniendo estadísticas: ${error.message}`);
      throw error;
    }
  }
} 