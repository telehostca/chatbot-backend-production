import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, MoreThanOrEqual, Between } from 'typeorm';
import { PersistentSession } from '../../chat/entities/persistent-session.entity';
import { ChatMessage } from '../../chat/entities/message.entity';
import { ChatbotInstance } from '../entities/chatbot-instance.entity';
import { Organization } from '../entities/organization.entity';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectRepository(PersistentSession, 'users')
    private sessionRepository: Repository<PersistentSession>,
    @InjectRepository(ChatMessage, 'users')
    private messageRepository: Repository<ChatMessage>,
    @InjectRepository(ChatbotInstance, 'users')
    private chatbotRepository: Repository<ChatbotInstance>,
    @InjectRepository(Organization, 'users')
    private organizationRepository: Repository<Organization>,
  ) {}

  async getSessions(options: {
    page: number;
    limit: number;
    chatbotId?: string;
    search?: string;
    status?: string;
  }) {
    try {
      this.logger.log(`📋 Obteniendo sesiones reales - Página: ${options.page}, Límite: ${options.limit}`);

      const { page, limit, chatbotId, search, status } = options;
      const skip = (page - 1) * limit;

      // Crear query builder para sesiones con relaciones
      const queryBuilder = this.sessionRepository
        .createQueryBuilder('session')
        .leftJoin('session.messages', 'messages')
        .addSelect([
          'messages.id',
          'messages.content', 
          'messages.sender', 
          'messages.timestamp'
        ])
        .orderBy('session.lastActivity', 'DESC');

      // Aplicar filtros
      if (chatbotId) {
        queryBuilder.andWhere('session.activeChatbotId = :chatbotId', { chatbotId });
      }

      if (status) {
        queryBuilder.andWhere('session.status = :status', { status });
      }

      if (search) {
        queryBuilder.andWhere(
          '(session.phoneNumber LIKE :search OR session.clientName LIKE :search OR session.clientId LIKE :search OR session.clientPushname LIKE :search)',
          { search: `%${search}%` }
        );
      }

      // Obtener sesiones con paginación
      const [sessions, total] = await queryBuilder
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      this.logger.log(`✅ Encontradas ${sessions.length} sesiones de ${total} totales`);

      // Obtener información de chatbots y organizaciones
      const chatbots = await this.chatbotRepository.find({
        relations: ['organization']
      });

      const chatbotMap = new Map();
      chatbots.forEach(chatbot => {
        chatbotMap.set(chatbot.id, {
          name: chatbot.name,
          organizationName: chatbot.organization?.name || 'Sin organización'
        });
      });

      // Formatear sesiones con información completa
      const formattedSessions = sessions.map(session => {
        const lastMessage = session.messages && session.messages.length > 0
          ? session.messages
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
          : null;

        // Obtener información del chatbot
        const chatbotInfo = chatbotMap.get(session.activeChatbotId) || {
          name: 'ChatBot General',
          organizationName: 'Sistema'
        };

        return {
          id: session.id,
          phoneNumber: session.phoneNumber,
          clientName: session.clientName || session.clientPushname || 'Cliente Anónimo',
          clientId: session.clientId,
          status: session.status,
          chatbotName: chatbotInfo.name,
          organizationName: chatbotInfo.organizationName,
          lastMessage: session.lastUserMessage || lastMessage?.content || 'Sin mensajes',
          lastMessageAt: session.lastActivity || lastMessage?.timestamp,
          messageCount: session.messageCount || 0,
          searchCount: session.searchCount || 0,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          duration: this.calculateSessionDuration(session.createdAt, session.lastActivity),
          isAuthenticated: session.isAuthenticated,
          context: session.context,
          isNewClient: session.isNewClient
        };
      });

      return {
        data: formattedSessions,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      };

    } catch (error) {
      this.logger.error(`❌ Error obteniendo sesiones: ${error.message}`);
      return {
        data: [],
        meta: {
          total: 0,
          page: options.page,
          limit: options.limit,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      };
    }
  }

  async getSessionMessages(sessionId: string) {
    try {
      this.logger.log(`📨 Obteniendo mensajes para sesión: ${sessionId}`);

      const session = await this.sessionRepository.findOne({
        where: { id: sessionId },
        relations: ['messages']
      });

      if (!session) {
        throw new Error('Sesión no encontrada');
      }

      // Ordenar mensajes por timestamp
      const messages = session.messages
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map(message => ({
          id: message.id,
          content: message.content,
          sender: message.sender,
          timestamp: message.timestamp,
          createdAt: message.createdAt
        }));

      this.logger.log(`✅ Obtenidos ${messages.length} mensajes para sesión ${sessionId}`);
      return messages;

    } catch (error) {
      this.logger.error(`❌ Error obteniendo mensajes de sesión: ${error.message}`);
      throw error;
    }
  }

  async sendMessageToSession(sessionId: string, message: string) {
    try {
      this.logger.log(`📤 Enviando mensaje a sesión: ${sessionId}`);

      const session = await this.sessionRepository.findOne({
        where: { id: sessionId }
      });

      if (!session) {
        throw new Error('Sesión no encontrada');
      }

      // Crear nuevo mensaje
      const newMessage = this.messageRepository.create({
        content: message,
        sender: 'admin',
        timestamp: new Date(),
        session: session,
        createdAt: new Date()
      });

      const savedMessage = await this.messageRepository.save(newMessage);

      // Actualizar la sesión
      await this.sessionRepository.update(sessionId, {
        lastActivity: new Date(),
        messageCount: session.messageCount + 1,
        lastBotResponse: message
      });

      this.logger.log(`✅ Mensaje enviado exitosamente a sesión ${sessionId}`);

      return {
        messageId: savedMessage.id,
        timestamp: savedMessage.timestamp,
        status: 'sent'
      };

    } catch (error) {
      this.logger.error(`❌ Error enviando mensaje a sesión: ${error.message}`);
      throw error;
    }
  }

  async getSessionStats() {
    try {
      this.logger.log('📊 Obteniendo estadísticas de sesiones');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalSessions,
        activeSessions,
        authenticatedSessions,
        todaySessions,
        totalMessages
      ] = await Promise.all([
        this.sessionRepository.count(),
        this.sessionRepository.count({ where: { status: 'active' } }),
        this.sessionRepository.count({ where: { isAuthenticated: true } }),
        this.sessionRepository.count({ where: { createdAt: MoreThanOrEqual(today) } }),
        this.messageRepository.count()
      ]);

      const stats = {
        totalSessions,
        activeSessions,
        authenticatedSessions,
        todaySessions,
        totalMessages,
        averageMessagesPerSession: totalSessions > 0 ? Math.round(totalMessages / totalSessions) : 0
      };

      this.logger.log(`✅ Estadísticas obtenidas: ${JSON.stringify(stats)}`);
      return stats;

    } catch (error) {
      this.logger.error(`❌ Error obteniendo estadísticas: ${error.message}`);
      throw error;
    }
  }

  private calculateSessionDuration(startTime: Date, endTime: Date): string {
    if (!startTime || !endTime) return 'N/A';
    
    const diffMs = new Date(endTime).getTime() - new Date(startTime).getTime();
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }
} 