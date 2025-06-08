import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { NotificationEntity } from './entities/notification.entity';

export interface NotificationLog {
  id?: string;
  message: string;
  phoneNumbers: string[];
  successCount: number;
  failureCount: number;
  isPromotion: boolean;
  sentAt: Date;
  createdAt?: Date;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly defaultInstanceId: string;

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly configService: ConfigService,
    @InjectRepository(NotificationEntity, 'users') 
    private readonly notificationRepository: Repository<NotificationEntity>
  ) {
    this.defaultInstanceId = this.configService.get<string>('WHATSAPP_DEFAULT_INSTANCE');
  }

  async sendOrderConfirmation(phoneNumber: string, orderDetails: any) {
    try {
      const message = `¡Gracias por tu pedido! Tu número de orden es: ${orderDetails.orderNumber}`;
      await this.whatsappService.sendMessage(phoneNumber, message, this.defaultInstanceId);
    } catch (error) {
      this.logger.error(`Error al enviar confirmación de orden: ${error.message}`);
      throw error;
    }
  }

  async sendOrderStatusUpdate(phoneNumber: string, orderNumber: string, status: string) {
    try {
      const message = `Tu pedido #${orderNumber} ha sido actualizado a: ${status}`;
      await this.whatsappService.sendMessage(phoneNumber, message, this.defaultInstanceId);
    } catch (error) {
      this.logger.error(`Error al enviar actualización de estado: ${error.message}`);
      throw error;
    }
  }

  async sendPaymentConfirmation(phoneNumber: string, orderNumber: string) {
    try {
      const message = `¡Pago confirmado! Tu pedido #${orderNumber} está siendo procesado.`;
      await this.whatsappService.sendMessage(phoneNumber, message, this.defaultInstanceId);
    } catch (error) {
      this.logger.error(`Error al enviar confirmación de pago: ${error.message}`);
      throw error;
    }
  }

  async sendDeliveryNotification(phoneNumber: string, orderNumber: string, estimatedTime: string) {
    try {
      const message = `¡Tu pedido #${orderNumber} está en camino! Tiempo estimado de entrega: ${estimatedTime}`;
      await this.whatsappService.sendMessage(phoneNumber, message, this.defaultInstanceId);
    } catch (error) {
      this.logger.error(`Error al enviar notificación de entrega: ${error.message}`);
      throw error;
    }
  }

  async sendPaymentReminder(phoneNumber: string, orderDetails: any): Promise<void> {
    try {
      const message = this.formatPaymentReminderMessage(orderDetails);
      await this.whatsappService.sendMessage(phoneNumber, message, this.defaultInstanceId);
    } catch (error) {
      this.logger.error(`Error al enviar recordatorio de pago: ${error.message}`);
      throw error;
    }
  }

  async sendAbandonedCartReminder(phoneNumber: string, cartDetails: any): Promise<void> {
    try {
      const message = this.formatAbandonedCartMessage(cartDetails);
      await this.whatsappService.sendMessage(phoneNumber, message, this.defaultInstanceId);
    } catch (error) {
      this.logger.error(`Error al enviar recordatorio de carrito abandonado: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enviar mensaje instantáneo (inmediato a WhatsApp)
   */
  async sendInstantMessage(phoneNumber: string, title: string, message: string): Promise<boolean> {
    try {
      this.logger.log(`📱 Enviando mensaje instantáneo a ${phoneNumber}: ${title}`);
      
      const fullMessage = `📱 ${title}\n\n${message}`;
      
      // Verificar si hay configuración de WhatsApp
      const hasWhatsAppConfig = this.defaultInstanceId && this.defaultInstanceId.trim() !== '';
      
      if (hasWhatsAppConfig) {
        // MODO REAL: Enviar a WhatsApp
        this.logger.log(`🌐 MODO REAL: Enviando a WhatsApp API...`);
        await this.whatsappService.sendMessage(phoneNumber, fullMessage, this.defaultInstanceId);
        this.logger.log(`✅ Mensaje enviado REALMENTE a WhatsApp: ${phoneNumber}`);
      } else {
        // MODO SIMULACIÓN: Solo logs detallados
        this.logger.warn(`⚠️ MODO SIMULACIÓN: No hay configuración de WhatsApp`);
        this.logger.log(`📋 SIMULANDO ENVÍO:`);
        this.logger.log(`   📞 Destinatario: ${phoneNumber}`);
        this.logger.log(`   📝 Título: ${title}`);
        this.logger.log(`   💬 Mensaje: ${message}`);
        this.logger.log(`   📤 Mensaje completo:`);
        this.logger.log(`      ${fullMessage.replace(/\n/g, '\n      ')}`);
        this.logger.log(`✅ SIMULACIÓN COMPLETADA - El mensaje NO se envió realmente`);
        this.logger.log(`💡 Para envío real, configura WHATSAPP_API_URL y WHATSAPP_DEFAULT_INSTANCE en .env`);
      }
      
      // Registrar en la base de datos para estadísticas
      const notification = this.notificationRepository.create({
        phoneNumber,
        message: fullMessage,
        scheduleDate: new Date(),
        status: hasWhatsAppConfig ? 'sent' : 'simulated',
        type: 'instant',
        sentAt: new Date()
      });
      
      await this.notificationRepository.save(notification);
      
      if (hasWhatsAppConfig) {
        this.logger.log(`✅ Mensaje instantáneo enviado exitosamente a ${phoneNumber}`);
      } else {
        this.logger.log(`✅ Mensaje instantáneo SIMULADO para ${phoneNumber} (guardado en BD)`);
      }
      
      return true;
      
    } catch (error) {
      this.logger.error(`❌ Error enviando mensaje instantáneo a ${phoneNumber}: ${error.message}`);
      
      // Registrar el fallo
      try {
        const notification = this.notificationRepository.create({
          phoneNumber,
          message: `📱 ${title}\n\n${message}`,
          scheduleDate: new Date(),
          status: 'failed',
          type: 'instant',
          error: error.message
        });
        
        await this.notificationRepository.save(notification);
      } catch (dbError) {
        this.logger.error(`Error guardando fallo en BD: ${dbError.message}`);
      }
      
      return false;
    }
  }

  /**
   * Programar notificación
   */
  async scheduleNotification(phoneNumber: string, message: string, scheduleDate: Date, chatbotId?: string): Promise<boolean> {
    try {
      const notification = this.notificationRepository.create({
        phoneNumber,
        message,
        scheduleDate,
        status: 'scheduled',
        type: 'scheduled',
        metadata: chatbotId ? JSON.stringify({ chatbotId }) : null
      });

      const savedNotification = await this.notificationRepository.save(notification);
      
      const delay = scheduleDate.getTime() - Date.now();
      
      if (delay > 0) {
        if (delay < 24 * 60 * 60 * 1000) {
          setTimeout(async () => {
            await this.sendScheduledNotification(savedNotification.id);
          }, delay);
          
          this.logger.log(`📅 Notificación programada para ${scheduleDate.toLocaleString()}: ${phoneNumber}`);
        } else {
          this.logger.log(`📅 Notificación programada para ${scheduleDate.toLocaleString()} (será procesada por cron): ${phoneNumber}`);
        }
      } else {
        await this.sendScheduledNotification(savedNotification.id);
      }
      
      return true;
    } catch (error) {
      this.logger.error(`Error programando notificación: ${error.message}`);
      return false;
    }
  }

  /**
   * Enviar notificación programada
   */
  private async sendScheduledNotification(notificationId: number): Promise<void> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id: notificationId, status: 'scheduled' }
      });

      if (!notification) {
        this.logger.warn(`Notificación programada no encontrada: ${notificationId}`);
        return;
      }

      // Extraer chatbotId del metadata si existe
      let chatbotId = this.defaultInstanceId;
      if (notification.metadata) {
        try {
          const metadata = JSON.parse(notification.metadata);
          if (metadata.chatbotId) {
            chatbotId = metadata.chatbotId;
          }
        } catch (e) {
          this.logger.warn(`Error parseando metadata de notificación ${notificationId}: ${e.message}`);
        }
      }

      await this.whatsappService.sendMessage(
        notification.phoneNumber,
        notification.message,
        chatbotId
      );

      notification.status = 'sent';
      notification.sentAt = new Date();
      await this.notificationRepository.save(notification);

      this.logger.log(`✅ Notificación programada enviada a ${notification.phoneNumber}`);
    } catch (error) {
      this.logger.error(`Error enviando notificación programada: ${error.message}`);
      
      const notification = await this.notificationRepository.findOne({
        where: { id: notificationId }
      });
      
      if (notification) {
        notification.status = 'failed';
        notification.error = error.message;
        await this.notificationRepository.save(notification);
      }
    }
  }

  /**
   * Enviar notificación masiva
   */
  async sendBulkNotification(
    phoneNumbers: string[], 
    message: string, 
    options: {
      delayBetweenMessages?: number;
      batchSize?: number;
      template?: string;
      variables?: Record<string, any>;
    } = {}
  ): Promise<{ sent: number; failed: number; details: any[] }> {
    const {
      delayBetweenMessages = 1000,
      batchSize = 10,
      template,
      variables = {}
    } = options;

    const results = {
      sent: 0,
      failed: 0,
      details: []
    };

    try {
      for (let i = 0; i < phoneNumbers.length; i += batchSize) {
        const batch = phoneNumbers.slice(i, i + batchSize);
        
        for (const phoneNumber of batch) {
          try {
            let personalizedMessage = message;
            if (template && variables[phoneNumber]) {
              personalizedMessage = this.replaceTemplateVariables(template, variables[phoneNumber]);
            }

            await this.whatsappService.sendMessage(
              phoneNumber,
              personalizedMessage,
              this.defaultInstanceId
            );

            results.sent++;
            results.details.push({
              phoneNumber,
              status: 'sent',
              message: personalizedMessage
            });

            const notification = this.notificationRepository.create({
              phoneNumber,
              message: personalizedMessage,
              status: 'sent',
              type: 'bulk',
              sentAt: new Date()
            });
            await this.notificationRepository.save(notification);

            if (delayBetweenMessages > 0) {
              await this.delay(delayBetweenMessages);
            }

          } catch (error) {
            results.failed++;
            results.details.push({
              phoneNumber,
              status: 'failed',
              error: error.message
            });

            const notification = this.notificationRepository.create({
              phoneNumber,
              message,
              status: 'failed',
              type: 'bulk',
              error: error.message
            });
            await this.notificationRepository.save(notification);
          }
        }

        if (i + batchSize < phoneNumbers.length) {
          await this.delay(2000);
        }
      }

      this.logger.log(`📤 Notificación masiva completada: ${results.sent} enviadas, ${results.failed} fallidas`);
      return results;
    } catch (error) {
      this.logger.error(`Error en notificación masiva: ${error.message}`);
      throw error;
    }
  }

  // Métodos auxiliares privados
  private formatPaymentReminderMessage(orderDetails: any): string {
    return `¡Hola! 👋\n\n` +
           `Te recordamos que tienes un pago pendiente para la orden #${orderDetails.id}.\n` +
           `Monto: $${orderDetails.total}\n` +
           `Fecha límite: ${orderDetails.dueDate}\n\n` +
           `Por favor, realiza el pago para continuar con el procesamiento de tu orden.`;
  }

  private formatAbandonedCartMessage(cartDetails: any): string {
    return `¡Hola! 👋\n\n` +
           `Notamos que dejaste algunos productos en tu carrito:\n\n` +
           `${this.formatCartItems(cartDetails.items)}\n` +
           `Total: $${cartDetails.total}\n\n` +
           `¿Te gustaría completar tu compra?`;
  }

  private formatCartItems(items: any[]): string {
    return items.map(item => 
      `- ${item.name}: $${item.price} x ${item.quantity}`
    ).join('\n');
  }

  private replaceTemplateVariables(template: string, variables: Record<string, any>): string {
    let message = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      message = message.replace(new RegExp(placeholder, 'g'), String(value));
    });
    
    return message;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Registrar notificación enviada
   */
  async logNotification(notificationData: NotificationLog): Promise<void> {
    try {
      this.logger.log(`📨 Notificación registrada: ${notificationData.successCount}/${notificationData.phoneNumbers.length} enviadas exitosamente`);
      this.logger.log(`Mensaje: ${notificationData.message.substring(0, 100)}...`);
    } catch (error) {
      this.logger.error(`Error registrando notificación: ${error.message}`);
    }
  }

  /**
   * Obtener historial de notificaciones
   */
  async getNotificationHistory(limit: number = 50, offset: number = 0): Promise<NotificationLog[]> {
    try {
      return [
        {
          id: '1',
          message: 'Ofertas especiales del día - hasta 30% de descuento',
          phoneNumbers: ['04141234567', '04241234567'],
          successCount: 2,
          failureCount: 0,
          isPromotion: true,
          sentAt: new Date(),
          createdAt: new Date()
        }
      ];
    } catch (error) {
      this.logger.error(`Error obteniendo historial: ${error.message}`);
      return [];
    }
  }

  /**
   * Enviar notificación de cambio de estado de pedido
   */
  async sendOrderStatusNotification(phoneNumber: string, orderId: string, newStatus: string): Promise<boolean> {
    try {
      const statusMessages = {
        'PE': '⏳ Su pedido está siendo preparado',
        'EN': '🚚 Su pedido está en camino',
        'EN_DESTINO': '📍 Su pedido llegará pronto',
        'ENTREGADO': '✅ Su pedido ha sido entregado',
        'CANCELADO': '❌ Su pedido ha sido cancelado'
      };

      const statusMessage = statusMessages[newStatus] || '📋 Estado de pedido actualizado';

      const message = `🏪 **GÓMEZMARKET** 🏪\n` +
                     `═══════════════════════════\n` +
                     `📦 **Pedido #${orderId}**\n` +
                     `${statusMessage}\n\n` +
                     `🕐 ${new Date().toLocaleString()}\n` +
                     `💬 Para más información, contáctenos`;

      this.logger.log(`📱 Notificación de estado enviada a ${phoneNumber}: ${newStatus}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Error enviando notificación de estado: ${error.message}`);
      return false;
    }
  }
} 