import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { NotificationTemplatesService, CreateNotificationTemplateDto, UpdateNotificationTemplateDto, CronConfigDto } from '../../notifications/services/notification-templates.service';

@ApiTags('admin-notification-templates')
@Controller('admin/multi-tenant/notifications')
export class NotificationTemplatesController {
  private readonly logger = new Logger(NotificationTemplatesController.name);

  constructor(
    private readonly notificationTemplatesService: NotificationTemplatesService
  ) {}

  // ============================================================================
  // GESTIÓN DE PLANTILLAS
  // ============================================================================

  @Get()
  @ApiOperation({ summary: 'Obtener todas las plantillas de notificaciones' })
  @ApiResponse({ status: 200, description: 'Lista de plantillas obtenida exitosamente' })
  async getAllTemplates() {
    try {
      const templates = await this.notificationTemplatesService.getAllTemplates();
      
      return {
        success: true,
        data: templates,
        total: templates.length
      };
    } catch (error) {
      this.logger.error(`Error obteniendo plantillas: ${error.message}`);
      throw new HttpException(
        { success: false, error: 'Error obteniendo plantillas' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener plantilla por ID' })
  @ApiResponse({ status: 200, description: 'Plantilla obtenida exitosamente' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async getTemplateById(@Param('id') id: string) {
    try {
      const template = await this.notificationTemplatesService.getTemplateById(id);
      
      return {
        success: true,
        data: template
      };
    } catch (error) {
      this.logger.error(`Error obteniendo plantilla ${id}: ${error.message}`);
      
      if (error.message.includes('no encontrada')) {
        throw new HttpException(
          { success: false, error: 'Plantilla no encontrada' },
          HttpStatus.NOT_FOUND
        );
      }
      
      throw new HttpException(
        { success: false, error: 'Error obteniendo plantilla' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post()
  @ApiOperation({ summary: 'Crear nueva plantilla de notificación' })
  @ApiResponse({ status: 201, description: 'Plantilla creada exitosamente' })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  async createTemplate(@Body() dto: CreateNotificationTemplateDto) {
    try {
      // Validar datos básicos
      if (!dto.title || !dto.content || !dto.category) {
        throw new HttpException(
          { success: false, error: 'Título, contenido y categoría son requeridos' },
          HttpStatus.BAD_REQUEST
        );
      }

      // Validar cron expression si está habilitado
      if (dto.cronEnabled && !dto.cronExpression) {
        throw new HttpException(
          { success: false, error: 'Expresión cron es requerida cuando el cron está habilitado' },
          HttpStatus.BAD_REQUEST
        );
      }

      const template = await this.notificationTemplatesService.createTemplate(dto);
      
      this.logger.log(`✅ Plantilla creada: ${template.title} (${template.id})`);
      
      return {
        success: true,
        data: template,
        message: 'Plantilla creada exitosamente'
      };
    } catch (error) {
      this.logger.error(`Error creando plantilla: ${error.message}`);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        { success: false, error: 'Error creando plantilla' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar plantilla de notificación' })
  @ApiResponse({ status: 200, description: 'Plantilla actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async updateTemplate(@Param('id') id: string, @Body() dto: UpdateNotificationTemplateDto) {
    try {
      // Validar cron expression si está habilitado
      if (dto.cronEnabled && !dto.cronExpression) {
        throw new HttpException(
          { success: false, error: 'Expresión cron es requerida cuando el cron está habilitado' },
          HttpStatus.BAD_REQUEST
        );
      }

      const template = await this.notificationTemplatesService.updateTemplate(id, dto);
      
      this.logger.log(`📝 Plantilla actualizada: ${template.title} (${id})`);
      
      return {
        success: true,
        data: template,
        message: 'Plantilla actualizada exitosamente'
      };
    } catch (error) {
      this.logger.error(`Error actualizando plantilla ${id}: ${error.message}`);
      
      if (error.message.includes('no encontrada')) {
        throw new HttpException(
          { success: false, error: 'Plantilla no encontrada' },
          HttpStatus.NOT_FOUND
        );
      }
      
      throw new HttpException(
        { success: false, error: 'Error actualizando plantilla' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar plantilla de notificación' })
  @ApiResponse({ status: 200, description: 'Plantilla eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async deleteTemplate(@Param('id') id: string) {
    try {
      await this.notificationTemplatesService.deleteTemplate(id);
      
      this.logger.log(`🗑️ Plantilla eliminada: ${id}`);
      
      return {
        success: true,
        message: 'Plantilla eliminada exitosamente'
      };
    } catch (error) {
      this.logger.error(`Error eliminando plantilla ${id}: ${error.message}`);
      
      if (error.message.includes('no encontrada')) {
        throw new HttpException(
          { success: false, error: 'Plantilla no encontrada' },
          HttpStatus.NOT_FOUND
        );
      }
      
      throw new HttpException(
        { success: false, error: 'Error eliminando plantilla' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(':id/toggle')
  @ApiOperation({ summary: 'Activar/Desactivar plantilla' })
  @ApiResponse({ status: 200, description: 'Estado de plantilla cambiado exitosamente' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async toggleTemplate(@Param('id') id: string) {
    try {
      const template = await this.notificationTemplatesService.toggleTemplate(id);
      
      this.logger.log(`🔄 Plantilla ${template.isActive ? 'activada' : 'desactivada'}: ${template.title}`);
      
      return {
        success: true,
        data: template,
        message: `Plantilla ${template.isActive ? 'activada' : 'desactivada'} exitosamente`
      };
    } catch (error) {
      this.logger.error(`Error cambiando estado de plantilla ${id}: ${error.message}`);
      
      if (error.message.includes('no encontrada')) {
        throw new HttpException(
          { success: false, error: 'Plantilla no encontrada' },
          HttpStatus.NOT_FOUND
        );
      }
      
      throw new HttpException(
        { success: false, error: 'Error cambiando estado de plantilla' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicar plantilla de notificación' })
  @ApiResponse({ status: 201, description: 'Plantilla duplicada exitosamente' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async duplicateTemplate(@Param('id') id: string) {
    try {
      const duplicatedTemplate = await this.notificationTemplatesService.duplicateTemplate(id);
      
      this.logger.log(`📋 Plantilla duplicada exitosamente: ${duplicatedTemplate.title} (${duplicatedTemplate.id})`);
      
      return {
        success: true,
        data: duplicatedTemplate,
        message: 'Plantilla duplicada exitosamente'
      };
    } catch (error) {
      this.logger.error(`Error duplicando plantilla ${id}: ${error.message}`);
      
      if (error.message.includes('no encontrada')) {
        throw new HttpException(
          { success: false, error: 'Plantilla no encontrada' },
          HttpStatus.NOT_FOUND
        );
      }
      
      throw new HttpException(
        { success: false, error: 'Error duplicando plantilla' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('fix-all-variables')
  @ApiOperation({ summary: 'Corregir variables en todas las plantillas existentes' })
  @ApiResponse({ status: 200, description: 'Variables corregidas exitosamente' })
  async fixAllVariables() {
    try {
      const templates = await this.notificationTemplatesService.getAllTemplates();
      let fixed = 0;
      const results = [];

      for (const template of templates) {
        let needsUpdate = false;
        let newContent = template.content;
        let newVariables = null;

        // Convertir {{variable}} a {variable}
        newContent = newContent.replace(/\{\{(\w+)\}\}/g, '{$1}');

        // Limpiar variables que tienen valores tipo "string" 
        if (template.variables && typeof template.variables === 'object') {
          const hasStringValues = Object.values(template.variables).some(val => val === 'string' || val === 'number');
          if (hasStringValues) {
            newVariables = null; // Limpiar variables incorrectas
            needsUpdate = true;
          }
        }

        // Si el contenido cambió
        if (newContent !== template.content) {
          needsUpdate = true;
        }

        if (needsUpdate) {
          await this.notificationTemplatesService.updateTemplate(template.id, {
            content: newContent,
            variables: newVariables
          });
          
          fixed++;
          results.push({
            id: template.id,
            title: template.title,
            changes: {
              contentChanged: newContent !== template.content,
              variablesCleared: newVariables === null && template.variables !== null
            }
          });
          
          this.logger.log(`🔧 Plantilla corregida: ${template.title}`);
        }
      }

      return {
        success: true,
        data: {
          totalTemplates: templates.length,
          templatesFixed: fixed,
          details: results
        },
        message: `Se corrigieron ${fixed} plantillas de ${templates.length} totales`
      };
    } catch (error) {
      this.logger.error(`Error corrigiendo plantillas: ${error.message}`);
      throw new HttpException(
        { success: false, error: 'Error corrigiendo plantillas' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(':id/test-variables')
  @ApiOperation({ summary: 'Probar reemplazo de variables sin enviar notificación' })
  @ApiResponse({ status: 200, description: 'Variables probadas exitosamente' })
  async testVariables(@Param('id') id: string, @Body() body: { phoneNumber: string; chatbotId?: string }) {
    try {
      const template = await this.notificationTemplatesService.getTemplateById(id);
      
      // Obtener variables dinámicas para el usuario
      const userVariables = await this.notificationTemplatesService.getUserDynamicVariables(
        body.phoneNumber, 
        body.chatbotId || template.chatbotId
      );
      
      // Combinar todas las variables
      const allVariables = {
        ...template.variables || {},
        ...userVariables,
        fecha: new Date().toLocaleDateString('es-ES'),
        hora: new Date().toLocaleTimeString('es-ES'),
        dia: new Date().toLocaleDateString('es-ES', { weekday: 'long' }),
        mes: new Date().toLocaleDateString('es-ES', { month: 'long' }),
        año: new Date().getFullYear().toString()
      };

      // Aplicar variables al contenido
      const processedContent = this.notificationTemplatesService.replaceVariables(
        template.content, 
        allVariables
      );

      this.logger.log(`🧪 Variables probadas para ${body.phoneNumber}`);
      
      return {
        success: true,
        data: {
          originalContent: template.content,
          processedContent,
          variables: allVariables,
          variablesApplied: Object.keys(allVariables).length
        },
        message: 'Variables procesadas exitosamente'
      };
    } catch (error) {
      this.logger.error(`Error probando variables: ${error.message}`);
      throw new HttpException(
        { success: false, error: 'Error probando variables' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'Enviar notificación de prueba' })
  @ApiResponse({ status: 200, description: 'Notificación de prueba enviada exitosamente' })
  @ApiResponse({ status: 404, description: 'Plantilla no encontrada' })
  async testNotification(@Param('id') id: string, @Body() body: { phoneNumber: string }) {
    try {
      if (!body.phoneNumber) {
        throw new HttpException(
          { success: false, error: 'Número de teléfono es requerido' },
          HttpStatus.BAD_REQUEST
        );
      }

      const result = await this.notificationTemplatesService.testNotification(id, body.phoneNumber);
      
      return {
        success: result,
        message: result ? 'Notificación de prueba enviada exitosamente' : 'Error enviando notificación de prueba'
      };
    } catch (error) {
      this.logger.error(`Error enviando notificación de prueba: ${error.message}`);
      throw new HttpException(
        { success: false, error: 'Error enviando notificación de prueba' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // ============================================================================
  // CONFIGURACIÓN DE CRON
  // ============================================================================

  @Get('cron/config')
  @ApiOperation({ summary: 'Obtener configuración de cron jobs' })
  @ApiResponse({ status: 200, description: 'Configuración obtenida exitosamente' })
  async getCronConfig() {
    try {
      const config = await this.notificationTemplatesService.getCronConfig();
      
      return {
        success: true,
        data: config
      };
    } catch (error) {
      this.logger.error(`Error obteniendo configuración de cron: ${error.message}`);
      throw new HttpException(
        { success: false, error: 'Error obteniendo configuración de cron' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('cron/config')
  @ApiOperation({ summary: 'Actualizar configuración de cron jobs' })
  @ApiResponse({ status: 200, description: 'Configuración actualizada exitosamente' })
  async updateCronConfig(@Body() dto: CronConfigDto) {
    try {
      const config = await this.notificationTemplatesService.updateCronConfig(dto);
      
      this.logger.log(`⚙️ Configuración de cron actualizada: habilitado=${config.enabled}`);
      
      return {
        success: true,
        data: config,
        message: 'Configuración de cron actualizada exitosamente'
      };
    } catch (error) {
      this.logger.error(`Error actualizando configuración de cron: ${error.message}`);
      throw new HttpException(
        { success: false, error: 'Error actualizando configuración de cron' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('cron/status')
  @ApiOperation({ summary: 'Verificar estado simple del cron' })
  @ApiResponse({ status: 200, description: 'Estado del cron obtenido exitosamente' })
  async getCronStatus() {
    try {
      const config = await this.notificationTemplatesService.getCronConfig();
      
      return {
        success: true,
        data: {
          enabled: config.enabled,
          status: config.enabled ? 'ACTIVO' : 'INACTIVO',
          maxNotificationsPerHour: config.maxNotificationsPerHour,
          timezone: config.timezone,
          lastRunAt: config.lastRunAt,
          totalNotificationsSent: config.totalNotificationsSent,
          allowedTimeRanges: config.allowedTimeRanges,
          blockedDays: config.blockedDays ? JSON.parse(config.blockedDays) : []
        }
      };
    } catch (error) {
      this.logger.error(`Error obteniendo estado del cron: ${error.message}`);
      return {
        success: false,
        error: 'Error obteniendo estado del cron',
        status: 'ERROR'
      };
    }
  }

  // ============================================================================
  // ESTADÍSTICAS
  // ============================================================================

  @Get('stats/summary')
  @ApiOperation({ summary: 'Obtener resumen de estadísticas de notificaciones' })
  @ApiResponse({ status: 200, description: 'Estadísticas obtenidas exitosamente' })
  async getNotificationStats() {
    try {
      const templates = await this.notificationTemplatesService.getAllTemplates();
      const cronConfig = await this.notificationTemplatesService.getCronConfig();
      
      const stats = {
        totalTemplates: templates.length,
        activeTemplates: templates.filter(t => t.isActive).length,
        scheduledTemplates: templates.filter(t => t.cronEnabled && t.isActive).length,
        totalSent: templates.reduce((sum, t) => sum + t.sentCount, 0),
        cronEnabled: cronConfig.enabled,
        lastCronRun: cronConfig.lastRunAt,
        totalCronSent: cronConfig.totalNotificationsSent,
        totalCronFailures: cronConfig.totalFailures,
        categoriesBreakdown: {
          discount: templates.filter(t => t.category === 'discount').length,
          promotion: templates.filter(t => t.category === 'promotion').length,
          welcome: templates.filter(t => t.category === 'welcome').length,
          reminder: templates.filter(t => t.category === 'reminder').length,
          followup: templates.filter(t => t.category === 'followup').length
        }
      };
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      this.logger.error(`Error obteniendo estadísticas: ${error.message}`);
      throw new HttpException(
        { success: false, error: 'Error obteniendo estadísticas' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('available-variables')
  @ApiOperation({ summary: 'Obtener todas las variables disponibles para plantillas' })
  @ApiResponse({ status: 200, description: 'Variables disponibles obtenidas exitosamente' })
  async getAvailableVariables() {
    try {
      const variables = {
        // Variables de usuario (dinámicas por usuario)
        userVariables: {
          nombre: {
            description: "Nombre del usuario (prioriza pushname de WhatsApp, luego clientName, luego genera desde número)",
            example: "Juan Pérez",
            source: "session.clientPushname || session.clientName || 'Cliente XXXX'"
          },
          empresa: {
            description: "Nombre de la empresa/organización del chatbot",
            example: "Mi Empresa S.A.",
            source: "chatbot.organization.name || chatbot.name"
          },
          telefono: {
            description: "Número de teléfono del usuario",
            example: "584241234567",
            source: "session.phoneNumber"
          },
          chatbot: {
            description: "Nombre del chatbot activo",
            example: "Chatbot Principal",
            source: "chatbot.name"
          },
          cliente_id: {
            description: "ID del cliente en base de datos externa (si está autenticado)",
            example: "C12345",
            source: "session.clientId"
          },
          identificacion: {
            description: "Número de identificación del cliente (cédula/RIF)",
            example: "V-12345678",
            source: "session.identificationNumber"
          },
          es_cliente_nuevo: {
            description: "Indica si es un cliente nuevo",
            example: "Sí / No",
            source: "session.isNewClient"
          },
          total_mensajes: {
            description: "Total de mensajes en la sesión del usuario",
            example: "15",
            source: "session.messageCount"
          },
          ultima_actividad: {
            description: "Fecha de última actividad del usuario",
            example: "8/6/2025",
            source: "session.lastActivity"
          }
        },
        
        // Variables temporales (se generan al momento del envío)
        timeVariables: {
          fecha: {
            description: "Fecha actual en formato español",
            example: "9/6/2025",
            source: "new Date().toLocaleDateString('es-ES')"
          },
          hora: {
            description: "Hora actual en formato español",
            example: "14:30:45",
            source: "new Date().toLocaleTimeString('es-ES')"
          },
          dia: {
            description: "Día de la semana en español",
            example: "lunes",
            source: "new Date().toLocaleDateString('es-ES', { weekday: 'long' })"
          },
          mes: {
            description: "Mes actual en español",
            example: "junio",
            source: "new Date().toLocaleDateString('es-ES', { month: 'long' })"
          },
          año: {
            description: "Año actual",
            example: "2025",
            source: "new Date().getFullYear().toString()"
          }
        }
      };

      const usage = {
        format: "Usar variables con llaves simples: {nombre}, {empresa}, {fecha}, etc.",
        examples: [
          "¡Hola {nombre}! Te damos la bienvenida a {empresa}.",
          "Tu última actividad fue el {ultima_actividad}.",
          "Hoy es {dia} {fecha} y son las {hora}.",
          "Como cliente de {empresa}, tienes beneficios especiales.",
          "Has enviado {total_mensajes} mensajes en total."
        ],
        notes: [
          "Las variables de usuario se obtienen automáticamente de la sesión del usuario",
          "Las variables temporales se generan al momento del envío",
          "Si no se encuentra un valor, se usa un fallback apropiado",
          "El sistema soporta tanto {variable} como {{variable}} (se convierte automáticamente)"
        ]
      };

      return {
        success: true,
        data: {
          variables,
          usage,
          totalVariables: Object.keys(variables.userVariables).length + Object.keys(variables.timeVariables).length
        },
        message: 'Variables disponibles obtenidas exitosamente'
      };
    } catch (error) {
      this.logger.error(`Error obteniendo variables disponibles: ${error.message}`);
      throw new HttpException(
        { success: false, error: 'Error obteniendo variables disponibles' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 