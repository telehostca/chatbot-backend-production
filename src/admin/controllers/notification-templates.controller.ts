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

  @Post(':id/test')
  @ApiOperation({ summary: 'Enviar notificación de prueba' })
  @ApiResponse({ status: 200, description: 'Notificación de prueba enviada' })
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
} 