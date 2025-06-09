import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersistentSession } from '../../chat/entities/persistent-session.entity';
import { ChatbotInstance } from '../../admin/entities/chatbot-instance.entity';

export interface ContactFilter {
  chatbotIds?: string[];
  status?: string[];
  lastActivityDays?: number;
  messageCountMin?: number;
  messageCountMax?: number;
  isAuthenticated?: boolean;
  isNewClient?: boolean;
  searchString?: string;
  phoneNumbers?: string[];
  clientNames?: string[];
  excludePhoneNumbers?: string[];
}

export interface ContactInfo {
  id: string;
  phoneNumber: string;
  clientName?: string;
  clientPushname?: string;
  isAuthenticated: boolean;
  isNewClient: boolean;
  status: string;
  lastActivity?: Date;
  messageCount: number;
  activeChatbotId?: string;
  chatbotName?: string;
}

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(
    @InjectRepository(PersistentSession, 'users')
    private sessionRepository: Repository<PersistentSession>,
    @InjectRepository(ChatbotInstance, 'users')
    private chatbotRepository: Repository<ChatbotInstance>,
  ) {}

  /**
   * Obtener contactos con filtros avanzados
   */
  async getFilteredContacts(filters: ContactFilter = {}): Promise<ContactInfo[]> {
    try {
      const queryBuilder = this.sessionRepository
        .createQueryBuilder('session');

      // Filtro por chatbots específicos
      if (filters.chatbotIds && filters.chatbotIds.length > 0) {
        queryBuilder.andWhere('session.activeChatbotId IN (:...chatbotIds)', {
          chatbotIds: filters.chatbotIds
        });
      }

      // Filtro por estado de sesión
      if (filters.status && filters.status.length > 0) {
        queryBuilder.andWhere('session.status IN (:...statuses)', {
          statuses: filters.status
        });
      }

      // Filtro por actividad reciente (días)
      if (filters.lastActivityDays !== undefined) {
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - filters.lastActivityDays);
        queryBuilder.andWhere('session.lastActivity >= :daysAgo', { daysAgo });
      }

      // Filtro por rango de mensajes
      if (filters.messageCountMin !== undefined) {
        queryBuilder.andWhere('session.messageCount >= :minMessages', {
          minMessages: filters.messageCountMin
        });
      }
      if (filters.messageCountMax !== undefined) {
        queryBuilder.andWhere('session.messageCount <= :maxMessages', {
          maxMessages: filters.messageCountMax
        });
      }

      // Filtro por autenticación
      if (filters.isAuthenticated !== undefined) {
        queryBuilder.andWhere('session.isAuthenticated = :isAuthenticated', {
          isAuthenticated: filters.isAuthenticated
        });
      }

      // Filtro por cliente nuevo
      if (filters.isNewClient !== undefined) {
        queryBuilder.andWhere('session.isNewClient = :isNewClient', {
          isNewClient: filters.isNewClient
        });
      }

      // Búsqueda por texto (nombre o teléfono)
      if (filters.searchString) {
        queryBuilder.andWhere(
          '(session.clientName ILIKE :searchString OR session.phoneNumber ILIKE :searchString OR session.clientPushname ILIKE :searchString)',
          { searchString: `%${filters.searchString}%` }
        );
      }

      // Incluir teléfonos específicos
      if (filters.phoneNumbers && filters.phoneNumbers.length > 0) {
        queryBuilder.andWhere('session.phoneNumber IN (:...phoneNumbers)', {
          phoneNumbers: filters.phoneNumbers
        });
      }

      // Incluir nombres específicos
      if (filters.clientNames && filters.clientNames.length > 0) {
        queryBuilder.andWhere('session.clientName IN (:...clientNames)', {
          clientNames: filters.clientNames
        });
      }

      // Excluir teléfonos específicos
      if (filters.excludePhoneNumbers && filters.excludePhoneNumbers.length > 0) {
        queryBuilder.andWhere('session.phoneNumber NOT IN (:...excludePhoneNumbers)', {
          excludePhoneNumbers: filters.excludePhoneNumbers
        });
      }

      // Ordenar por última actividad (más reciente primero)
      queryBuilder.orderBy('session.lastActivity', 'DESC');

      const sessions = await queryBuilder.getMany();

      // Obtener información de chatbots por separado
      const chatbotIds = [...new Set(sessions.map(s => s.activeChatbotId).filter(Boolean))];
      const chatbots = await this.chatbotRepository.findByIds(chatbotIds);
      const chatbotMap = new Map(chatbots.map(c => [c.id, c]));

      const contacts: ContactInfo[] = sessions.map(session => ({
        id: session.id,
        phoneNumber: session.phoneNumber,
        clientName: session.clientName,
        clientPushname: session.clientPushname,
        isAuthenticated: session.isAuthenticated,
        isNewClient: session.isNewClient,
        status: session.status,
        lastActivity: session.lastActivity,
        messageCount: session.messageCount,
        activeChatbotId: session.activeChatbotId,
        chatbotName: session.activeChatbotId ? 
          (chatbotMap.get(session.activeChatbotId)?.name || 'Chatbot no encontrado') : 
          'Sin asignar'
      }));

      this.logger.log(`📋 Se encontraron ${contacts.length} contactos con los filtros aplicados`);
      return contacts;

    } catch (error) {
      this.logger.error('❌ Error obteniendo contactos filtrados:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de contactos
   */
  async getContactStats(): Promise<{
    total: number;
    active: number;
    authenticated: number;
    newClients: number;
    recentActivity: number;
  }> {
    try {
      const totalQuery = this.sessionRepository.count();
      const activeQuery = this.sessionRepository.count({ where: { status: 'active' } });
      const authenticatedQuery = this.sessionRepository.count({ where: { isAuthenticated: true } });
      const newClientsQuery = this.sessionRepository.count({ where: { isNewClient: true } });
      
      // Actividad reciente (últimos 7 días)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentActivityQuery = this.sessionRepository
        .createQueryBuilder('session')
        .where('session.lastActivity >= :weekAgo', { weekAgo })
        .getCount();

      const [total, active, authenticated, newClients, recentActivity] = await Promise.all([
        totalQuery,
        activeQuery,
        authenticatedQuery,
        newClientsQuery,
        recentActivityQuery
      ]);

      return {
        total,
        active,
        authenticated,
        newClients,
        recentActivity
      };

    } catch (error) {
      this.logger.error('❌ Error obteniendo estadísticas de contactos:', error);
      throw error;
    }
  }

  /**
   * Obtener filtros de audiencia predefinidos
   */
  getAudienceFilters(): { [key: string]: ContactFilter } {
    return {
      'all': {
        // Sin filtros - todos los contactos
      },
      'active_users': {
        status: ['active'],
        lastActivityDays: 30
      },
      'recent_buyers': {
        isAuthenticated: true,
        messageCountMin: 5,
        lastActivityDays: 15
      },
      'new_users': {
        isNewClient: true,
        lastActivityDays: 7
      },
      'inactive_users': {
        status: ['active'],
        lastActivityDays: 90,
        messageCountMin: 1
      },
      'cart_abandoners': {
        messageCountMin: 3,
        messageCountMax: 10,
        lastActivityDays: 3
      },
      'vip_clients': {
        isAuthenticated: true,
        messageCountMin: 20
      },
      'all_active': {
        status: ['active']
      }
    };
  }

  /**
   * Aplicar filtro de audiencia predefinido
   */
  async getContactsByAudience(audienceType: string, chatbotIds?: string[]): Promise<ContactInfo[]> {
    const audienceFilters = this.getAudienceFilters();
    let filter = audienceFilters[audienceType] || audienceFilters['all'];

    // Agregar filtro de chatbots si se especifica
    if (chatbotIds && chatbotIds.length > 0) {
      filter = { ...filter, chatbotIds };
    }

    return await this.getFilteredContacts(filter);
  }

  /**
   * Validar números de teléfono
   */
  validatePhoneNumbers(phoneNumbers: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = [];
    const invalid: string[] = [];

    const phoneRegex = /^(\+?[1-9]\d{1,14})$/; // Formato internacional básico

    phoneNumbers.forEach(phone => {
      const cleanPhone = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
      if (phoneRegex.test(cleanPhone) && cleanPhone.length >= 10) {
        valid.push(cleanPhone);
      } else {
        invalid.push(phone);
      }
    });

    return { valid, invalid };
  }

  /**
   * Obtener contactos por lista de teléfonos
   */
  async getContactsByPhoneNumbers(phoneNumbers: string[]): Promise<ContactInfo[]> {
    if (!phoneNumbers || phoneNumbers.length === 0) {
      return [];
    }

    const { valid } = this.validatePhoneNumbers(phoneNumbers);
    
    if (valid.length === 0) {
      return [];
    }

    return await this.getFilteredContacts({
      phoneNumbers: valid
    });
  }
} 