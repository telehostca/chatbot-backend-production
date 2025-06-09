/**
 * Servicio para manejar las interacciones con la API de WhatsApp.
 * Este servicio proporciona métodos para enviar mensajes, configurar webhooks
 * y gestionar el estado de las conexiones.
 * 
 * @class WhatsappService
 */
import { Injectable, Inject, OnModuleInit, Logger, forwardRef, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { BasicChatbotSimpleService } from './basic-chatbot-simple.service';
import { ChatbotFactoryCleanService } from '../chatbot/services/chatbot-factory-clean.service';
import { ValeryChatbotService } from '../valery/valery-chatbot.service';
import { AiService } from '../ai/ai.service';
import { DeepSeekService } from '../ai/deepseek.service';
import { RAGService } from '../rag/services/rag.service';
import { WhatsAppProvider, WhatsAppMessage, WhatsAppConfig, WhatsAppWebhookConfig } from './interfaces/whatsapp-provider.interface';
import { ChatService } from '../chat/chat.service';
import { Chatbot } from '../admin/entities/chatbot.entity';
import { ChatbotInstance } from '../admin/entities/chatbot-instance.entity';
import { MultiTenantService } from '../admin/services/multi-tenant.service';
import { MediaService } from '../media/media.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { GenericChatbotService } from '../chatbot/services/generic-chatbot.service';

@Injectable()
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private activeProvider: WhatsAppProvider;
  private providers: { [key: string]: WhatsAppProvider };
  private chatbotInstances: Map<string, WhatsAppProvider> = new Map();

  constructor(
    @Inject('WHATSAPP_PROVIDERS') providers: { [key: string]: WhatsAppProvider },
    private configService: ConfigService,
    private basicChatbotService: BasicChatbotSimpleService,
    private chatbotFactoryCleanService: ChatbotFactoryCleanService,
    @Inject(forwardRef(() => ChatService))
    private readonly chatService: ChatService,
    @InjectRepository(Chatbot, 'users')
    private chatbotRepository: Repository<Chatbot>,
    @InjectRepository(ChatbotInstance, 'users')
    private chatbotInstanceRepository: Repository<ChatbotInstance>,
    @Optional() private multiTenantService: MultiTenantService,
    private mediaService: MediaService,
    @Optional() @Inject(forwardRef(() => ValeryChatbotService))
    private valeryChatbotService: ValeryChatbotService,
    @Optional() private aiService: AiService,
    @Optional() private deepSeekService: DeepSeekService,
    @Optional() private ragService: RAGService,
    private readonly genericChatbotService: GenericChatbotService,
  ) {
    this.apiUrl = this.configService.get<string>('WHATSAPP_API_URL');
    this.apiKey = this.configService.get<string>('WHATSAPP_API_KEY');
    this.providers = providers;
    
    // Validar configuración básica
    if (!this.apiUrl) {
      this.logger.warn('WHATSAPP_API_URL no está configurada');
    }
    if (!this.apiKey) {
      this.logger.warn('WHATSAPP_API_KEY no está configurada');
    }
    
    // Verificar dependencias opcionales
    if (this.valeryChatbotService) {
      this.logger.log('✅ ValeryChatbotService disponible para chatbots tipo "valery"');
    } else {
      this.logger.warn('⚠️ ValeryChatbotService no disponible - chatbots tipo "valery" usarán respuesta básica');
    }
    
    this.logger.log(`Configuración de WhatsApp: URL ${this.apiUrl}`);
  }

  async onModuleInit() {
    try {
      // Inicializar proveedores para cada chatbot activo usando el nuevo sistema multi-tenant
      const chatbots = await this.chatbotInstanceRepository.find({
        where: { isActive: true },
        relations: ['organization']
      });

      this.logger.log(`🔄 Inicializando proveedores para ${chatbots.length} chatbots activos...`);

      for (const chatbot of chatbots) {
        await this.initializeChatbotProviderMultiTenant(chatbot);
      }
      
      this.logger.log(`✅ Proveedores inicializados para ${chatbots.length} chatbots`);
    } catch (error) {
      this.logger.error(`Error inicializando proveedores de WhatsApp: ${error.message}`);
    }
  }

  /**
   * Helper para convertir configuración de manera segura
   */
  private safeParseConfig(config: any): any {
    if (!config) return {};
    
    // Si ya es un objeto válido (no string), devolverlo directamente
    if (typeof config === 'object' && config !== null && !Array.isArray(config)) {
      // Verificar si tiene propiedades con índices numéricos (indica problema de conversión)
      const keys = Object.keys(config);
      const hasNumericIndices = keys.some(key => /^\d+$/.test(key));
      
      if (hasNumericIndices) {
        // Filtrar solo las propiedades que NO sean índices numéricos
        const validConfig = {};
        keys.forEach(key => {
          if (!/^\d+$/.test(key)) {
            validConfig[key] = config[key];
          }
        });
        return validConfig;
      }
      
      return config;
    }
    
    // Si es string, intentar parsear
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

  private async initializeChatbotProviderMultiTenant(chatbot: any) {
    try {
      this.logger.log(`🔧 INICIALIZANDO PROVEEDOR MULTITENANT para ${chatbot.name} (${chatbot.id})`);
      
      // CONFIGURACIÓN SAAS FIJA - Solo Evolution API
      const whatsappConfig = this.safeParseConfig(chatbot.whatsappConfig);
      this.logger.log(`🔍 Config WhatsApp parseada:`, whatsappConfig);

      // FORZAR INICIALIZACIÓN INCLUSO SIN instanceName (usar 'agente1' por defecto)
      const instanceName = whatsappConfig?.instanceName || 'agente1';
      this.logger.log(`🎯 Usando instancia: ${instanceName}`);

      // USAR SIEMPRE EVOLUTION API (configuración SaaS fija)
      let provider = null;
      
      this.logger.log(`🔍 Proveedores disponibles:`, {
        keys: Object.keys(this.providers),
        isArray: Array.isArray(this.providers),
        total: Object.keys(this.providers).length
      });
      
      // Buscar Evolution API en los proveedores disponibles
      if (Array.isArray(this.providers)) {
        // Si providers es array, buscar por tipo
        provider = this.providers.find(p => p.constructor.name === 'EvolutionApiProvider');
        this.logger.log(`🔍 Array search result:`, provider ? 'FOUND' : 'NOT FOUND');
      } else {
        // Si providers es objeto, buscar por clave
        provider = this.providers['evolution-api'] || this.providers['0'] || this.providers['1'] || Object.values(this.providers)[0];
        this.logger.log(`🔍 Object search result:`, provider ? 'FOUND' : 'NOT FOUND');
      }
      
      if (!provider) {
        this.logger.error(`❌ NO se encontró proveedor disponible para chatbot ${chatbot.name}`);
        this.logger.error(`❌ Proveedores disponibles: ${JSON.stringify(Object.keys(this.providers))}`);
        this.logger.error(`❌ Valores disponibles: ${Object.values(this.providers).map(p => p.constructor?.name || 'Unknown').join(', ')}`);
        return;
      }

      // Registrar el proveedor para este chatbot
      this.chatbotInstances.set(chatbot.id, provider);
      this.logger.log(`✅ PROVEEDOR REGISTRADO EXITOSAMENTE para chatbot ${chatbot.name} (${chatbot.id})`);
      this.logger.log(`✅ Instancia configurada: ${instanceName}`);
      this.logger.log(`✅ Proveedor tipo: ${provider.constructor.name}`);
      this.logger.log(`✅ Map size después de registro: ${this.chatbotInstances.size}`);

    } catch (error) {
      this.logger.error(`❌ ERROR en initializeChatbotProviderMultiTenant para ${chatbot.name}: ${error.message}`);
      this.logger.error(`❌ Stack:`, error.stack);
    }
  }

  private async initializeChatbotProvider(chatbot: Chatbot) {
    try {
      const { whatsapp } = chatbot.settings;
      if (!whatsapp || !whatsapp.provider || !whatsapp.instanceId) {
        this.logger.warn(`Chatbot ${chatbot.name} no tiene configuración de WhatsApp`);
        return;
      }

      const provider = this.providers[whatsapp.provider];
      if (!provider) {
        this.logger.error(`Proveedor ${whatsapp.provider} no encontrado para chatbot ${chatbot.name}`);
        return;
      }

      // Registrar el proveedor para este chatbot
      this.chatbotInstances.set(chatbot.id, provider);
      this.logger.log(`Proveedor de WhatsApp inicializado para chatbot ${chatbot.name}`);

      // Configurar el webhook automáticamente si está definido
      if (whatsapp.webhookUrl) {
        try {
          await provider.updateConfig({
            instanceId: whatsapp.instanceId,
            apiUrl: whatsapp.apiUrl || this.apiUrl,
            apiKey: whatsapp.apiKey || this.apiKey,
            webhookUrl: whatsapp.webhookUrl,
            webhookEvents: whatsapp.webhookEvents || ['message', 'status'],
            webhookSecret: whatsapp.webhookSecret
          });
          this.logger.log(`Webhook configurado automáticamente para chatbot ${chatbot.name}: ${whatsapp.webhookUrl}`);
        } catch (webhookError) {
          this.logger.error(`Error configurando webhook para chatbot ${chatbot.name}: ${webhookError.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error inicializando proveedor para chatbot ${chatbot.name}: ${error.message}`);
    }
  }

  async sendMessage(phoneNumber: string, message: string, chatbotId: string) {
    try {
      // FIX: Parameter validation to prevent message/phone mixups
      // This prevents message content from being used as phone numbers
      if (phoneNumber && (
        phoneNumber.length > 20 || 
        phoneNumber.includes(' ') || 
        /[a-zA-Z,;:]/.test(phoneNumber) ||
        phoneNumber.includes('hola') ||
        phoneNumber.includes('cedula') ||
        phoneNumber.includes('busco')
      )) {
        const errorMsg = `ERROR: Invalid phone number detected. Possible parameter mixup: ${phoneNumber.substring(0, 30)}...`;
        this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      // Ensure it's a valid phone number with only digits
      if (!/^\d{10,15}$/.test(phoneNumber.replace(/\D/g, ''))) {
        const errorMsg = `ERROR: Phone number must contain 10-15 digits only: ${phoneNumber}`;
        this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }
      
      this.logger.log(`📤 Enviando mensaje a ${phoneNumber} desde chatbot ${chatbotId}`);

      // Buscar el chatbot usando la nueva arquitectura multi-tenant
      const chatbot = await this.chatbotInstanceRepository.findOne({
        where: { id: chatbotId, isActive: true },
        relations: ['organization']
      });

      if (!chatbot) {
        throw new Error(`Chatbot ${chatbotId} no encontrado o inactivo en chatbot_instances`);
      }

      this.logger.log(`✅ Chatbot encontrado: ${chatbot.name} (Org: ${chatbot.organization?.name})`);

      // FORZAR INICIALIZACIÓN AUTOMÁTICA INMEDIATA (ANTES DE CUALQUIER VERIFICACIÓN)
      this.logger.log(`🔧 FORZANDO INICIALIZACIÓN AUTOMÁTICA para ${chatbotId}...`);
      await this.initializeChatbotProviderMultiTenant(chatbot);
      
      let provider = this.chatbotInstances.get(chatbotId);
      this.logger.log(`🔍 DEBUG: Proveedor actual para ${chatbotId}: ${provider ? 'ENCONTRADO' : 'NO ENCONTRADO'}`);
      this.logger.log(`🔍 DEBUG: chatbotInstances Map size: ${this.chatbotInstances.size}`);
      this.logger.log(`🔍 DEBUG: chatbotInstances keys: ${Array.from(this.chatbotInstances.keys()).join(', ')}`);
      
      if (!provider) {
        // INICIALIZACIÓN AUTOMÁTICA SAAS: Si no hay proveedor, inicializarlo bajo demanda
        this.logger.log(`🔄 Proveedor no encontrado para chatbot ${chatbotId}, inicializando automáticamente...`);
        this.logger.log(`🔍 DEBUG: Proveedores disponibles: ${JSON.stringify(Object.keys(this.providers))}`);
        
        await this.initializeChatbotProviderMultiTenant(chatbot);
        provider = this.chatbotInstances.get(chatbotId);
        
        this.logger.log(`🔍 DEBUG: Después de inicialización, proveedor: ${provider ? 'ENCONTRADO' : 'SIGUE SIN ENCONTRAR'}`);
        
        if (!provider) {
          // FALLBACK: Intentar asignar cualquier proveedor disponible
          this.logger.log(`🔄 FALLBACK: Asignando proveedor disponible directamente...`);
          const availableProviders = Object.values(this.providers);
          if (availableProviders.length > 0) {
            provider = availableProviders[0];
            this.chatbotInstances.set(chatbotId, provider);
            this.logger.log(`✅ FALLBACK exitoso: Proveedor asignado`);
          } else {
            throw new Error(`No hay proveedores de WhatsApp disponibles. Proveedores: ${JSON.stringify(Object.keys(this.providers))}`);
          }
        }
        
        this.logger.log(`✅ Proveedor inicializado automáticamente para chatbot ${chatbot.name}`);
      }

      // Obtener la configuración de WhatsApp usando el helper seguro
      const whatsappConfig = this.safeParseConfig(chatbot.whatsappConfig);
      
      // USAR INSTANCIA POR DEFECTO SI NO ESTÁ CONFIGURADA (SaaS)
      const instanceName = whatsappConfig?.instanceName || 'agente1';
      this.logger.log(`📡 Usando instancia: ${instanceName} para envío`);

      // CONFIGURACIÓN SAAS FIJA - Evolution API
      const config = {
        instanceId: instanceName,
        apiUrl: 'https://api.zemog.info',  // URL fija SaaS
        apiKey: 'Jesus88192*'              // API Key fija SaaS (actualizada)
      };

      this.logger.log(`📡 Configuración para envío:`, config);

      const response = await provider.sendMessage(
        phoneNumber, 
        message, 
        config
      );
      
      this.logger.log(`✅ Mensaje enviado exitosamente a ${phoneNumber} desde ${chatbot.name}`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Error enviando mensaje: ${error.message}`);
      throw error;
    }
  }

  async processIncomingMessage(message: WhatsAppMessage, chatbotId: string, chatbotEntity?: any) {
    this.logger.log(`📨 Procesando mensaje entrante para chatbot ${chatbotId}: ${message.body}`);

    try {
      // Obtener configuración del chatbot
      let chatbotConfig: any = null;
      
      if (chatbotEntity) {
        chatbotConfig = chatbotEntity;
      } else {
          const chatbot = await this.chatbotInstanceRepository.findOne({
            where: { id: chatbotId, isActive: true },
            relations: ['organization']
          });
          
        if (!chatbot) {
          throw new Error(`Chatbot ${chatbotId} no encontrado o inactivo`);
        }
        
        chatbotConfig = chatbot;
      }

      this.logger.log(`🤖 Configuración del chatbot obtenida: ${chatbotConfig.name}`);

      // USAR FACTORY LIMPIO PARA TODOS LOS CHATBOTS
      this.logger.log(`🏭 Usando ChatbotFactoryCleanService...`);
      
      const chatbotService = await this.chatbotFactoryCleanService.createChatbotService(chatbotId, chatbotConfig);
      const response = await chatbotService.handleMessage(
        message.body,
        message.from.replace('@s.whatsapp.net', ''),
        chatbotConfig,
        chatbotId
      );
      
      this.logger.log(`✅ Factory limpio respondió correctamente`);
      
        return { 
          status: 'success', 
        response: response,
        service: 'ChatbotFactoryCleanService',
        chatbot: chatbotConfig.name
      };

    } catch (error) {
      this.logger.error(`❌ Error en processIncomingMessage: ${error.message}`);
      
      return {
        status: 'error',
        response: 'Error interno procesando mensaje',
        service: 'Error',
        error: error.message
      };
    }
  }

  async getConnectionStatus(chatbotId: string) {
    try {
      const provider = this.chatbotInstances.get(chatbotId);
      if (!provider) {
        throw new Error(`No hay proveedor de WhatsApp configurado para el chatbot ${chatbotId}`);
      }

      const config = await provider.getConfig();
      return config;
    } catch (error) {
      this.logger.error(`Error obteniendo estado de conexión: ${error.message}`);
      throw error;
    }
  }

  async createInstance(chatbotId: string) {
    try {
      const chatbot = await this.chatbotRepository.findOne({
        where: { id: chatbotId }
      });

      if (!chatbot) {
        throw new Error(`Chatbot ${chatbotId} no encontrado`);
      }

      await this.initializeChatbotProvider(chatbot);
      return { status: 'success' };
    } catch (error) {
      this.logger.error(`Error creando instancia: ${error.message}`);
      throw error;
    }
  }

  async deleteInstance(chatbotId: string) {
    try {
      const provider = this.chatbotInstances.get(chatbotId);
      if (provider) {
        await provider.disconnect();
        this.chatbotInstances.delete(chatbotId);
      }
      return { status: 'success' };
    } catch (error) {
      this.logger.error(`Error eliminando instancia: ${error.message}`);
      throw error;
    }
  }

  async configureWebhook(config: {
    webhookUrl: string;
    webhookEvents: string[];
    webhookSecret?: string;
  }, chatbotId: string) {
    try {
      this.logger.log(`Configurando webhook para chatbot ${chatbotId}`);
      
      const provider = this.chatbotInstances.get(chatbotId);
      if (!provider) {
        throw new Error(`No hay proveedor de WhatsApp configurado para el chatbot ${chatbotId}`);
      }
      
      const webhookUrl = config.webhookUrl;
      
      // Verificar que el chatbot existe
      const chatbot = await this.chatbotRepository.findOne({
        where: { id: chatbotId }
      });
      
      if (!chatbot) {
        throw new Error(`Chatbot ${chatbotId} no encontrado`);
      }

      // Actualizar la configuración de WhatsApp en el chatbot
      chatbot.settings.whatsapp = {
        ...chatbot.settings.whatsapp,
        webhookUrl,
        webhookEvents: config.webhookEvents || ['message', 'status'],
        webhookSecret: config.webhookSecret
      };

      await this.chatbotRepository.save(chatbot);

      // Crear el objeto de configuración para el webhook
      const webhookConfig: WhatsAppWebhookConfig = {
        url: webhookUrl,
        events: config.webhookEvents || ['message', 'status'],
        secret: config.webhookSecret
      };
      
      // Crear el objeto de configuración para el proveedor
      const providerConfig: WhatsAppConfig = {
        instanceId: chatbot.settings.whatsapp.instanceId,
        apiUrl: chatbot.settings.whatsapp.apiUrl || this.apiUrl,
        apiKey: chatbot.settings.whatsapp.apiKey || this.apiKey
      };

      // Actualizar la configuración del proveedor
      if (provider.configureWebhook) {
        await provider.configureWebhook(webhookConfig, providerConfig);
      } else {
        this.logger.warn(`El proveedor no soporta configuración de webhook`);
      }

      this.logger.log(`Webhook configurado para chatbot ${chatbotId}: ${webhookUrl}`);
      return { 
        status: 'success',
        webhookUrl,
        events: config.webhookEvents || ['message', 'status']
      };
    } catch (error) {
      this.logger.error(`Error configurando webhook: ${error.message}`);
      throw error;
    }
  }

  async sendImage(to: string, imageUrl: string, caption: string, chatbotId: string): Promise<WhatsAppMessage> {
    try {
      const chatbot = await this.chatbotRepository.findOne({
        where: { id: chatbotId, isActive: true }
      });

      if (!chatbot) {
        throw new Error(`Chatbot ${chatbotId} no encontrado o inactivo`);
      }

      const provider = this.chatbotInstances.get(chatbotId);
      if (!provider) {
        throw new Error(`No hay proveedor de WhatsApp configurado para el chatbot ${chatbotId}`);
      }

      if (!chatbot.settings?.whatsapp?.instanceId) {
        throw new Error(`El chatbot ${chatbotId} no tiene configurado un ID de instancia de WhatsApp`);
      }

      // Pasar la configuración completa al proveedor
      const config = {
        instanceId: chatbot.settings.whatsapp.instanceId,
        apiUrl: chatbot.settings.whatsapp.apiUrl || this.apiUrl,
        apiKey: chatbot.settings.whatsapp.apiKey || this.apiKey
      };

      const response = await provider.sendImage(
        to, 
        imageUrl, 
        caption, 
        config
      );
      
      this.logger.log(`Imagen enviada exitosamente a ${to}`);
      return response;
    } catch (error) {
      this.logger.error(`Error enviando imagen: ${error.message}`);
      throw error;
    }
  }

  async sendDocument(to: string, documentUrl: string, caption: string, chatbotId: string): Promise<WhatsAppMessage> {
    try {
      const chatbot = await this.chatbotRepository.findOne({
        where: { id: chatbotId, isActive: true }
      });

      if (!chatbot) {
        throw new Error(`Chatbot ${chatbotId} no encontrado o inactivo`);
      }

      const provider = this.chatbotInstances.get(chatbotId);
      if (!provider) {
        throw new Error(`No hay proveedor de WhatsApp configurado para el chatbot ${chatbotId}`);
      }

      if (!chatbot.settings?.whatsapp?.instanceId) {
        throw new Error(`El chatbot ${chatbotId} no tiene configurado un ID de instancia de WhatsApp`);
      }

      // Pasar la configuración completa al proveedor
      const config = {
        instanceId: chatbot.settings.whatsapp.instanceId,
        apiUrl: chatbot.settings.whatsapp.apiUrl || this.apiUrl,
        apiKey: chatbot.settings.whatsapp.apiKey || this.apiKey
      };

      const response = await provider.sendDocument(
        to, 
        documentUrl, 
        caption, 
        config
      );
      
      this.logger.log(`Documento enviado exitosamente a ${to}`);
      return response;
    } catch (error) {
      this.logger.error(`Error enviando documento: ${error.message}`);
      throw error;
    }
  }

  async sendAudio(to: string, audioUrl: string, chatbotId: string): Promise<WhatsAppMessage> {
    try {
      const chatbot = await this.chatbotRepository.findOne({
        where: { id: chatbotId, isActive: true }
      });

      if (!chatbot) {
        throw new Error(`Chatbot ${chatbotId} no encontrado o inactivo`);
      }

      const provider = this.chatbotInstances.get(chatbotId);
      if (!provider) {
        throw new Error(`No hay proveedor de WhatsApp configurado para el chatbot ${chatbotId}`);
      }

      if (!chatbot.settings?.whatsapp?.instanceId) {
        throw new Error(`El chatbot ${chatbotId} no tiene configurado un ID de instancia de WhatsApp`);
      }

      // Pasar la configuración completa al proveedor
      const config = {
        instanceId: chatbot.settings.whatsapp.instanceId,
        apiUrl: chatbot.settings.whatsapp.apiUrl || this.apiUrl,
        apiKey: chatbot.settings.whatsapp.apiKey || this.apiKey
      };

      const response = await provider.sendAudio(
        to, 
        audioUrl, 
        config
      );
      
      this.logger.log(`Audio enviado exitosamente a ${to}`);
      return response;
    } catch (error) {
      this.logger.error(`Error enviando audio: ${error.message}`);
      throw error;
    }
  }

  async getQRCode(chatbotId: string): Promise<string> {
    try {
      const provider = this.chatbotInstances.get(chatbotId);
      if (!provider) {
        throw new Error(`No hay proveedor de WhatsApp configurado para el chatbot ${chatbotId}`);
      }
      return provider.getQRCode();
    } catch (error) {
      this.logger.error(`Error obteniendo código QR: ${error.message}`);
      throw error;
    }
  }

  async updateConfig(config: any, chatbotId: string): Promise<void> {
    const provider = this.chatbotInstances.get(chatbotId);
    if (!provider) {
      throw new Error(`No hay proveedor de WhatsApp configurado para el chatbot ${chatbotId}`);
    }
    await provider.updateConfig(config);
  }

  async getConfig(chatbotId: string): Promise<any> {
    const provider = this.chatbotInstances.get(chatbotId);
    if (!provider) {
      throw new Error(`No hay proveedor de WhatsApp configurado para el chatbot ${chatbotId}`);
    }
    return provider.getConfig();
  }

  async forceReinitialize(chatbotId: string, chatbot?: any): Promise<void> {
    try {
      this.logger.log(`🔄 Forzando reinicialización del proveedor para chatbot: ${chatbotId}`);
      
      // Si no se proporciona el chatbot, buscarlo
      if (!chatbot) {
        chatbot = await this.chatbotInstanceRepository.findOne({
          where: { id: chatbotId, isActive: true },
          relations: ['organization']
        });
        
        if (!chatbot) {
          throw new Error(`Chatbot ${chatbotId} no encontrado`);
        }
      }

      // Eliminar el proveedor actual si existe
      if (this.chatbotInstances.has(chatbotId)) {
        this.chatbotInstances.delete(chatbotId);
        this.logger.log(`🗑️ Proveedor anterior eliminado para ${chatbot.name}`);
      }

      // Reinicializar el proveedor
      await this.initializeChatbotProviderMultiTenant(chatbot);
      
      this.logger.log(`✅ Proveedor reinicializado exitosamente para ${chatbot.name}`);
    } catch (error) {
      this.logger.error(`Error en reinicialización forzada: ${error.message}`);
      throw error;
    }
  }

  getAvailableProviders(): string[] {
    return Object.keys(this.providers);
  }

  getActiveProvider(chatbotId: string): string | undefined {
    const provider = this.chatbotInstances.get(chatbotId);
    return provider ? Object.entries(this.providers).find(([_, p]) => p === provider)?.[0] : undefined;
  }

  async findChatbotByInstance(instanceId: string): Promise<ChatbotInstance> {
    try {
      this.logger.log(`Buscando chatbot para instancia: ${instanceId}`);
      
      // Usar el MultiTenantService si está disponible
      if (this.multiTenantService) {
        const chatbot = await this.multiTenantService.getChatbotConfigByInstance(instanceId);
        if (chatbot) {
          this.logger.log(`✅ Chatbot encontrado via MultiTenant: ${chatbot.name} (${chatbot.slug})`);
          return chatbot;
        }
      }

      // Fallback: buscar directamente en la tabla chatbot_instances
      const chatbotInstances = await this.chatbotInstanceRepository.find({
        where: { isActive: true },
        relations: ['organization']
      });

      const chatbot = chatbotInstances.find(cb => {
        try {
          const whatsappConfig = this.safeParseConfig(cb.whatsappConfig);
          return whatsappConfig.instanceName === instanceId;
        } catch (error) {
          this.logger.error(`Error parsing whatsappConfig for chatbot ${cb.id}: ${error.message}`);
          return false;
        }
      });
      
      if (!chatbot) {
        this.logger.warn(`❌ No se encontró chatbot para la instancia ${instanceId}`);
        
        // Depuración: listar todos los chatbots activos
        this.logger.debug(`Chatbots activos encontrados: ${chatbotInstances.length}`);
        for (const bot of chatbotInstances) {
          try {
            const whatsappConfig = this.safeParseConfig(bot.whatsappConfig);
            this.logger.debug(`Chatbot ${bot.name}: instanceName=${whatsappConfig?.instanceName}`);
          } catch (error) {
            this.logger.debug(`Chatbot ${bot.name}: Error parsing config`);
          }
        }
        return null;
      }

      this.logger.log(`✅ Chatbot encontrado para instancia ${instanceId}: ${chatbot.name} (${chatbot.slug})`);
      return chatbot;
    } catch (error) {
      this.logger.error(`Error al buscar chatbot por instancia: ${error.message}`);
      throw error;
    }
  }
  
  
  

  /**
   * Valida la firma de un webhook de WhatsApp
   * @param signature Firma recibida en el header x-whatsapp-signature
   * @param payload Cuerpo del mensaje
   * @param secret Secreto configurado para el webhook
   * @returns boolean indicando si la firma es válida
   */
  async validateWebhookSignature(
    signature: string,
    payload: any,
    secret: string
  ): Promise<boolean> {
    try {
      const hmac = crypto.createHmac('sha256', secret);
      const calculatedSignature = hmac
        .update(JSON.stringify(payload))
        .digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(calculatedSignature)
      );
    } catch (error) {
      this.logger.error(`Error validando firma de webhook: ${error.message}`);
      return false;
    }
  }

  async sendLocation(to: string, latitude: number, longitude: number, chatbotId: string): Promise<WhatsAppMessage> {
    try {
      const chatbot = await this.chatbotRepository.findOne({
        where: { id: chatbotId, isActive: true }
      });

      if (!chatbot) {
        throw new Error(`Chatbot ${chatbotId} no encontrado o inactivo`);
      }

      const provider = this.chatbotInstances.get(chatbotId);
      if (!provider) {
        throw new Error(`No hay proveedor de WhatsApp configurado para el chatbot ${chatbotId}`);
      }

      if (!chatbot.settings?.whatsapp?.instanceId) {
        throw new Error(`El chatbot ${chatbotId} no tiene configurado un ID de instancia de WhatsApp`);
      }

      // Pasar la configuración completa al proveedor
      const config = {
        instanceId: chatbot.settings.whatsapp.instanceId,
        apiUrl: chatbot.settings.whatsapp.apiUrl || this.apiUrl,
        apiKey: chatbot.settings.whatsapp.apiKey || this.apiKey
      };

      const response = await provider.sendLocation(
        to, 
        latitude,
        longitude,
        config
      );
      
      this.logger.log(`Ubicación enviada exitosamente a ${to}`);
      return response;
    } catch (error) {
      this.logger.error(`Error enviando ubicación: ${error.message}`);
      throw error;
    }
  }

  // Método para verificar si Valery está disponible
  private checkValeryService(): boolean {
    return false; // Valery service disabled
  }

  // Método para determinar si un chatbot debe usar ValeryChatbotService
  // Método para determinar si un chatbot debe usar ValeryChatbotService
  private shouldUseValeryService(chatbotConfig: any): boolean {
    try {
      // Verificar si el chatbot tiene configuración
      if (!chatbotConfig) {
        this.logger.debug('shouldUseValeryService: chatbotConfig es null/undefined');
        return false;
      }

      // BUSCAR PRIMERO EN EL NIVEL RAÍZ DE chatbotConfig
      let config = chatbotConfig.chatbotConfig || chatbotConfig;
      
      this.logger.debug('shouldUseValeryService: Verificando flags de Valery', {
        useValeryService: config.useValeryService,
        valeryEnabled: config.valeryEnabled,
        messageProcessor: config.messageProcessor,
        processor: config.processor,
        chatbotType: config.chatbotType,
        advancedAI: config.advancedAI
      });

      // Verificar flags específicos de Valery
      // Si useValeryService está explícitamente configurado como false, respetar esa configuración
      if (config.useValeryService === false) {
        this.logger.debug('shouldUseValeryService: useValeryService está explícitamente en false');
        return false;
      }
      
      const shouldUse = !!(
        config.useValeryService === true ||
        config.valeryEnabled === true ||
        config.messageProcessor === 'valery' ||
        config.processor === 'valery' ||
        config.advancedAI === true
      );
      
      this.logger.debug(`shouldUseValeryService resultado: ${shouldUse}`);
      return shouldUse;
      
    } catch (error) {
      this.logger.error(`Error verificando configuración de Valery: ${error.message}`);
      return false;
    }
  }
  private generateBasicResponse(messageText: string, chatbotConfig: any): string {
    try {
      // Respuesta personalizada basada en la configuración del chatbot
      const chatbotName = chatbotConfig?.name || 'Asistente Virtual';
      const organizationName = chatbotConfig?.organization?.name || 'la empresa';

      // Detectar si el mensaje parece ser una cédula
      const cedulaPattern = /^[VEJPGvejpg]?[0-9]{7,9}$/;
      if (cedulaPattern.test(messageText.trim())) {
        return `📋 He recibido su identificación: ${messageText}\n\n` +
               `Para procesar cédulas y ofrecer servicios personalizados, ` +
               `el administrador debe activar el modo avanzado de ${chatbotName}.\n\n` +
               `Por favor, contacte al administrador para habilitar las funciones completas.`;
      }

      // Respuesta de bienvenida básica
      return `🤖 Hola! Soy ${chatbotName}, su asistente virtual de ${organizationName}.\n\n` +
             `Actualmente estoy funcionando en modo básico. Para acceder a todas mis funciones ` +
             `(búsqueda de productos, procesamiento de pedidos, transcripción de audio), ` +
             `el administrador debe activar el modo avanzado.\n\n` +
             `¿En qué puedo ayudarle hoy?`;
    } catch (error) {
      this.logger.error(`Error generando respuesta básica: ${error.message}`);
      return 'Hola! Soy su asistente virtual. ¿En qué puedo ayudarte?';
    }
  }

  // 🤖 NUEVO: Determinar qué procesador usar según el tipo de chatbot (SISTEMA SAAS)
  private async determineProcessor(chatbot: any): Promise<string> {
    const config = chatbot?.chatbotConfig || {};
    
    console.log(`🔍 [SAAS] Analizando configuración del chatbot ${chatbot.name}:`, {
      chatbotType: config.chatbotType,
      processor: config.processor,
      useRAG: config.useRAG,
      ragEnabled: config.ragEnabled,
      useValeryService: config.useValeryService,
      aiFirst: config.aiFirst,
      forceAIProcessing: config.forceAIProcessing,
      disableIntentMatching: config.disableIntentMatching,
      intentProcessingMode: config.intentProcessingMode
    });
    
    // REGLA 0 (NUEVA): INTENCIONES DESACTIVADAS - Usar GenericChatbotService
    if (config.disableIntentMatching === true || 
        config.intentProcessingMode === 'ai_only' ||
        config.forceAIProcessing === true) {
      console.log(`🧠 INTENCIONES DESACTIVADAS: Usando GenericChatbotService directo`);
      return 'generic';
    }
    
    // REGLA 1 (NUEVA): PRIORIDAD ABSOLUTA IA - Si tiene aiFirst, SIEMPRE usar RAG
    if (config.aiFirst === true) {
      console.log(`🧠 IA FIRST: Prioridad absoluta para IA - Forzando procesador RAG`);
      return 'rag';
    }
    
    // REGLA 2: Si es tipo 'ecommerce' o tiene processor 'valery' explícitamente, usar ValeryChatbotService
    if ((config.chatbotType === 'ecommerce' && config.processor === 'valery') || 
        (config.useValeryService === true && config.processor === 'valery')) {
      console.log(`🛍️ VALERY: E-commerce explícito - Usando ValeryChatbotService`);
      return 'valery';
    }
    
    // REGLA 3: Si tiene RAG explícitamente deshabilitado, usar tipo específico
    if (config.useRAG === false || config.ragEnabled === false) {
      console.log('⚠️ RAG DESHABILITADO: Usando procesador específico o básico');
      return config.processor || 'basic';
    }
    
    // REGLA 4 (NUEVA): SAAS DEFAULT - RAG por defecto para todos los chatbots
    // Solo usar otros procesadores si están explícitamente configurados
    if (config.processor && config.processor !== 'rag') {
      console.log(`🤖 ESPECÍFICO: Usando procesador ${config.processor} (configurado explícitamente)`);
      return config.processor;
    }
    
    // REGLA 5 (NUEVA): RAG es el PREDETERMINADO en sistema SaaS
    console.log('🧠 SAAS DEFAULT: Usando procesador RAG (sistema SaaS predeterminado)');
    return 'rag';
  }

  // 🎯 NUEVO: Procesar mensaje según el tipo de chatbot
  private async processMessageByType(
    processor: string,
    from: string,
    text: string,
    chatbot: any,
    contact?: any
  ): Promise<string> {
    
    switch (processor) {
      case 'generic':
        return await this.processGenericMessage(from, text, chatbot, contact);
        
      case 'rag':
        return await this.processRAGMessage(from, text, chatbot, contact);
        
      case 'valery':
        return await this.processValeryMessage(from, text, chatbot, contact);
        
      case 'customer_service':
        return await this.processCustomerServiceMessage(from, text, chatbot, contact);
        
      case 'informational':
      case 'informativo':
        return await this.processInformationalMessage(from, text, chatbot, contact);
        
      case 'lead_capture':
        return await this.processLeadCaptureMessage(from, text, chatbot, contact);
        
      case 'custom':
        return await this.processCustomMessage(from, text, chatbot, contact);
        
      case 'basic':
      default:
        return await this.processBasicMessage(from, text, chatbot, contact);
    }
  }

  // 🤖 Procesador Genérico (Cuando intenciones están desactivadas)
  private async processGenericMessage(
    from: string,
    text: string,
    chatbot: any,
    contact?: any
  ): Promise<string> {
    try {
      console.log(`🤖 Procesando con GenericChatbotService (intenciones desactivadas): ${chatbot.name}`);
      const cleanPhone = from.replace('@s.whatsapp.net', '');
      
      // Usar directamente el GenericChatbotService que ya corregimos
      const response = await this.genericChatbotService.handleMessage(
        text,
        cleanPhone,
        chatbot,
        chatbot.id
      );
      
      if (response && response.trim()) {
        console.log(`✅ GenericChatbotService generó respuesta: ${response.substring(0, 100)}...`);
        return response.trim();
      } else {
        console.log(`⚠️ GenericChatbotService no generó respuesta válida`);
        return `🤖 Hola! Soy ${chatbot.name}. ¿En qué puedo ayudarte?`;
      }
    } catch (error) {
      console.error('❌ Error en processGenericMessage:', error);
      return `😔 Disculpa, hubo un error procesando tu mensaje.\n\n` +
             `Por favor, intenta de nuevo o contacta al soporte técnico.`;
    }
  }

  // 🧠 Procesador RAG (Sistema SaaS por defecto)
  private async processRAGMessage(
    from: string,
    text: string,
    chatbot: any,
    contact?: any
  ): Promise<string> {
    try {
      const config = chatbot?.chatbotConfig || {};
      const isAIFirst = config.aiFirst === true || config.forceAIProcessing === true;
      
      console.log(`🧠 Procesando con sistema RAG para chatbot: ${chatbot.name}`);
      console.log(`🎯 Modo IA First: ${isAIFirst} (ignora intenciones preconfiguradas)`);
      
      // Verificar si el servicio RAG está disponible
      if (!this.ragService) {
        console.log('⚠️ Servicio RAG no está disponible');
        
        // Si es AI First y no hay RAG, usar DeepSeek directamente
        if (isAIFirst && this.deepSeekService && this.deepSeekService.isServiceConfigured()) {
          console.log('🔄 AI First sin RAG: Usando DeepSeek directamente');
          try {
            const systemPrompt = config.systemPrompt || `Eres un asistente virtual inteligente llamado ${chatbot.name}. Proporciona respuestas útiles y precisas.`;
            const aiResponse = await this.deepSeekService.generateChatbotResponse(text, systemPrompt, []);
            
            if (aiResponse && aiResponse.trim()) {
              console.log(`✅ DeepSeek directo generó respuesta para AI First`);
              return aiResponse.trim();
            }
          } catch (aiError) {
            console.error('❌ Error en DeepSeek directo:', aiError);
          }
        }
        
        return `🤖 Sistema de respuestas inteligentes no disponible en este momento.\n\n` +
               `Por favor, intenta de nuevo más tarde o contacta al soporte técnico.`;
      }

      // Procesar consulta con RAG
      console.log(`🔍 Ejecutando consulta RAG: "${text}"`);
      const response = await this.ragService.simpleQuery(text, chatbot.id);
      
      if (response.success && response.data.answer) {
        console.log(`✅ RAG generó respuesta exitosamente para "${text}"`);
        return response.data.answer;
      } else {
        console.log(`⚠️ RAG no encontró respuesta relevante para "${text}"`);
        
        // Si es AI First, intentar DeepSeek directo como fallback
        if (isAIFirst && this.deepSeekService && this.deepSeekService.isServiceConfigured()) {
          console.log('🔄 AI First fallback: Usando DeepSeek sin RAG');
          try {
            const systemPrompt = config.systemPrompt || 
              `Eres un asistente virtual inteligente llamado ${chatbot.name}. 
              
              Proporciona respuestas útiles, precisas y contextualmente relevantes. 
              Mantén un tono profesional pero amigable.
              
              Si no tienes información específica sobre lo que se pregunta, sé honesto y ofrece alternativas o sugiere contactar directamente.
              
              Responde siempre en español de manera natural e inteligente.`;
              
            const aiResponse = await this.deepSeekService.generateChatbotResponse(text, systemPrompt, []);
            
            if (aiResponse && aiResponse.trim()) {
              console.log(`✅ DeepSeek fallback generó respuesta para AI First`);
              return aiResponse.trim();
            }
          } catch (aiError) {
            console.error('❌ Error en DeepSeek fallback:', aiError);
          }
        }
        
        // Fallback final: respuesta básica personalizada según configuración
        const fallbackMessage = isAIFirst 
          ? `🧠 Hola! Soy ${chatbot.name}, tu asistente inteligente.\n\n` +
            `No tengo información específica sobre "${text}" en este momento, pero estoy aquí para ayudarte.\n\n` +
            `¿Podrías darme más detalles o reformular tu pregunta?`
          : `🤖 Hola! Soy el asistente virtual de ${chatbot.name || 'nuestra empresa'}.\n\n` +
            `No encontré información específica sobre "${text}" en mi base de conocimiento.\n\n` +
            `¿Podrías reformular tu pregunta o consultar sobre:\n` +
            `• Horarios de atención\n` +
            `• Servicios disponibles\n` +
            `• Información general\n` +
            `• Contacto y ubicación`;
        
        return fallbackMessage;
      }
    } catch (error) {
      console.error('❌ Error en processRAGMessage:', error);
      return `😔 Disculpa, hubo un error procesando tu consulta.\n\n` +
             `Por favor, intenta de nuevo o contacta al soporte técnico.`;
    }
  }

  // 🛍️ Procesador Valery (E-commerce)
  private async processValeryMessage(
    from: string,
    text: string,
    chatbot: any,
    contact?: any
  ): Promise<string> {
    try {
      // Solo usar ValeryChatbotService si está disponible y es tipo 'valery' o 'ecommerce'
      if (this.valeryChatbotService) {
        console.log(`🛍️ Procesando con ValeryChatbotService para chatbot tipo "valery": ${chatbot.name}`);
        const cleanPhone = from.replace('@s.whatsapp.net', '');
        const response = await this.valeryChatbotService.handleMessage(text, cleanPhone, chatbot.id);
        return response || 'Lo siento, no pude procesar tu mensaje en este momento.';
      } else {
        console.log('⚠️ ValeryChatbotService no está disponible');
        return `🛍️ Sistema de e-commerce no disponible en este momento.\n\n` +
               `Este chatbot está configurado como tipo "valery" pero el servicio avanzado no está activo.\n` +
               `Contacta al administrador para activar las funciones de e-commerce.`;
      }
    } catch (error) {
      console.error('❌ Error en processValeryMessage:', error);
      return `😔 Disculpa, hubo un error procesando tu mensaje.\n\n` +
             `Por favor, intenta de nuevo o contacta al soporte técnico.`;
    }
  }

  // 🎧 Procesador Servicio al Cliente
  private async processCustomerServiceMessage(
    from: string,
    text: string,
    chatbot: any,
    contact?: any
  ): Promise<string> {
    try {
      this.logger.log(`🎧 Procesando mensaje de servicio al cliente: "${text}"`);
      
      // Obtener configuración del chatbot
      const chatbotConfig = this.safeParseConfig(chatbot?.chatbotConfig) || {};
      const systemPrompt = chatbotConfig.systemPrompt || this.getDefaultCustomerServicePrompt(chatbot?.name);
      
      this.logger.log(`📝 Usando prompt de farmacia especializado: ${systemPrompt.substring(0, 100)}...`);
      
      // Usar DeepSeek IA para generar respuesta inteligente
      if (this.deepSeekService && this.deepSeekService.isServiceConfigured()) {
        try {
          this.logger.log(`🧠 Llamando a DeepSeek con prompt especializado...`);
          const aiResponse = await this.deepSeekService.generateChatbotResponse(
            text,
            systemPrompt,
            []
          );
          
          if (aiResponse && aiResponse.trim()) {
            this.logger.log(`✅ Respuesta DeepSeek generada: ${aiResponse.substring(0, 100)}...`);
            return aiResponse.trim();
          } else {
            this.logger.warn(`⚠️ DeepSeek no disponible o respuesta vacía`);
          }
        } catch (aiError) {
          this.logger.warn(`⚠️ Error DeepSeek, usando fallback: ${aiError.message}`);
        }
      } else {
        this.logger.warn(`⚠️ DeepSeekService no está disponible o configurado`);
      }
      
      // Fallback: usar BasicChatbotService con configuración del chatbot
      this.logger.log(`🔄 Fallback: usando BasicChatbotService`);
      const result = await this.basicChatbotService.handleMessage(text, from, null, chatbot);
      
      if (result && result.response) {
        return result.response;
      }
      
      // Fallback final
      return '🎧 Hola! Soy tu asistente especializado en farmacia. ¿Cómo puedo ayudarte?';
      
    } catch (error) {
      this.logger.error(`❌ Error en processCustomerServiceMessage: ${error.message}`);
      return '🎧 Hola! Soy tu asistente especializado en farmacia. ¿Cómo puedo ayudarte?';
    }
  }

  /**
   * Obtiene prompt por defecto para servicio al cliente de farmacia
   */
  private getDefaultCustomerServicePrompt(chatbotName: string): string {
    return `Eres un especialista en servicio al cliente de farmacia altamente capacitado llamado ${chatbotName || 'FarmabienBot'}. Tu misión es resolver consultas sobre medicamentos, atender preguntas sobre servicios de farmacia y brindar soporte especializado de manera eficiente y empática.

Características de tu personalidad:
- Empático y comprensivo con las necesidades de salud de los clientes
- Profesional pero amigable en el trato
- Conocedor de medicamentos básicos y servicios de farmacia
- Eficiente en resolución de problemas
- Siempre dispuesto a ayudar

Servicios que ofreces:
- Información sobre medicamentos disponibles
- Consultas sobre horarios de atención
- Servicios de delivery a domicilio
- Información sobre ubicación y contacto
- Orientación sobre productos de farmacia
- Escalación para consultas médicas complejas

Instrucciones específicas:
- Responde de manera cálida y profesional
- Si no tienes información específica, indica que pueden contactar directamente
- Para consultas médicas complejas, recomienda consultar con un profesional
- Mantén respuestas concisas pero informativas
- Usa emojis apropiados para farmacia (💊, 🏥, 📞, etc.)

Responde siempre en español de manera natural y útil.`;
  }

  // ℹ️ Procesador Informativo Inteligente (IA-First)
  private async processInformationalMessage(
    from: string,
    text: string,
    chatbot: any,
    contact?: any
  ): Promise<string> {
    try {
      this.logger.log(`ℹ️ Procesando mensaje informativo con IA: "${text}"`);
      
      // Obtener configuración rica del chatbot
      const chatbotConfig = this.safeParseConfig(chatbot?.chatbotConfig) || {};
      const prompts = chatbotConfig.customPrompts || {};
      
      // PASO 1: IA ANALIZA LA INTENCIÓN Y GENERA RESPUESTA CONTEXTUAL
      if (this.deepSeekService && this.deepSeekService.isServiceConfigured()) {
        try {
          this.logger.log(`🧠 Usando IA para análisis de intención y respuesta...`);
          
          // Crear prompt especializado para análisis de intenciones
          const intentAnalysisPrompt = this.buildIntelligentIntentPrompt(chatbot, chatbotConfig, prompts);
          
          const aiResponse = await this.deepSeekService.generateChatbotResponse(
            text,
            intentAnalysisPrompt,
            []
          );
          
          if (aiResponse && aiResponse.trim()) {
            this.logger.log(`✅ Respuesta IA inteligente generada: ${aiResponse.substring(0, 100)}...`);
            return aiResponse.trim();
          } else {
            this.logger.warn(`⚠️ IA no generó respuesta válida`);
          }
        } catch (aiError) {
          this.logger.warn(`⚠️ Error en IA inteligente: ${aiError.message}`);
        }
      } else {
        this.logger.warn(`⚠️ DeepSeekService no disponible, usando fallback manual`);
      }
      
      // PASO 2: FALLBACK MANUAL SOLO SI IA FALLA COMPLETAMENTE
      return this.processManualIntentFallback(text, prompts, chatbot);
      
    } catch (error) {
      this.logger.error(`❌ Error en processInformationalMessage: ${error.message}`);
      return `ℹ️ Hola! Soy el asistente de ${chatbot?.name || 'nuestro negocio'}. ¿En qué puedo ayudarte?`;
    }
  }

  /**
   * 🧠 Construye un prompt inteligente para análisis de intenciones SaaS
   */
  private buildIntelligentIntentPrompt(chatbot: any, chatbotConfig: any, prompts: any): string {
    const businessName = chatbot?.name || 'nuestro negocio';
    const businessType = this.detectBusinessType(chatbotConfig);
    const customIntents = chatbotConfig.intents || [];
    
    // Construir sección de intenciones personalizadas del cliente
    let intentSection = '';
    if (customIntents.length > 0) {
      intentSection = `🎯 INTENCIONES PERSONALIZADAS DEL CLIENTE:
${customIntents.filter(intent => intent.enabled !== false).map(intent => 
  `• ${intent.name.toUpperCase()}: ${intent.response}
   Keywords: ${intent.keywords?.join(', ') || 'No definidas'}
   Ejemplos: ${intent.examples?.map(ex => `"${ex}"`).join(', ') || 'No definidos'}`
).join('\n')}

📋 INSTRUCCIONES PARA INTENCIONES PERSONALIZADAS:
- SIEMPRE prioriza las intenciones personalizadas sobre las genéricas
- Usa EXACTAMENTE la respuesta definida para cada intención
- Si detectas keywords o patrones similares a los ejemplos, clasifica esa intención
- Personaliza la respuesta con el contexto específico del mensaje
- Combina múltiples intenciones si es relevante

`;
    } else {
      intentSection = `🎯 INTENCIONES GENÉRICAS (SIN PERSONALIZACIÓN):
• HORARIOS: Preguntas sobre horarios de atención, días de trabajo, apertura/cierre
• UBICACIÓN: Consultas sobre dirección, localización, cómo llegar, referencias
• CONTACTO: Números telefónicos, redes sociales, formas de comunicación
• SERVICIOS: Qué ofrecen, información general del negocio
• PRECIOS: Costos, tarifas, métodos de pago
• DISPONIBILIDAD: Stock, productos disponibles, existencias
• RESERVAS: Hacer citas, reservar mesas, agendar servicios
• DELIVERY: Envíos a domicilio, zonas de cobertura, costos
• PROMOCIONES: Ofertas, descuentos, promociones especiales
• POLÍTICAS: Garantías, devoluciones, términos y condiciones
• SALUDO: Saludos iniciales, presentaciones, bienvenidas

`;
    }
    
    return `Eres el asistente inteligente de ${businessName}, especializado en ${businessType}. Tu misión es entender las intenciones del cliente usando la configuración personalizada y proporcionar respuestas útiles y precisas.

${intentSection}

📚 INFORMACIÓN ESPECÍFICA DEL NEGOCIO:
${chatbotConfig.knowledgeBase || 'Información no disponible'}

🎭 PERSONALIDAD Y CONTEXTO:
${chatbotConfig.systemPrompt || prompts.system || 'Mantén un tono profesional y amigable'}

👤 CONTEXTO DE USUARIOS:
${chatbotConfig.userContext || prompts.userContext || 'Los usuarios buscan información clara y rápida'}

📋 INSTRUCCIONES ESPECÍFICAS:
${chatbotConfig.specificInstructions || prompts.instructions || 'Responde de manera clara y útil'}

🔧 PROTOCOLO DE RESPUESTA SAAS:
1. IDENTIFICA la intención usando las definiciones personalizadas del cliente
2. PRIORIZA siempre las intenciones custom sobre las genéricas
3. USA la respuesta base definida por el cliente para esa intención
4. PERSONALIZA la respuesta con el contexto específico del mensaje del usuario
5. INCLUYE información adicional del knowledge base si es relevante
6. ESTRUCTURA la respuesta de manera clara y organizada
7. USA emojis apropiados para hacer la respuesta más amigable
8. OFRECE ayuda adicional si es apropiado

⚠️ REGLAS SAAS IMPORTANTES:
- Las intenciones del cliente SIEMPRE tienen prioridad sobre las genéricas
- Si no hay intención personalizada que coincida, usa las genéricas como fallback
- Mantén respuestas concisas pero completas (máximo 3 párrafos)
- Usa siempre la información actualizada del negocio
- Personaliza según el tipo de consulta específica
- Si la consulta es ambigua, pregunta para aclarar

RESPONDE al mensaje del cliente usando el sistema SaaS de intenciones personalizadas:`;
  }

  /**
   * 🔍 Detecta el tipo de negocio basado en la configuración
   */
  private detectBusinessType(chatbotConfig: any): string {
    const chatbotType = chatbotConfig.chatbotType || 'informativo';
    const knowledgeBase = (chatbotConfig.knowledgeBase || '').toLowerCase();
    const businessName = (chatbotConfig.businessName || '').toLowerCase();
    
    // Detectar por tipo de chatbot
    if (chatbotType === 'ecommerce') return 'comercio electrónico y ventas';
    if (chatbotType === 'servicio_cliente') return 'servicio al cliente y soporte';
    if (chatbotType === 'lead_generation') return 'generación de leads y contactos';
    
    // Detectar por contenido de la base de conocimientos
    if (knowledgeBase.includes('pizza') || knowledgeBase.includes('restaurante') || knowledgeBase.includes('comida')) {
      return 'restaurante y servicios gastronómicos';
    }
    if (knowledgeBase.includes('farmacia') || knowledgeBase.includes('medicamentos') || knowledgeBase.includes('salud')) {
      return 'farmacia y servicios de salud';
    }
    if (knowledgeBase.includes('tienda') || knowledgeBase.includes('productos') || knowledgeBase.includes('venta')) {
      return 'tienda y servicios comerciales';
    }
    if (knowledgeBase.includes('consulta') || knowledgeBase.includes('cita') || knowledgeBase.includes('servicio')) {
      return 'servicios profesionales y consultoría';
    }
    
    return 'servicios informativos y atención al cliente';
  }

  /**
   * 🔄 Fallback manual solo si la IA falla completamente
   */
  private processManualIntentFallback(text: string, prompts: any, chatbot: any): string {
    const lowerText = text.toLowerCase();
    
    // Intenciones básicas como último recurso
    if (lowerText.includes('horario') || lowerText.includes('hora') || lowerText.includes('abierto') || lowerText.includes('cerrado')) {
      return prompts.hours || '🕒 Para información sobre horarios, por favor contacta directamente con nosotros.';
    }
    
    if (lowerText.includes('ubicacion') || lowerText.includes('dirección') || lowerText.includes('donde') || lowerText.includes('localización')) {
      return prompts.location || '📍 Para información sobre nuestra ubicación, por favor contacta directamente con nosotros.';
    }
    
    if (lowerText.includes('telefono') || lowerText.includes('contacto') || lowerText.includes('llamar') || lowerText.includes('whatsapp')) {
      return prompts.contact || '📞 Para información de contacto, por favor escríbenos directamente.';
    }
    
    if (lowerText.includes('precio') || lowerText.includes('costo') || lowerText.includes('cuanto') || lowerText.includes('pago')) {
      return prompts.pricing || '💰 Para información sobre precios, por favor consulta directamente con nosotros.';
    }
    
    // Respuesta genérica final
    return prompts.welcome || `ℹ️ ¡Hola! Soy el asistente de ${chatbot?.name || 'nuestro negocio'}. Puedo ayudarte con información sobre nuestros servicios. ¿Qué necesitas saber?`;
  }

  // 💼 Procesador Generación de Leads
  private async processLeadCaptureMessage(
    from: string,
    text: string,
    chatbot: any,
    contact?: any
  ): Promise<string> {
    const config = chatbot?.chatbotConfig || {};
    const prompts = config.customPrompts || {};
    
    // Aquí implementarías lógica de captura de leads
    // Por ejemplo, detectar si es un nombre, email, etc.
    
    return prompts.welcome || '💼 Hola! Me gustaría conocerte mejor. ¿Cuál es tu nombre?';
  }

  // 🎨 Procesador Personalizado
  private async processCustomMessage(
    from: string,
    text: string,
    chatbot: any,
    contact?: any
  ): Promise<string> {
    const config = chatbot?.chatbotConfig || {};
    const prompts = config.customPrompts || {};
    
    // Aquí el usuario podría definir su propia lógica
    return prompts.welcome || 'Chatbot personalizado activo.';
  }

  // 🔧 Procesador Básico
  private async processBasicMessage(
    from: string,
    text: string,
    chatbot: any,
    contact?: any
  ): Promise<string> {
    try {
      // Usar el nuevo BasicChatbotService que maneja prompts personalizados
      const result = await this.basicChatbotService.handleMessage(text, from, null, chatbot);
      
      // Extraer solo la respuesta del objeto complejo
      if (result && typeof result === 'object' && result.response) {
        return result.response;
      }
      
      // Si es una string directa, devolverla
      if (typeof result === 'string') {
        return result;
      }
      
      // Fallback si no hay respuesta válida
      return 'Hola! ¿En qué puedo ayudarte?';
    } catch (error) {
      this.logger.error(`❌ Error en processBasicMessage: ${error.message}`);
      return 'Disculpa, hubo un error procesando tu mensaje. Intenta nuevamente.';
    }
  }

  // 📝 Modificar el método principal handleMessage
  async handleMessage(data: any): Promise<void> {
    try {
      console.log('📥 Procesando mensaje WhatsApp:', JSON.stringify(data, null, 2));

      const { instanceId, from, text, messageType } = data;

      if (!from || !text) {
        console.log('⚠️ Mensaje incompleto, ignorando');
        return;
      }

      // Buscar chatbot por instanceId
      const chatbot = await this.findChatbotByInstance(instanceId);
      if (!chatbot) {
        console.log(`❌ No se encontró chatbot para instanceId: ${instanceId}`);
        return;
      }

      console.log(`🤖 Chatbot encontrado: ${chatbot.name} (ID: ${chatbot.id})`);

      // ✨ NUEVA LÓGICA: Determinar procesador según tipo
      const processor = await this.determineProcessor(chatbot);
      console.log(`🔧 Procesador seleccionado: ${processor}`);

      // Procesar mensaje según el tipo
      const response = await this.processMessageByType(processor, from, text, chatbot);

      // Enviar respuesta
      if (response) {
        const cleanPhone = from.replace('@s.whatsapp.net', '');
        await this.sendMessage(cleanPhone, response, chatbot.id);
        console.log(`✅ Respuesta enviada: ${response}`);
      }

    } catch (error) {
      console.error('❌ Error en handleMessage:', error);
    }
  }

  /**
   * Procesa un mensaje sin enviarlo a WhatsApp (para pruebas)
   * @param phoneNumber Número de teléfono del usuario
   * @param message Mensaje del usuario
   * @param chatbotId ID del chatbot
   * @returns Respuesta procesada
   */
  async processMessageWithoutSending(
    phoneNumber: string,
    message: string,
    chatbotId: string
  ): Promise<string> {
    try {
      this.logger.log(`🧪 Procesando mensaje de prueba para chatbot ${chatbotId}`);
      
      // Verificar si el chatbot existe
      const chatbot = await this.chatbotInstanceRepository.findOne({
        where: { id: chatbotId },
        relations: ['organization'] // Incluir relaciones necesarias
      });
      
      if (!chatbot) {
        throw new Error(`Chatbot no encontrado: ${chatbotId}`);
      }
      
      // Determinar el tipo de chatbot
      let chatbotType = 'basic';
      try {
        const chatbotConfig = typeof chatbot.chatbotConfig === 'string' 
          ? JSON.parse(chatbot.chatbotConfig) 
          : chatbot.chatbotConfig;
          
        chatbotType = chatbotConfig?.type || 'basic';
        this.logger.log(`🧪 Tipo de chatbot detectado: ${chatbotType}`);
      } catch (error) {
        this.logger.warn(`⚠️ Error obteniendo tipo de chatbot: ${error.message}`);
      }
      
      // Usar ValeryChatbotService para chatbots de tipo ecommerce (mejor manejo de comandos)
      if (chatbotType === 'ecommerce' && this.valeryChatbotService) {
        this.logger.log(`🧪 Usando ValeryChatbotService para chatbot ecommerce`);
        const response = await this.valeryChatbotService.handleMessage(
          message,
          phoneNumber,
          chatbotId
        );
        return response;
      }
      
      // Para otros tipos, usar el servicio genérico
      this.logger.log(`🧪 Usando GenericChatbotService para tipo: ${chatbotType}`);
      const response = await this.genericChatbotService.handleMessage(
        message,
        phoneNumber,
        chatbot,
        chatbotId
      );
      
      this.logger.log(`✅ Mensaje procesado con éxito, respuesta generada.`);
      return response;
    } catch (error) {
      this.logger.error(`❌ Error procesando mensaje de prueba: ${error.message}`);
      throw error;
    }
  }

  async handleWebhookPayload(payload: any) {
    try {
      this.logger.log(`📩 Recibido webhook payload: ${JSON.stringify(payload).substring(0, 200)}...`);
      
      // Obtener el instanceId del payload
      const instanceId = payload?.instanceId || payload?.instance_id;
      
      if (!instanceId) {
        this.logger.error('❌ No se pudo determinar el instanceId en el payload');
        return;
      }
      
      // Buscar el chatbot asociado a esta instancia
      const chatbot = await this.findChatbotByInstance(instanceId);
      
      if (!chatbot) {
        this.logger.error(`❌ No se encontró chatbot para instanceId: ${instanceId}`);
        return;
      }
      
      // Extraer el mensaje del payload
      const message = this.extractMessageFromPayload(payload);
      
      if (!message) {
        this.logger.warn('⚠️ No se pudo extraer un mensaje válido del payload');
        return;
      }
      
      this.logger.log(`📩 Mensaje extraído: ${message.body} de ${message.from}`);
      
      // Procesar con ChatbotFactoryCleanService
      const chatbotService = await this.chatbotFactoryCleanService.createChatbotService(chatbot.id, chatbot);
      const response = await chatbotService.handleMessage(
        message.body,
        message.from.replace('@s.whatsapp.net', ''),
        chatbot,
        chatbot.id
      );
      
      if (response) {
        // Enviar respuesta usando el método sendMessage
        await this.sendMessage(
          message.from.replace('@s.whatsapp.net', ''),
          response,
          chatbot.id
        );
        this.logger.log(`✅ Respuesta enviada a ${message.from}: ${response.substring(0, 50)}...`);
      }
    } catch (error) {
      this.logger.error(`❌ Error en handleWebhookPayload: ${error.message}`);
    }
  }
  
  /**
   * Extraer un objeto WhatsAppMessage del payload del webhook
   * Este método es adaptable según el formato de cada proveedor
   */
  private extractMessageFromPayload(payload: any): WhatsAppMessage | null {
    try {
      // Estructura básica para Evolution API
      if (payload?.data?.key?.remoteJid) {
        return {
          from: payload.data.key.remoteJid,
          to: payload.data.key.fromMe ? payload.data.key.remoteJid : payload.instance_id,
          body: payload.data.message?.conversation || 
                payload.data.message?.extendedTextMessage?.text || 
                'Media message',
          timestamp: new Date(),
          type: 'text',
          instanceId: payload.instance_id
        };
      }
      
      // Estructura para otros proveedores
      if (payload?.message && payload?.from) {
        return {
          from: payload.from,
          to: payload.to || payload.instance_id,
          body: payload.message,
          timestamp: new Date(),
          type: 'text',
          instanceId: payload.instance_id
        };
      }
      
      return null;
    } catch (error) {
      this.logger.error(`❌ Error extrayendo mensaje: ${error.message}`);
      return null;
    }
  }
} 