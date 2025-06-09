/**
 * Controlador principal para manejar las interacciones con WhatsApp.
 * Este controlador gestiona los webhooks, mensajes, estados y sesiones de chat.
 * 
 * @class WhatsappController
 */
import { Controller, Post, Body, Get, Param, Delete, Logger, Query, Inject, forwardRef, UseGuards, Req, Headers, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { WhatsappService } from './whatsapp.service';
import { ChatService } from '../chat/chat.service';
import { MediaService } from '../media/media.service';
import { WhatsAppMessage } from './interfaces/whatsapp-provider.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chatbot } from '../admin/entities/chatbot.entity';
import { ChatbotInstance } from '../admin/entities/chatbot-instance.entity';
import { MultiTenantService } from '../admin/services/multi-tenant.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';

// Decorador personalizado para excluir rutas de la autenticación
export const Public = () => SetMetadata('isPublic', true);

@ApiTags('whatsapp')
@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService,
    private readonly chatService: ChatService,
    private readonly mediaService: MediaService,
    @InjectRepository(Chatbot, 'users')
    private readonly chatbotRepository: Repository<Chatbot>,
    @InjectRepository(ChatbotInstance, 'users')
    private readonly chatbotInstanceRepository: Repository<ChatbotInstance>,
    private readonly multiTenantService: MultiTenantService,
    private readonly configService: ConfigService
  ) {}

  @Post('message')
  @ApiOperation({ summary: 'Enviar mensaje de WhatsApp' })
  @ApiResponse({ status: 200, description: 'Mensaje enviado exitosamente' })
  async sendMessage(
    @Body() data: { phoneNumber: string; message: string },
    @Req() req
  ) {
    const chatbotId = req.user.chatbotId;
    return await this.whatsappService.sendMessage(
      data.phoneNumber,
      data.message,
      chatbotId
    );
  }

  @Post('webhook')
  @Public()
  @ApiOperation({ summary: 'Procesar mensaje entrante de WhatsApp' })
  @ApiResponse({ status: 200, description: 'Mensaje procesado exitosamente' })
  async receiveWebhook(@Body() webhookData: any, @Headers() headers: any) {
    this.logger.log('=== WEBHOOK GENÉRICO - ARQUITECTURA MULTI-TENANT ===');
    this.logger.log('Headers completos:', JSON.stringify(headers, null, 2));
    this.logger.log('Mensaje webhook recibido:', JSON.stringify(webhookData, null, 2));

    try {
      // 1. Extraer información del mensaje
      const message = this.extractMessageFromPayload(webhookData);
      if (!message) {
        this.logger.warn(`⚠️ No se pudo extraer mensaje del payload`);
        return { success: true, message: 'Payload sin mensaje procesable' };
      }

      this.logger.log(`📨 Mensaje extraído:`, JSON.stringify(message, null, 2));

      // 2. Detectar automáticamente el chatbot por instancia de WhatsApp
      let instanceId = null;
      
      // Intentar diferentes formas de extraer la instancia
      if (webhookData.instance) {
        instanceId = webhookData.instance;
      } else if (webhookData.instanceId) {
        instanceId = webhookData.instanceId;
      } else if (message.to) {
        instanceId = message.to;
      } else if (message.instanceId) {
        instanceId = message.instanceId;
      }

      if (!instanceId) {
        this.logger.error(`❌ No se pudo determinar la instancia de WhatsApp del mensaje`);
        return { success: false, error: 'Instancia de WhatsApp no identificada' };
      }

      this.logger.log(`🔍 Buscando chatbot para instancia: ${instanceId}`);

      // 3. Buscar el chatbot que corresponde a esta instancia
      const chatbot = await this.whatsappService.findChatbotByInstance(instanceId);
      
      if (!chatbot) {
        this.logger.error(`❌ No se encontró chatbot para la instancia: ${instanceId}`);
        return { success: false, error: `Chatbot no encontrado para instancia ${instanceId}` };
      }

      if (!chatbot.isActive) {
        this.logger.error(`❌ Chatbot inactivo: ${chatbot.name}`);
        return { success: false, error: 'Chatbot inactivo' };
      }

      this.logger.log(`✅ Chatbot identificado: ${chatbot.name} (${chatbot.slug}) - Org: ${chatbot.organization?.name}`);

      // 4. AQUÍ ESTÁ LA CLAVE: Usar el webhook específico del chatbot
      // Esto asegura que se use la lógica multi-tenant correcta
      this.logger.log(`🔄 Redirigiendo a webhook específico del chatbot: ${chatbot.id}`);
      
      const result = await this.handleWebhookByChatbot(chatbot.id, webhookData);
      
      this.logger.log(`✅ Respuesta del webhook específico:`, JSON.stringify(result, null, 2));
      
      return result;

    } catch (error) {
      this.logger.error(`❌ Error en webhook genérico: ${error.message}`);
      this.logger.error(`Stack trace:`, error.stack);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  private mapMessageType(type: string): WhatsAppMessage['type'] {
    switch (type.toLowerCase()) {
      case 'text':
        return 'text';
      case 'image':
        return 'image';
      case 'video':
        return 'video';
      case 'audio':
        return 'audio';
      case 'document':
        return 'document';
      case 'location':
        return 'location';
      case 'system':
        return 'system';
      default:
        return 'text';
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Obtener estado de conexión' })
  @ApiResponse({ status: 200, description: 'Estado obtenido exitosamente' })
  async getConnectionStatus(@Req() req) {
    const chatbotId = req.user.chatbotId;
    return await this.whatsappService.getConnectionStatus(chatbotId);
  }

  @Post('instance')
  @ApiOperation({ summary: 'Crear nueva instancia' })
  @ApiResponse({ status: 201, description: 'Instancia creada exitosamente' })
  async createInstance(@Req() req) {
    const chatbotId = req.user.chatbotId;
    return await this.whatsappService.createInstance(chatbotId);
  }

  @Delete('instance')
  @ApiOperation({ summary: 'Eliminar instancia' })
  @ApiResponse({ status: 200, description: 'Instancia eliminada exitosamente' })
  async deleteInstance(@Req() req) {
    const chatbotId = req.user.chatbotId;
    return await this.whatsappService.deleteInstance(chatbotId);
  }

  /**
   * Configura el webhook para recibir notificaciones de WhatsApp.
   * 
   * @param {string} webhookUrl - URL donde se recibirán las notificaciones
   * @returns {Promise<any>} Resultado de la configuración
   */
  @Post('webhook/configure')
  @ApiOperation({ summary: 'Configurar webhook' })
  @ApiResponse({ status: 200, description: 'Webhook configurado exitosamente' })
  async configureWebhook(
    @Body() data: { 
      url: string;
      events?: string[];
      secret?: string;
    },
    @Req() req
  ) {
    const chatbotId = req.user.chatbotId;
    try {
      const config = {
        webhookUrl: data.url,
        webhookEvents: data.events || ['message', 'status'],
        webhookSecret: data.secret
      };

      const result = await this.whatsappService.configureWebhook(config, chatbotId);
      this.logger.log(`Webhook configurado para chatbot ${chatbotId}: ${data.url}`);
      return result;
    } catch (error) {
      this.logger.error(`Error al configurar webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene el historial de chat para un número de teléfono específico.
   * 
   * @param {string} phoneNumber - Número de teléfono del usuario
   * @param {number} limit - Límite de mensajes a retornar (default: 10)
   * @returns {Promise<ChatMessage[]>} Historial de mensajes
   */
  @Get('history')
  @ApiOperation({ summary: 'Obtener historial de chat' })
  @ApiResponse({ status: 200, description: 'Historial obtenido exitosamente' })
  async getChatHistory(
    @Query('phoneNumber') phoneNumber: string,
    @Query('limit') limit: number = 10
  ) {
    try {
      const history = await this.chatService.getChatHistory(phoneNumber);
      return history;
    } catch (error) {
      this.logger.error(`Error al obtener historial: ${error.message}`);
      throw error;
    }
  }

  /**
   * Finaliza una sesión de chat activa.
   * 
   * @param {string} phoneNumber - Número de teléfono del usuario
   * @returns {Promise<{status: string}>} Estado de la operación
   */
  @Post('end-session')
  @ApiOperation({ summary: 'Finalizar sesión de chat' })
  @ApiResponse({ status: 200, description: 'Sesión finalizada exitosamente' })
  async endChatSession(@Body('phoneNumber') phoneNumber: string) {
    try {
      await this.chatService.endChatSession(phoneNumber);
      return { status: 'success' };
    } catch (error) {
      this.logger.error(`Error al finalizar sesión: ${error.message}`);
      throw error;
    }
  }

  @Post('status')
  @ApiOperation({ summary: 'Procesar actualización de estado' })
  @ApiResponse({ status: 200, description: 'Estado procesado exitosamente' })
  async processMessageStatus(@Body() data: { messageId: string; status: string }) {
    this.logger.log(`Actualización de estado para mensaje ${data.messageId}: ${data.status}`);
    try {
      // Aquí puedes implementar la lógica para manejar las actualizaciones de estado
      // Por ejemplo, actualizar el estado del mensaje en la base de datos
      return { status: 'success' };
    } catch (error) {
      this.logger.error(`Error al procesar actualización de estado: ${error.message}`);
      throw error;
    }
  }

  @Post('image')
  @ApiOperation({ summary: 'Envía una imagen por WhatsApp' })
  @ApiResponse({ status: 200, description: 'Imagen enviada correctamente' })
  async sendImage(
    @Body() data: { to: string; imageUrl: string; caption: string },
    @Req() req
  ) {
    const chatbotId = req.user.chatbotId;
    return await this.whatsappService.sendImage(
      data.to,
      data.imageUrl,
      data.caption,
      chatbotId
    );
  }

  @Post('document')
  @ApiOperation({ summary: 'Envía un documento por WhatsApp' })
  @ApiResponse({ status: 200, description: 'Documento enviado correctamente' })
  async sendDocument(
    @Body() data: { to: string; documentUrl: string; filename: string },
    @Req() req
  ) {
    const chatbotId = req.user.chatbotId;
    return await this.whatsappService.sendDocument(
      data.to,
      data.documentUrl,
      data.filename,
      chatbotId
    );
  }

  @Post(':chatbotId/location')
  @ApiOperation({ summary: 'Enviar ubicación por WhatsApp' })
  @ApiParam({ name: 'chatbotId', description: 'ID del chatbot' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Número de teléfono del destinatario' },
        latitude: { type: 'number', description: 'Latitud de la ubicación' },
        longitude: { type: 'number', description: 'Longitud de la ubicación' }
      },
      required: ['to', 'latitude', 'longitude']
    }
  })
  async sendLocation(
    @Param('chatbotId') chatbotId: string,
    @Body('to') to: string,
    @Body('latitude') latitude: number,
    @Body('longitude') longitude: number
  ) {
    return await this.whatsappService.sendLocation(to, latitude, longitude, chatbotId);
  }

  @Get('qrcode')
  @ApiOperation({ summary: 'Obtiene el código QR para conectar WhatsApp' })
  @ApiResponse({ status: 200, description: 'Código QR generado' })
  async getQRCode(@Req() req) {
    const chatbotId = req.user.chatbotId;
    return await this.whatsappService.getQRCode(chatbotId);
  }

  @Get('providers')
  @Public()
  @ApiOperation({ summary: 'Listar proveedores disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de proveedores' })
  getAvailableProviders() {
    return {
      success: true,
      providers: this.whatsappService.getAvailableProviders()
    };
  }

  @Get('provider')
  @ApiOperation({ summary: 'Obtiene el proveedor activo de WhatsApp' })
  @ApiResponse({ status: 200, description: 'Proveedor activo' })
  getActiveProvider(@Req() req) {
    const chatbotId = req.user.chatbotId;
    return this.whatsappService.getActiveProvider(chatbotId);
  }

  @Get('status/:chatbotId')
  @Public()
  @ApiOperation({ summary: 'Obtener estado del proveedor de WhatsApp para un chatbot específico' })
  @ApiResponse({ status: 200, description: 'Estado obtenido exitosamente' })
  async getWhatsAppStatus(@Param('chatbotId') chatbotId: string) {
    try {
      this.logger.log(`🔍 Verificando estado para chatbot: ${chatbotId}`);
      
      const chatbot = await this.chatbotInstanceRepository.findOne({
        where: { id: chatbotId, isActive: true },
        relations: ['organization']
      });

      if (!chatbot) {
        return { 
          success: false, 
          error: `Chatbot ${chatbotId} no encontrado`,
          providerInitialized: false
        };
      }

      const activeProvider = this.whatsappService.getActiveProvider(chatbotId);
      const status = await this.whatsappService.getConnectionStatus(chatbotId);
      
      return {
        success: true,
        chatbot: {
          id: chatbot.id,
          name: chatbot.name,
          organization: chatbot.organization?.name
        },
        provider: {
          name: activeProvider,
          initialized: !!activeProvider,
          status: status
        },
        whatsappConfig: this.safeParseConfig(chatbot.whatsappConfig)
      };
    } catch (error) {
      this.logger.error(`Error obteniendo estado: ${error.message}`);
      return {
        success: false,
        error: error.message,
        providerInitialized: false
      };
    }
  }

  @Post('reinitialize/:chatbotId')
  @Public()
  @ApiOperation({ summary: 'Forzar reinicialización del proveedor de WhatsApp' })
  @ApiResponse({ status: 200, description: 'Reinicialización exitosa' })
  async reinitializeProvider(@Param('chatbotId') chatbotId: string) {
    try {
      this.logger.log(`🔄 Reinicializando proveedor para chatbot: ${chatbotId}`);
      
      const chatbot = await this.chatbotInstanceRepository.findOne({
        where: { id: chatbotId, isActive: true },
        relations: ['organization']
      });

      if (!chatbot) {
        return { 
          success: false, 
          error: `Chatbot ${chatbotId} no encontrado` 
        };
      }

      // Forzar reinicialización llamando al método privado expuesto
      await this.whatsappService.forceReinitialize(chatbotId, chatbot);
      
      return {
        success: true,
        message: `Proveedor reinicializado para ${chatbot.name}`,
        chatbot: {
          id: chatbot.id,
          name: chatbot.name
        }
      };
    } catch (error) {
      this.logger.error(`Error reinicializando proveedor: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  private safeParseConfig(config: any): any {
    if (!config) return {};
    
    if (typeof config === 'object' && config !== null && !Array.isArray(config)) {
      return config;
    }
    
    if (typeof config === 'string') {
      try {
        return JSON.parse(config);
      } catch (error) {
        this.logger.warn(`Error parsing config string: ${error.message}`);
        return {};
      }
    }
    
    return {};
  }

  /**
   * Webhook único por chatbot - Multi-tenant
   */
  @Post('webhook/:chatbotId')
  @Public()
  @ApiOperation({ summary: 'Procesar webhook específico por chatbot' })
  @ApiParam({ name: 'chatbotId', description: 'ID o slug del chatbot' })
  @ApiBody({ description: 'Datos del webhook de WhatsApp' })
  async handleWebhookByChatbot(@Param('chatbotId') chatbotId: string, @Body() body: any) {
    try {
      this.logger.log(`🔗 === WEBHOOK ESPECÍFICO PARA CHATBOT: ${chatbotId} ===`);
      
      // 1. BUSCAR CHATBOT (por ID o slug)
      let chatbot;
      try {
        chatbot = await this.multiTenantService.getChatbotById(chatbotId);
      } catch (error) {
        this.logger.log(`🔍 ID no válido, intentando buscar por slug: ${chatbotId}`);
        chatbot = await this.multiTenantService.getChatbotBySlug(chatbotId);
      }
      
      if (!chatbot || !chatbot.isActive) {
        this.logger.error(`❌ Chatbot no encontrado o inactivo: ${chatbotId}`);
        return { 
          success: false, 
          error: 'Chatbot no encontrado o inactivo',
          chatbotId
        };
      }

      this.logger.log(`✅ Chatbot encontrado: ${chatbot.name} (Org: ${chatbot.organization?.name})`);

      // 2. EXTRAER MENSAJE DEL PAYLOAD
      const message = this.extractMessageFromPayload(body);
      
      if (!message) {
        this.logger.warn(`⚠️ No se pudo extraer mensaje del payload`);
        return { success: true, message: 'Payload sin mensaje procesable' };
      }

      this.logger.log(`📨 Mensaje extraído: ${message.body} (de: ${message.from})`);

      // 3. PROCESAR MENSAJE CON NUEVA ARQUITECTURA DE PROCESADORES
      this.logger.log(`🏭 Procesando con nueva arquitectura de procesadores...`);
      this.logger.log(`🔍 ANTES DE LLAMAR handleMessage - chatbot: ${chatbot.name}`);
      this.logger.log(`🔍 ARGUMENTOS: message=${JSON.stringify(message)}, chatbotId=${chatbot.id}`);
      
      // USAR LA NUEVA LÓGICA DE PROCESADORES (ValeryChatbotService para tipo ecommerce, BasicChatbotService para otros)
      await this.whatsappService.handleMessage({
        instanceId: chatbot.whatsappConfig?.instanceName || 'unknown',
        from: message.from,
        text: message.body,
        messageType: message.type || 'text',
        pushname: message.pushname // PASAR PUSHNAME DEL MENSAJE EXTRAÍDO
      });
      
      this.logger.log(`✅ Mensaje procesado usando nueva arquitectura de procesadores`);

      // 4. La respuesta ya se envía automáticamente dentro de handleMessage
      this.logger.log(`📤 El procesador ya se encargó de enviar la respuesta automáticamente`);

      return { 
        success: true, 
        chatbotId: chatbot.id,
        chatbotName: chatbot.name,
        processor: 'new_architecture',
        messageSent: true
      };

    } catch (error) {
      this.logger.error(`❌ Error en webhook del chatbot ${chatbotId}: ${error.message}`);
      return { 
        success: false, 
        error: error.message,
        chatbotId 
      };
    }
  }

  /**
   * Extrae el mensaje del payload de WhatsApp
   */
  private extractMessageFromPayload(body: any): any | null {
    try {
      this.logger.log(`🔍 ANALIZANDO PAYLOAD:`, JSON.stringify(body, null, 2));

      // 🎯 FORMATO EVOLUTION API PRINCIPAL CON EVENT Y DATA
      if (body.event === 'MESSAGES_UPSERT' && body.data) {
        this.logger.log(`📨 Formato Evolution API MESSAGES_UPSERT detectado`);
        
        // Evolution API envía data como array
        if (Array.isArray(body.data) && body.data.length > 0) {
          const msg = body.data[0]; // Tomar el primer mensaje del array
          this.logger.log(`🎯 PROCESANDO MSG desde data array:`, JSON.stringify(msg, null, 2));
          return this.extractMessageContent(msg);
        }
        // Fallback: data como objeto único
        else if (body.data && body.data.key && body.data.message) {
          const msg = body.data;
          this.logger.log(`🎯 PROCESANDO MSG desde data objeto:`, JSON.stringify(msg, null, 2));
          return this.extractMessageContent(msg);
        }
      }

      // 🎯 FORMATO EVOLUTION API ALTERNATIVO (sin event)
      if (body.data && (Array.isArray(body.data) || body.data.key)) {
        this.logger.log(`📨 Formato Evolution API sin event detectado`);
        
        if (Array.isArray(body.data) && body.data.length > 0) {
          const msg = body.data[0];
          this.logger.log(`🎯 PROCESANDO MSG desde data array directo:`, JSON.stringify(msg, null, 2));
          return this.extractMessageContent(msg);
        } else if (body.data.key && body.data.message) {
          const msg = body.data;
          this.logger.log(`🎯 PROCESANDO MSG desde data objeto directo:`, JSON.stringify(msg, null, 2));
          return this.extractMessageContent(msg);
        }
      }

      // 🎯 FORMATO DIRECTO CON KEY Y MESSAGE EN ROOT
      if (body.key && body.message) {
        this.logger.log(`📨 Formato key-message en raíz detectado`);
        return this.extractMessageContent(body);
      }

      // 🎯 FORMATO DIRECTO SIMPLE (como nuestras pruebas)
      if (body.from && (body.body || body.type)) {
        this.logger.debug(`📨 Formato directo simple detectado`);
        return {
          from: body.from,
          body: body.body || '',
          timestamp: body.timestamp || Date.now(),
          id: body.id || Date.now().toString(),
          type: body.type || 'text'
        };
      }

      // 🎯 FORMATO CON MESSAGE ANIDADO
      if (body.message) {
        this.logger.debug(`📨 Formato con message anidado detectado`);
        return this.extractMessageContent({
          key: body.key || { remoteJid: body.from || 'unknown', id: body.id || Date.now().toString() },
          message: body.message,
          messageTimestamp: body.messageTimestamp || body.timestamp || Date.now()
        });
      }

      // Si llegamos aquí, el formato no es reconocido
      this.logger.warn(`❓ Formato de payload no reconocido`);
      this.logger.warn(`📋 Propiedades disponibles:`, Object.keys(body));
      this.logger.warn(`📋 Estructura del payload:`, JSON.stringify(body, null, 2));
      return null;
    } catch (error) {
      this.logger.error(`❌ Error extrayendo mensaje del payload: ${error.message}`);
      return null;
    }
  }

  /**
   * Extrae el contenido específico del mensaje (texto, audio, imagen, etc.)
   */
  private extractMessageContent(msg: any): any | null {
    try {
      // EXTRAER PUSHNAME DEL WEBHOOK CON MÚLTIPLES FUENTES
      let pushname = null;
      
      this.logger.log(`🔍 ANALIZANDO MENSAJE PARA PUSHNAME:`, JSON.stringify(msg, null, 2));
      
      // Buscar pushname en diferentes ubicaciones del payload
      if (msg.pushName) {
        pushname = msg.pushName;
        this.logger.log(`✅ PUSHNAME encontrado en msg.pushName: ${pushname}`);
      } else if (msg.pushname) {
        pushname = msg.pushname;
        this.logger.log(`✅ PUSHNAME encontrado en msg.pushname: ${pushname}`);
      } else if (msg.pushName) {
        pushname = msg.pushName;
        this.logger.log(`✅ PUSHNAME encontrado en msg.pushName: ${pushname}`);
      } else if (msg.verifiedBizName) {
        pushname = msg.verifiedBizName;
        this.logger.log(`✅ PUSHNAME encontrado en msg.verifiedBizName: ${pushname}`);
      } else if (msg.participant && msg.participant.pushName) {
        pushname = msg.participant.pushName;
        this.logger.log(`✅ PUSHNAME encontrado en msg.participant.pushName: ${pushname}`);
      } else if (msg.key?.participant) {
        pushname = msg.key.participant;
        this.logger.log(`✅ PUSHNAME encontrado en msg.key.participant: ${pushname}`);
      } else if (msg.key && msg.key.fromMe === false && msg.key.remoteJid) {
        // Intentar extraer del remoteJid si es un número
        const remoteJid = msg.key.remoteJid;
        if (remoteJid && remoteJid.includes('@s.whatsapp.net')) {
          // No es un pushname real, es solo el número
          this.logger.log(`⚠️ Solo encontrado remoteJid: ${remoteJid}, no hay pushname`);
        }
      } else {
        this.logger.warn(`❌ NO SE ENCONTRÓ PUSHNAME en ninguna ubicación conocida`);
        this.logger.warn(`   📋 Propiedades disponibles:`, Object.keys(msg));
        if (msg.key) {
          this.logger.warn(`   📋 Propiedades en msg.key:`, Object.keys(msg.key));
        }
        if (msg.participant) {
          this.logger.warn(`   📋 Propiedades en msg.participant:`, Object.keys(msg.participant));
        }
      }
      
      this.logger.log(`👤 PUSHNAME FINAL EXTRAÍDO: ${pushname || 'No disponible'}`);
      
      // CREAR MENSAJE BASE CON INFORMACIÓN ESTÁNDAR
      const baseMessage = {
        from: msg.key?.remoteJid || msg.from || 'unknown',
        timestamp: msg.messageTimestamp || msg.timestamp || Date.now(),
        id: msg.key?.id || msg.id || Date.now().toString(),
        pushname: pushname, // AGREGAR PUSHNAME AL MENSAJE
        fromMe: msg.key?.fromMe || false // AGREGAR INFO SI ES MENSAJE PROPIO
      };
      
      this.logger.log(`📨 MENSAJE BASE CREADO:`, JSON.stringify(baseMessage, null, 2));
      
      // EXTRAER CONTENIDO DEL MENSAJE SEGÚN TIPO
      
      // 🎯 MENSAJE DE TEXTO SIMPLE
      if (msg.message?.conversation) {
        this.logger.log(`💬 MENSAJE DE TEXTO SIMPLE DETECTADO: ${msg.message.conversation}`);
        return {
          ...baseMessage,
          type: 'text',
          body: msg.message.conversation
        };
      }

      // 🎯 MENSAJE DE TEXTO EXTENDIDO
      if (msg.message?.extendedTextMessage?.text) {
        this.logger.log(`💬 MENSAJE DE TEXTO EXTENDIDO DETECTADO: ${msg.message.extendedTextMessage.text}`);
        return {
          ...baseMessage,
          type: 'text',
          body: msg.message.extendedTextMessage.text
        };
      }

      // 🎯 MENSAJE DE IMAGEN
      if (msg.message?.imageMessage) {
        this.logger.log(`🖼️ MENSAJE DE IMAGEN DETECTADO`);
        return {
          ...baseMessage,
          type: 'image',
          body: msg.message.imageMessage.caption || '[Imagen]',
          metadata: {
            mediaKey: msg.message.imageMessage.mediaKey,
            mimetype: msg.message.imageMessage.mimetype,
            url: msg.message.imageMessage.url
          }
        };
      }

      // 🎯 MENSAJE DE AUDIO
      if (msg.message?.audioMessage) {
        this.logger.log(`🎵 MENSAJE DE AUDIO DETECTADO`);
        return {
          ...baseMessage,
          type: 'audio',
          body: '[Audio]',
          metadata: {
            mediaKey: msg.message.audioMessage.mediaKey,
            mimetype: msg.message.audioMessage.mimetype,
            ptt: msg.message.audioMessage.ptt || false,
            seconds: msg.message.audioMessage.seconds
          }
        };
      }

      // 🎯 MENSAJE DE DOCUMENTO
      if (msg.message?.documentMessage) {
        this.logger.log(`📄 MENSAJE DE DOCUMENTO DETECTADO`);
        return {
          ...baseMessage,
          type: 'document',
          body: msg.message.documentMessage.title || msg.message.documentMessage.fileName || '[Documento]',
          metadata: {
            mediaKey: msg.message.documentMessage.mediaKey,
            mimetype: msg.message.documentMessage.mimetype,
            fileName: msg.message.documentMessage.fileName,
            fileLength: msg.message.documentMessage.fileLength
          }
        };
      }

      // 🎯 MENSAJE DE VIDEO
      if (msg.message?.videoMessage) {
        this.logger.log(`🎥 MENSAJE DE VIDEO DETECTADO`);
        return {
          ...baseMessage,
          type: 'video',
          body: msg.message.videoMessage.caption || '[Video]',
          metadata: {
            mediaKey: msg.message.videoMessage.mediaKey,
            mimetype: msg.message.videoMessage.mimetype,
            seconds: msg.message.videoMessage.seconds
          }
        };
      }

      // 🎯 MENSAJE DE CONTACTO
      if (msg.message?.contactMessage) {
        this.logger.log(`👤 MENSAJE DE CONTACTO DETECTADO`);
        return {
          ...baseMessage,
          type: 'contact',
          body: `[Contacto: ${msg.message.contactMessage.displayName || 'Sin nombre'}]`,
          metadata: {
            displayName: msg.message.contactMessage.displayName,
            vcard: msg.message.contactMessage.vcard
          }
        };
      }

      // 🎯 MENSAJE DE UBICACIÓN
      if (msg.message?.locationMessage) {
        this.logger.log(`📍 MENSAJE DE UBICACIÓN DETECTADO`);
        return {
          ...baseMessage,
          type: 'location',
          body: '[Ubicación compartida]',
          metadata: {
            latitude: msg.message.locationMessage.degreesLatitude,
            longitude: msg.message.locationMessage.degreesLongitude,
            name: msg.message.locationMessage.name,
            address: msg.message.locationMessage.address
          }
        };
      }

      // Si hay mensaje pero no reconocemos el tipo
      if (msg.message) {
        this.logger.warn(`❓ Tipo de mensaje no reconocido:`, Object.keys(msg.message));
        return {
          ...baseMessage,
          type: 'unknown',
          body: '[Mensaje no soportado]'
        };
      }

      // Si no hay estructura de mensaje reconocida
      this.logger.warn(`❓ No se encontró estructura de mensaje válida en:`, JSON.stringify(msg, null, 2));
      return null;
    } catch (error) {
      this.logger.error(`❌ Error extrayendo contenido del mensaje: ${error.message}`);
      return null;
    }
  }

  /**
   * Endpoint de prueba para procesar mensajes sin enviarlos a WhatsApp
   * @param body Datos del mensaje
   * @returns Respuesta procesada
   */
  @Public()
  @Post('process-message-test')
  async processMessageTest(@Body() body: { phoneNumber: string; message: string; chatbotId: string }) {
    try {
      this.logger.log(`🧪 Prueba de procesamiento para chatbot ${body.chatbotId}`);
      
      // Usar el mismo flujo pero sin enviar mensaje real
      const result = await this.whatsappService.processMessageWithoutSending(
        body.phoneNumber, 
        body.message, 
        body.chatbotId
      );
      
      return {
        success: true,
        response: result
      };
    } catch (error) {
      this.logger.error(`❌ Error en prueba: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post('debug-message-process/:chatbotId')
  @Public()
  async debugMessageProcess(@Param('chatbotId') chatbotId: string, @Body() body: any) {
    try {
      this.logger.log(`🔧 DEBUG: Iniciando procesamiento de mensaje de prueba`);
      this.logger.log(`🔧 DEBUG: ChatbotId: ${chatbotId}`);
      this.logger.log(`🔧 DEBUG: Body recibido:`, JSON.stringify(body, null, 2));
      
      // Simular el flujo del webhook
      const message = this.extractMessageFromPayload(body);
      
      if (!message) {
        return { 
          success: false, 
          error: 'No se pudo extraer mensaje del payload',
          logs: ['ERROR: Payload no procesable']
        };
      }
      
      this.logger.log(`🔧 DEBUG: Mensaje extraído:`, JSON.stringify(message, null, 2));
      
      // Buscar chatbot
      const chatbot = await this.chatbotInstanceRepository.findOne({
        where: { id: chatbotId },
        relations: ['organization']
      });
      
      if (!chatbot) {
        return { 
          success: false, 
          error: 'Chatbot no encontrado',
          logs: [`ERROR: Chatbot ${chatbotId} no encontrado`]
        };
      }
      
      this.logger.log(`🔧 DEBUG: Chatbot encontrado: ${chatbot.name}`);
      
      // Procesar con WhatsappService
      this.logger.log(`🔧 DEBUG: Llamando a whatsappService.handleMessage`);
      
      await this.whatsappService.handleMessage({
        instanceId: chatbot.whatsappConfig?.instanceName || 'unknown',
        from: message.from,
        text: message.body,
        messageType: message.type || 'text',
        pushname: message.pushname
      });
      
      this.logger.log(`🔧 DEBUG: WhatsappService completado exitosamente`);
      
      return { 
        success: true,
        message: 'Procesamiento completado',
        extractedMessage: message,
        chatbot: {
          id: chatbot.id,
          name: chatbot.name
        },
        logs: ['DEBUG endpoint completado - revisar logs del servidor para detalles completos']
      };
      
    } catch (error) {
      this.logger.error(`🔧 DEBUG ERROR: ${error.message}`);
      this.logger.error(`🔧 DEBUG STACK: ${error.stack}`);
      
      return { 
        success: false, 
        error: error.message,
        stack: error.stack,
        logs: [`ERROR: ${error.message}`]
      };
    }
  }

  @Post('test-message-save/:chatbotId')
  @Public()
  async testMessageSave(@Param('chatbotId') chatbotId: string, @Body() body: any) {
    try {
      this.logger.log(`🧪 TEST: Iniciando test de guardado de mensajes`);
      
      // Simular el flujo exacto del webhook
      const message = this.extractMessageFromPayload(body);
      if (!message) {
        return { success: false, error: 'No se pudo extraer mensaje del payload' };
      }
      
      // Buscar chatbot
      const chatbot = await this.chatbotInstanceRepository.findOne({
        where: { id: chatbotId },
        relations: ['organization']
      });
      
      if (!chatbot) {
        return { success: false, error: 'Chatbot no encontrado' };
      }
      
      // Simular llamada directa a ChatService para ver qué pasa
      const cleanPhone = message.from.replace('@s.whatsapp.net', '');
      
      // 1. Obtener o crear sesión (usando ChatService directamente)
      let session = await this.chatService.findSessionByPhoneOnly(cleanPhone);
      
      if (!session) {
        session = this.chatService.createSession(cleanPhone, chatbotId, 'active');
        session = await this.chatService.saveSession(session);
      }
      
      this.logger.log(`🧪 TEST: Sesión obtenida/creada: ${session.id}`);
      
      // 2. Intentar guardar mensaje directamente usando ChatService
      let saveResult = null;
      let saveError = null;
      
      try {
        saveResult = await this.chatService.saveMessage(session, message.body, 'user');
        this.logger.log(`🧪 TEST: Mensaje guardado exitosamente con ID: ${saveResult.id}`);
      } catch (error) {
        saveError = error.message;
        this.logger.error(`🧪 TEST: Error guardando mensaje: ${error.message}`);
      }
      
      // 3. Verificar si el mensaje aparece en la consulta de mensajes
      let retrievedMessages: any[] = [];
      let retrieveError = null;
      
      try {
        const messages: any = await this.chatService.getSessionMessages(session.id);
        retrievedMessages = messages?.data || messages || [];
        this.logger.log(`🧪 TEST: Mensajes recuperados: ${retrievedMessages.length}`);
      } catch (error: any) {
        retrieveError = error.message;
        this.logger.error(`🧪 TEST: Error recuperando mensajes: ${error.message}`);
      }
      
      // 4. Verificar con una segunda consulta
      let directQuery: any[] = [];
      let directError = null;
      
      try {
        // Intentar segunda consulta
        const allMessages: any = await this.chatService.getSessionMessages(session.id);
        directQuery = allMessages?.data || allMessages || [];
        this.logger.log(`🧪 TEST: Segunda consulta encontró: ${directQuery.length} mensajes`);
      } catch (error: any) {
        directError = error.message;
        this.logger.error(`🧪 TEST: Error en segunda consulta: ${error.message}`);
      }
      
      return {
        success: true,
        test_results: {
          session: {
            id: session.id,
            phoneNumber: session.phoneNumber,
            messageCount: session.messageCount,
            status: session.status
          },
          save_attempt: {
            success: saveResult !== null,
            message_id: saveResult?.id,
            error: saveError
          },
          retrieve_attempt: {
            success: retrieveError === null,
            message_count: retrievedMessages.length,
            messages: retrievedMessages,
            error: retrieveError
          },
          direct_query: {
            success: directError === null,
            message_count: directQuery?.length || 0,
            messages: directQuery || [],
            error: directError
          },
          extracted_message: message,
          chatbot: {
            id: chatbot.id,
            name: chatbot.name
          }
        }
      };
      
    } catch (error) {
      this.logger.error(`🧪 TEST ERROR: ${error.message}`);
      return { 
        success: false, 
        error: error.message,
        stack: error.stack
      };
    }
  }
} 