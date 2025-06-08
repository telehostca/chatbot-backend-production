import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../entities/organization.entity';
import { ChatbotInstance } from '../entities/chatbot-instance.entity';

export interface CreateOrganizationDto {
  name: string;
  slug: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  planType?: 'trial' | 'basic' | 'pro' | 'enterprise';
  maxChatbots?: number;
}

export interface CreateChatbotDto {
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  aiConfig: {
    provider: 'deepseek' | 'openai' | 'claude' | 'gemini' | 'custom';
    apiKey: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
  };
  whatsappConfig: {
    provider: 'evolution-api' | 'waba-sms' | 'custom';
    instanceName: string;
    apiUrl: string;
    apiKey: string;
    webhookUrl?: string;
    phoneNumber?: string;
  };
  externalDbConfig?: {
    enabled: boolean;
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    database?: string;
    type?: 'mysql' | 'postgres' | 'mssql';
    ssl?: boolean;
  };
  chatbotConfig?: {
    language?: string;
    personality?: 'professional' | 'friendly' | 'casual' | 'enthusiastic';
    responseStyle?: 'formal' | 'casual' | 'technical';
    useEmojis?: boolean;
    responseTimeMs?: number;
    maxCartItems?: number;
    sessionTimeoutHours?: number;
    enableSentimentAnalysis?: boolean;
    enableSpellCorrection?: boolean;
  };
}

@Injectable()
export class MultiTenantService {
  private readonly logger = new Logger(MultiTenantService.name);

  constructor(
    @InjectRepository(Organization, 'users')
    private organizationRepository: Repository<Organization>,
    @InjectRepository(ChatbotInstance, 'users')
    private chatbotInstanceRepository: Repository<ChatbotInstance>,
  ) {}

  // ===== GESTIÓN DE ORGANIZACIONES =====

  /**
   * Crear nueva organización
   */
  async createOrganization(dto: CreateOrganizationDto): Promise<Organization> {
    try {
      // Verificar que el slug no exista
      const existingOrg = await this.organizationRepository.findOne({
        where: { slug: dto.slug }
      });

      if (existingOrg) {
        throw new BadRequestException(`Ya existe una organización con el slug: ${dto.slug}`);
      }

      const organization = this.organizationRepository.create({
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        planType: dto.planType || 'trial',
        maxChatbots: dto.maxChatbots || 5,
        settings: {
          timezone: 'America/Caracas',
          language: 'es',
          currency: 'USD',
          theme: 'light'
        }
      });

      const savedOrg = await this.organizationRepository.save(organization);
      this.logger.log(`✅ Organización creada: ${savedOrg.name} (${savedOrg.slug})`);
      
      return savedOrg;
    } catch (error) {
      this.logger.error(`Error creando organización: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener todas las organizaciones
   */
  async getOrganizations(): Promise<Organization[]> {
    try {
      return await this.organizationRepository.find({
        relations: ['chatbots'],
        order: { createdAt: 'DESC' }
      });
    } catch (error) {
      this.logger.error(`Error obteniendo organizaciones: ${error.message}`);
      return [];
    }
  }

  /**
   * Obtener organización por ID
   */
  async getOrganizationById(id: string): Promise<Organization> {
    try {
      const organization = await this.organizationRepository.findOne({
        where: { id },
        relations: ['chatbots']
      });

      if (!organization) {
        throw new NotFoundException(`Organización no encontrada: ${id}`);
      }

      return organization;
    } catch (error) {
      this.logger.error(`Error obteniendo organización: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener organización por slug
   */
  async getOrganizationBySlug(slug: string): Promise<Organization> {
    try {
      const organization = await this.organizationRepository.findOne({
        where: { slug },
        relations: ['chatbots']
      });

      if (!organization) {
        throw new NotFoundException(`Organización no encontrada: ${slug}`);
      }

      return organization;
    } catch (error) {
      this.logger.error(`Error obteniendo organización por slug: ${error.message}`);
      throw error;
    }
  }

  // ===== GESTIÓN DE CHATBOTS =====

  /**
   * Crear nuevo chatbot
   */
  async createChatbot(dto: CreateChatbotDto): Promise<ChatbotInstance> {
    try {
      // Verificar que la organización existe
      const organization = await this.getOrganizationById(dto.organizationId);

      // Verificar límite de chatbots
      const currentChatbots = await this.chatbotInstanceRepository.count({
        where: { organizationId: dto.organizationId }
      });

      if (currentChatbots >= organization.maxChatbots) {
        throw new BadRequestException(`Límite de chatbots alcanzado (${organization.maxChatbots})`);
      }

      // Verificar que el slug no exista
      const existingChatbot = await this.chatbotInstanceRepository.findOne({
        where: { slug: dto.slug }
      });

      if (existingChatbot) {
        throw new BadRequestException(`Ya existe un chatbot con el slug: ${dto.slug}`);
      }

      // Configuración por defecto del chatbot (SISTEMA SAAS CON RAG)
      const defaultChatbotConfig = {
        // Configuración básica
        language: 'es',
        personality: 'friendly' as const,
        responseStyle: 'casual' as const,
        useEmojis: true,
        responseTimeMs: 2000,
        maxCartItems: 50,
        sessionTimeoutHours: 2,
        enableSentimentAnalysis: true,
        enableSpellCorrection: true,
        
        // NUEVO: CONFIGURACIÓN RAG POR DEFECTO PARA SISTEMA SAAS
        chatbotType: 'informational',
        processor: 'rag',
        useRAG: true,
        ragEnabled: true,
        aiProvider: 'deepseek',
        
        // Configuración AI para RAG
        ai: {
          provider: 'deepseek',
          model: 'deepseek-chat',
          temperature: 0.7,
          maxTokens: 4000,
          enabled: true
        },

        // Features SaaS con RAG
        features: [
          'rag_queries',
          'information_retrieval', 
          'document_search',
          'contextual_responses'
        ],

        // Configuraciones adicionales para RAG
        enableContextAware: true,
        enablePersistentSessions: true,
        useAI: true,
        aiEnabled: true,
        
        // Merge con configuración personalizada del DTO (si viene)
        ...dto.chatbotConfig
      };

      // Configuración por defecto de notificaciones
      const defaultNotificationConfig = {
        cartReminders: true,
        specialOffers: true,
        statusUpdates: true,
        reminderIntervalHours: 24,
        maxReminders: 3
      };

      const chatbot = this.chatbotInstanceRepository.create({
        organizationId: dto.organizationId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        aiConfig: dto.aiConfig,
        whatsappConfig: dto.whatsappConfig,
        externalDbConfig: dto.externalDbConfig || { enabled: false },
        chatbotConfig: defaultChatbotConfig,
        notificationConfig: defaultNotificationConfig,
        status: 'active'
      });

      const savedChatbot = await this.chatbotInstanceRepository.save(chatbot);
      this.logger.log(`✅ Chatbot creado: ${savedChatbot.name} (${savedChatbot.slug})`);
      
      return savedChatbot;
    } catch (error) {
      this.logger.error(`Error creando chatbot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener chatbot por slug
   */
  async getChatbotBySlug(slug: string): Promise<ChatbotInstance> {
    try {
      const chatbot = await this.chatbotInstanceRepository.findOne({
        where: { slug },
        relations: ['organization']
      });

      if (!chatbot) {
        throw new NotFoundException(`Chatbot no encontrado: ${slug}`);
      }

      return chatbot;
    } catch (error) {
      this.logger.error(`Error obteniendo chatbot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener todos los chatbots de una organización
   */
  async getChatbotsByOrganization(organizationId: string): Promise<ChatbotInstance[]> {
    try {
      return await this.chatbotInstanceRepository.find({
        where: { organizationId },
        order: { createdAt: 'DESC' }
      });
    } catch (error) {
      this.logger.error(`Error obteniendo chatbots: ${error.message}`);
      return [];
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

  /**
   * Actualizar configuración de un chatbot
   */
  async updateChatbot(id: string, updates: Partial<ChatbotInstance>): Promise<ChatbotInstance> {
    try {
      this.logger.log(`🔄 Actualizando chatbot ID: ${id}`);
      this.logger.debug(`📝 Updates recibidos:`, JSON.stringify(updates, null, 2));

      const chatbot = await this.chatbotInstanceRepository.findOne({ 
        where: { id },
        relations: ['organization']
      });
      
      if (!chatbot) {
        throw new NotFoundException(`Chatbot no encontrado: ${id}`);
      }

      this.logger.log(`📋 Chatbot actual: ${chatbot.name}`);

      // Actualizar campos básicos
      if (updates.name !== undefined) {
        chatbot.name = updates.name;
        this.logger.log(`✏️ Nombre actualizado: ${updates.name}`);
      }
      
      if (updates.description !== undefined) {
        chatbot.description = updates.description;
        this.logger.log(`📝 Descripción actualizada`);
      }

      // Actualizar configuración de IA usando el helper seguro
      if (updates.aiConfig) {
        const currentAiConfig = this.safeParseConfig(chatbot.aiConfig);
        const newAiConfig = this.safeParseConfig(updates.aiConfig);
        
        const mergedAiConfig = {
          ...currentAiConfig,
          ...newAiConfig
        };

        chatbot.aiConfig = mergedAiConfig;
        this.logger.log(`🤖 Configuración IA procesada:`, mergedAiConfig);
      }

      // Actualizar configuración de WhatsApp usando el helper seguro
      if (updates.whatsappConfig) {
        const currentWhatsappConfig = this.safeParseConfig(chatbot.whatsappConfig);
        const newWhatsappConfig = this.safeParseConfig(updates.whatsappConfig);
        
        const mergedWhatsappConfig = {
          ...currentWhatsappConfig,
          ...newWhatsappConfig
        };

        chatbot.whatsappConfig = mergedWhatsappConfig;
        this.logger.log(`📱 Configuración WhatsApp procesada:`, mergedWhatsappConfig);
      }

      // Actualizar configuración de base de datos externa usando el helper seguro
      if (updates.externalDbConfig !== undefined) {
        const currentExternalDbConfig = this.safeParseConfig(chatbot.externalDbConfig) || { enabled: false };
        const newExternalDbConfig = this.safeParseConfig(updates.externalDbConfig);
        
        const mergedExternalDbConfig = {
          ...currentExternalDbConfig,
          ...newExternalDbConfig
        };

        chatbot.externalDbConfig = mergedExternalDbConfig;
        this.logger.log(`🗄️ Configuración BD Externa procesada:`, mergedExternalDbConfig);
      }

      // Actualizar otras configuraciones si están presentes usando el helper seguro
      if (updates.chatbotConfig) {
        const currentChatbotConfig = this.safeParseConfig(chatbot.chatbotConfig);
        const newChatbotConfig = this.safeParseConfig(updates.chatbotConfig);
        
        chatbot.chatbotConfig = {
          ...currentChatbotConfig,
          ...newChatbotConfig
        };
        this.logger.log(`⚙️ Configuración chatbot procesada`);
      }

      if (updates.notificationConfig) {
        const currentNotificationConfig = this.safeParseConfig(chatbot.notificationConfig);
        const newNotificationConfig = this.safeParseConfig(updates.notificationConfig);
        
        chatbot.notificationConfig = {
          ...currentNotificationConfig,
          ...newNotificationConfig
        };
        this.logger.log(`🔔 Configuración notificaciones procesada`);
      }

      // Actualizar timestamp
      chatbot.updatedAt = new Date();
      
      const updatedChatbot = await this.chatbotInstanceRepository.save(chatbot);
      this.logger.log(`✅ Chatbot actualizado exitosamente: ${updatedChatbot.name}`);
      
      return updatedChatbot;
    } catch (error) {
      this.logger.error(`❌ Error actualizando chatbot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Buscar chatbot por nombre de instancia de WhatsApp
   */
  async getChatbotConfigByInstance(instanceName: string): Promise<ChatbotInstance | null> {
    try {
      this.logger.log(`🔍 Buscando chatbot por instancia WhatsApp: ${instanceName}`);
      
      const chatbots = await this.chatbotInstanceRepository.find({
        where: { isActive: true },
        relations: ['organization']
      });

      const chatbot = chatbots.find(cb => {
        try {
          const whatsappConfig = this.safeParseConfig(cb.whatsappConfig);
          return whatsappConfig?.instanceName === instanceName;
        } catch (error) {
          this.logger.error(`Error parsing whatsappConfig for chatbot ${cb.id}: ${error.message}`);
          return false;
        }
      });

      if (chatbot) {
        this.logger.log(`✅ Chatbot encontrado: ${chatbot.name} (${chatbot.slug}) - Org: ${chatbot.organization.name}`);
      } else {
        this.logger.warn(`❌ No se encontró chatbot para instancia: ${instanceName}`);
        // Log debug de todas las instancias disponibles
        for (const cb of chatbots) {
          try {
            const whatsappConfig = this.safeParseConfig(cb.whatsappConfig);
            this.logger.debug(`- Chatbot ${cb.name}: instanceName=${whatsappConfig?.instanceName}`);
          } catch (error) {
            this.logger.debug(`- Chatbot ${cb.name}: Error parsing config`);
          }
        }
      }

      return chatbot || null;
    } catch (error) {
      this.logger.error(`Error buscando chatbot por instancia: ${error.message}`);
      return null;
    }
  }

  /**
   * Actualizar estadísticas de un chatbot
   */
  async updateChatbotStats(chatbotId: string, stats: {
    totalConversations?: number;
    totalMessages?: number;
    totalRevenue?: number;
  }): Promise<void> {
    try {
      await this.chatbotInstanceRepository.update(chatbotId, stats);
    } catch (error) {
      this.logger.error(`Error actualizando estadísticas: ${error.message}`);
    }
  }

  /**
   * Activar/Desactivar chatbot
   */
  async toggleChatbotStatus(id: string): Promise<ChatbotInstance> {
    try {
      const chatbot = await this.chatbotInstanceRepository.findOne({ where: { id } });
      
      if (!chatbot) {
        throw new NotFoundException(`Chatbot no encontrado: ${id}`);
      }

      chatbot.isActive = !chatbot.isActive;
      chatbot.status = chatbot.isActive ? 'active' : 'inactive';
      
      return await this.chatbotInstanceRepository.save(chatbot);
    } catch (error) {
      this.logger.error(`Error cambiando estado del chatbot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener chatbot por ID
   */
  async getChatbotById(id: string): Promise<ChatbotInstance> {
    try {
      const chatbot = await this.chatbotInstanceRepository.findOne({
        where: { id },
        relations: ['organization']
      });

      if (!chatbot) {
        throw new NotFoundException(`Chatbot no encontrado: ${id}`);
      }

      return chatbot;
    } catch (error) {
      this.logger.error(`Error obteniendo chatbot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Actualizar organización
   */
  async updateOrganization(id: string, updates: Partial<CreateOrganizationDto>): Promise<Organization> {
    try {
      const organization = await this.organizationRepository.findOne({ where: { id } });
      
      if (!organization) {
        throw new NotFoundException(`Organización no encontrada: ${id}`);
      }

      // Verificar si el slug ya existe (solo si se está actualizando)
      if (updates.slug && updates.slug !== organization.slug) {
        const existingOrg = await this.organizationRepository.findOne({
          where: { slug: updates.slug }
        });

        if (existingOrg) {
          throw new BadRequestException(`Ya existe una organización con el slug: ${updates.slug}`);
        }
      }

      // Aplicar actualizaciones
      Object.assign(organization, updates);
      
      const updatedOrganization = await this.organizationRepository.save(organization);
      this.logger.log(`✅ Organización actualizada: ${updatedOrganization.name} (${updatedOrganization.slug})`);
      
      return updatedOrganization;
    } catch (error) {
      this.logger.error(`Error actualizando organización: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener todos los chatbots con información de organización
   */
  async getAllChatbots(): Promise<ChatbotInstance[]> {
    try {
      const chatbots = await this.chatbotInstanceRepository.find({
        relations: ['organization'],
        order: { createdAt: 'DESC' }
      });

      this.logger.log(`📋 Se encontraron ${chatbots.length} chatbots en total`);
      return chatbots;
    } catch (error) {
      this.logger.error(`Error obteniendo todos los chatbots: ${error.message}`);
      return [];
    }
  }

  /**
   * Eliminar organización
   */
  async deleteOrganization(id: string): Promise<void> {
    try {
      const organization = await this.organizationRepository.findOne({
        where: { id },
        relations: ['chatbots']
      });

      if (!organization) {
        throw new NotFoundException(`Organización no encontrada: ${id}`);
      }

      // Eliminar todos los chatbots de la organización primero
      if (organization.chatbots && organization.chatbots.length > 0) {
        for (const chatbot of organization.chatbots) {
          await this.chatbotInstanceRepository.remove(chatbot);
          this.logger.log(`🗑️ Chatbot eliminado: ${chatbot.name}`);
        }
      }

      // Eliminar la organización
      await this.organizationRepository.remove(organization);
      this.logger.log(`✅ Organización eliminada: ${organization.name} (${organization.slug})`);
    } catch (error) {
      this.logger.error(`Error eliminando organización: ${error.message}`);
      throw error;
    }
  }

  /**
   * Eliminar chatbot
   */
  async deleteChatbot(id: string): Promise<void> {
    try {
      const chatbot = await this.chatbotInstanceRepository.findOne({
        where: { id },
        relations: ['organization']
      });

      if (!chatbot) {
        throw new NotFoundException(`Chatbot no encontrado: ${id}`);
      }

      await this.chatbotInstanceRepository.remove(chatbot);
      this.logger.log(`✅ Chatbot eliminado: ${chatbot.name} (${chatbot.slug})`);
    } catch (error) {
      this.logger.error(`Error eliminando chatbot: ${error.message}`);
      throw error;
    }
  }
} 