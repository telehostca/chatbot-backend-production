import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpStatus } from '@nestjs/common';
import { MultiTenantService, CreateOrganizationDto, CreateChatbotDto } from '../services/multi-tenant.service';
import { ApiOperation } from '@nestjs/swagger';

@Controller('admin/multi-tenant')
export class MultiTenantController {
  constructor(private readonly multiTenantService: MultiTenantService) {}

  // ===== ESTADÍSTICAS Y DASHBOARD =====

  /**
   * Obtener estadísticas consolidadas del dashboard
   */
  @Get('stats')
  async getConsolidatedStats() {
    try {
      const organizations = await this.multiTenantService.getOrganizations();
      
      const stats = {
        totalOrganizations: organizations.length,
        totalChatbots: organizations.reduce((sum, org) => sum + org.chatbots.length, 0),
        activeChatbots: organizations.reduce((sum, org) => 
          sum + org.chatbots.filter(cb => cb.isActive).length, 0
        ),
        organizationsByPlan: {
          trial: organizations.filter(org => org.planType === 'trial').length,
          basic: organizations.filter(org => org.planType === 'basic').length,
          pro: organizations.filter(org => org.planType === 'pro').length,
          enterprise: organizations.filter(org => org.planType === 'enterprise').length,
        }
      };

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: {
          totalOrganizations: 0,
          totalChatbots: 0,
          activeChatbots: 0,
          organizationsByPlan: {
            trial: 0, basic: 0, pro: 0, enterprise: 0
          }
        }
      };
    }
  }

  // ===== ORGANIZACIONES =====

  /**
   * Obtener todas las organizaciones
   */
  @Get('organizations')
  async getOrganizations() {
    try {
      const organizations = await this.multiTenantService.getOrganizations();
      
      return {
        success: true,
        data: organizations,
        count: organizations.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Crear nueva organización
   */
  @Post('organizations')
  async createOrganization(@Body() dto: CreateOrganizationDto) {
    try {
      const organization = await this.multiTenantService.createOrganization(dto);
      return {
        success: true,
        data: organization,
        message: 'Organización creada exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: HttpStatus.BAD_REQUEST
      };
    }
  }

  /**
   * Obtener organización por ID
   */
  @Get('organizations/:id')
  async getOrganizationById(@Param('id') id: string) {
    try {
      const organization = await this.multiTenantService.getOrganizationById(id);
      return {
        success: true,
        data: organization
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: HttpStatus.NOT_FOUND
      };
    }
  }

  /**
   * Actualizar organización
   */
  @Put('organizations/:id')
  async updateOrganization(@Param('id') id: string, @Body() updates: Partial<CreateOrganizationDto>) {
    try {
      const organization = await this.multiTenantService.updateOrganization(id, updates);
      return {
        success: true,
        data: organization,
        message: 'Organización actualizada exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: HttpStatus.BAD_REQUEST
      };
    }
  }

  /**
   * Eliminar organización
   */
  @Delete('organizations/:id')
  async deleteOrganization(@Param('id') id: string) {
    try {
      await this.multiTenantService.deleteOrganization(id);
      return {
        success: true,
        message: 'Organización eliminada exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: HttpStatus.BAD_REQUEST
      };
    }
  }

  // ===== CHATBOTS =====

  /**
   * Obtener todos los chatbots con información de organización
   */
  @Get('chatbots')
  async getAllChatbots() {
    try {
      const chatbots = await this.multiTenantService.getAllChatbots();
      
      return {
        success: true,
        data: chatbots,
        count: chatbots.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Crear nuevo chatbot
   */
  @Post('chatbots')
  @ApiOperation({
    summary: 'Crear un nuevo chatbot',
    description: 
      'Crea un nuevo chatbot con la configuración especificada.\n\n' +
      '## Opciones de Configuración IA vs Intenciones\n\n' +
      'Puedes configurar si el chatbot prioriza IA o intenciones con estas opciones:\n\n' +
      '- aiFirst: true/false - Prioriza IA sobre intenciones\n' +
      '- forceAIProcessing: true/false - Fuerza procesamiento con IA\n' +
      '- intentProcessingMode: ai_only|intents_first|hybrid - Modo de procesamiento\n' +
      '- disableIntentMatching: true/false - Deshabilita matching de intenciones\n' +
      '- disablePatternMatching: true/false - Deshabilita patrones fijos\n\n' +
      '## Configuración RAG\n\n' +
      '- useRAG: true/false - Habilita RAG\n' +
      '- ragEnabled: true/false - Activa RAG\n' +
      '- autoRAG: true/false - Activa RAG automático\n\n' +
      '## Ejemplo de configuración prioridad IA\n\n' +
      '```json\n' +
      '{\n' +
      '  "name": "Mi Chatbot IA",\n' +
      '  "chatbotConfig": {\n' +
      '    "aiFirst": true,\n' +
      '    "forceAIProcessing": true,\n' +
      '    "intentProcessingMode": "ai_only",\n' +
      '    "chatbotType": "rag",\n' +
      '    "processor": "rag",\n' +
      '    "useRAG": true,\n' +
      '    "ragEnabled": true,\n' +
      '    "autoRAG": true\n' +
      '  }\n' +
      '}\n' +
      '```\n\n' +
      '## Ejemplo de configuración con intenciones\n\n' +
      '```json\n' +
      '{\n' +
      '  "name": "Mi Chatbot con Intenciones",\n' +
      '  "chatbotConfig": {\n' +
      '    "aiFirst": false,\n' +
      '    "intentProcessingMode": "intents_first",\n' +
      '    "intents": [\n' +
      '      {\n' +
      '        "name": "saludo",\n' +
      '        "keywords": ["hola", "buenos días"],\n' +
      '        "response": "¡Hola! ¿En qué puedo ayudarte?"\n' +
      '      }\n' +
      '    ]\n' +
      '  }\n' +
      '}\n' +
      '```'
  })
  async createChatbot(@Body() dto: CreateChatbotDto) {
    console.log('DTO recibido en createChatbot:', JSON.stringify(dto));
    const chatbot = await this.multiTenantService.createChatbot(dto);
    return {
      success: true,
      data: chatbot,
      message: 'Chatbot creado exitosamente'
    };
  }

  /**
   * Obtener chatbots de una organización
   */
  @Get('organizations/:orgId/chatbots')
  async getChatbotsByOrganization(@Param('orgId') orgId: string) {
    try {
      const chatbots = await this.multiTenantService.getChatbotsByOrganization(orgId);
      
      return {
        success: true,
        data: chatbots,
        count: chatbots.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Obtener chatbot específico por ID
   */
  @Get('chatbots/:id')
  async getChatbotById(@Param('id') id: string) {
    try {
      const chatbot = await this.multiTenantService.getChatbotById(id);

      return {
        success: true,
        data: chatbot
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  /**
   * Obtener chatbot por slug
   */
  @Get('chatbots/slug/:slug')
  async getChatbotBySlug(@Param('slug') slug: string) {
    try {
      const chatbot = await this.multiTenantService.getChatbotBySlug(slug);
      
      // No retornar información sensible como API keys
      const safeData = {
        ...chatbot,
        aiConfig: {
          ...chatbot.aiConfig,
          apiKey: '****'
        },
        whatsappConfig: {
          ...chatbot.whatsappConfig,
          apiKey: '****'
        },
        externalDbConfig: chatbot.externalDbConfig?.enabled ? {
          ...chatbot.externalDbConfig,
          password: '****'
        } : chatbot.externalDbConfig
      };

      return {
        success: true,
        data: safeData
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: HttpStatus.NOT_FOUND
      };
    }
  }

  /**
   * Actualizar configuración de chatbot
   */
  @Put('chatbots/:id')
  async updateChatbot(@Param('id') id: string, @Body() updates: any) {
    try {
      console.log('\n🔧 *** DEBUG UPDATE CHATBOT ***');
      console.log('🔧 ID:', id);
      console.log('🔧 Updates recibidos:', JSON.stringify(updates, null, 2));
      
      // **DEBUG ESPECÍFICO PARA WHISPER**
      if (updates.aiConfig) {
        console.log('🎵 *** DEBUG WHISPER CONFIG ***');
        console.log('🎵 aiConfig recibido:', JSON.stringify(updates.aiConfig, null, 2));
        console.log('🎵 whisperApiKey presente:', !!updates.aiConfig.whisperApiKey);
        console.log('🎵 whisperUrl presente:', !!updates.aiConfig.whisperUrl);
        if (updates.aiConfig.whisperApiKey) {
          console.log('🎵 whisperApiKey:', updates.aiConfig.whisperApiKey.substring(0, 15) + '...');
        }
      }
      
      const updateData: any = {};

      // Validar que el chatbot existe
      const existingChatbot = await this.multiTenantService.getChatbotById(id);
      if (!existingChatbot) {
        return {
          success: false,
          error: 'Chatbot no encontrado',
          statusCode: HttpStatus.NOT_FOUND
        };
      }

      // Información básica
      if (updates.name) updateData.name = updates.name.trim();
      if (updates.slug) updateData.slug = updates.slug.trim();
      if (updates.description !== undefined) updateData.description = updates.description;

      // Configuración de IA
      if (updates.aiConfig) {
        updateData.aiConfig = {
          provider: updates.aiConfig.provider || 'openai',
          apiKey: updates.aiConfig.apiKey || '',
          model: updates.aiConfig.model || 'gpt-3.5-turbo',
          temperature: parseFloat(updates.aiConfig.temperature) || 0.7,
          ...updates.aiConfig
        };
        console.log('🤖 Configuración IA procesada:', updateData.aiConfig);
      }

      // Configuración de WhatsApp
      if (updates.whatsappConfig) {
        updateData.whatsappConfig = {
          provider: updates.whatsappConfig.provider || 'evolution-api',
          instanceName: updates.whatsappConfig.instanceName || '',
          apiUrl: updates.whatsappConfig.apiUrl || '',
          apiKey: updates.whatsappConfig.apiKey || '',
          ...updates.whatsappConfig
        };
        console.log('📱 Configuración WhatsApp procesada:', updateData.whatsappConfig);
      }

      // Configuración de base de datos externa
      if (updates.externalDbConfig) {
        updateData.externalDbConfig = {
          enabled: updates.externalDbConfig.enabled || false,
          type: updates.externalDbConfig.type || 'postgres',
          host: updates.externalDbConfig.host || '',
          port: parseInt(updates.externalDbConfig.port) || 5432,
          username: updates.externalDbConfig.username || '',
          password: updates.externalDbConfig.password || '',
          database: updates.externalDbConfig.database || '',
          ssl: updates.externalDbConfig.ssl || false,
          ...updates.externalDbConfig
        };
        console.log('🗄️ Configuración BD procesada:', updateData.externalDbConfig);
      }

      // Configuración del chatbot
      if (updates.chatbotConfig) {
        updateData.chatbotConfig = {
          language: updates.chatbotConfig.language || 'es',
          personality: updates.chatbotConfig.personality || 'friendly',
          responseStyle: updates.chatbotConfig.responseStyle || 'casual',
          useEmojis: updates.chatbotConfig.useEmojis !== undefined ? updates.chatbotConfig.useEmojis : true,
          responseTimeMs: parseInt(updates.chatbotConfig.responseTimeMs) || 2000,
          maxCartItems: parseInt(updates.chatbotConfig.maxCartItems) || 50,
          sessionTimeoutHours: parseInt(updates.chatbotConfig.sessionTimeoutHours) || 2,
          enableSentimentAnalysis: updates.chatbotConfig.enableSentimentAnalysis !== undefined ? updates.chatbotConfig.enableSentimentAnalysis : true,
          enableSpellCorrection: updates.chatbotConfig.enableSpellCorrection !== undefined ? updates.chatbotConfig.enableSpellCorrection : true,
          ...updates.chatbotConfig
        };
        console.log('⚙️ Configuración Chatbot procesada:', updateData.chatbotConfig);
      }

      // Configuración de notificaciones
      if (updates.notificationConfig) {
        updateData.notificationConfig = {
          cartReminders: updates.notificationConfig.cartReminders !== undefined ? updates.notificationConfig.cartReminders : true,
          specialOffers: updates.notificationConfig.specialOffers !== undefined ? updates.notificationConfig.specialOffers : true,
          statusUpdates: updates.notificationConfig.statusUpdates !== undefined ? updates.notificationConfig.statusUpdates : true,
          reminderIntervalHours: parseInt(updates.notificationConfig.reminderIntervalHours) || 24,
          maxReminders: parseInt(updates.notificationConfig.maxReminders) || 3,
          ...updates.notificationConfig
        };
        console.log('🔔 Configuración Notificaciones procesada:', updateData.notificationConfig);
      }

      // Estado y activación
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
      if (updates.status) updateData.status = updates.status;

      const updatedChatbot = await this.multiTenantService.updateChatbot(id, updateData);
      
      return {
        success: true,
        data: updatedChatbot,
        message: 'Chatbot actualizado exitosamente'
      };
    } catch (error) {
      console.error('❌ Error actualizando chatbot:', error);
      return {
        success: false,
        error: error.message,
        statusCode: HttpStatus.BAD_REQUEST
      };
    }
  }

  /**
   * Eliminar chatbot
   */
  @Delete('chatbots/:id')
  async deleteChatbot(@Param('id') id: string) {
    try {
      await this.multiTenantService.deleteChatbot(id);
      return {
        success: true,
        message: 'Chatbot eliminado exitosamente'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: HttpStatus.BAD_REQUEST
      };
    }
  }

  /**
   * Activar/Desactivar chatbot
   */
  @Put('chatbots/:id/toggle')
  async toggleChatbotStatus(@Param('id') id: string) {
    try {
      const chatbot = await this.multiTenantService.toggleChatbotStatus(id);
      return {
        success: true,
        data: chatbot,
        message: `Chatbot ${chatbot.isActive ? 'activado' : 'desactivado'} exitosamente`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: HttpStatus.BAD_REQUEST
      };
    }
  }

  /**
   * Obtener configuración por instancia de WhatsApp (para webhooks)
   */
  @Get('chatbots/instance/:instanceName')
  async getChatbotByInstance(@Param('instanceName') instanceName: string) {
    try {
      const chatbot = await this.multiTenantService.getChatbotConfigByInstance(instanceName);
      
      if (!chatbot) {
        return {
          success: false,
          error: 'Chatbot no encontrado para esta instancia',
          statusCode: HttpStatus.NOT_FOUND
        };
      }

      return {
        success: true,
        data: {
          id: chatbot.id,
          name: chatbot.name,
          slug: chatbot.slug,
          isActive: chatbot.isActive,
          chatbotConfig: chatbot.chatbotConfig,
          notificationConfig: chatbot.notificationConfig
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR
      };
    }
  }

  // ===== DATOS INICIALES PARA EL DASHBOARD =====

  /**
   * Endpoint centralizado para cargar todos los datos iniciales del dashboard
   */
  @Get('dashboard-data')
  async getDashboardData() {
    try {
      const organizations = await this.multiTenantService.getOrganizations();
      const chatbots = await this.multiTenantService.getAllChatbots();
      
      const stats = {
        totalOrganizations: organizations.length,
        totalChatbots: chatbots.length,
        activeChatbots: chatbots.filter(cb => cb.isActive).length,
        organizationsByPlan: {
          trial: organizations.filter(org => org.planType === 'trial').length,
          basic: organizations.filter(org => org.planType === 'basic').length,
          pro: organizations.filter(org => org.planType === 'pro').length,
          enterprise: organizations.filter(org => org.planType === 'enterprise').length,
        }
      };

      return {
        success: true,
        data: {
          organizations,
          chatbots,
          stats
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: {
          organizations: [],
          chatbots: [],
          stats: {
            totalOrganizations: 0,
            totalChatbots: 0,
            activeChatbots: 0,
            organizationsByPlan: {
              trial: 0, basic: 0, pro: 0, enterprise: 0
            }
          }
        }
      };
    }
  }
} 