/**
 * Servicio para manejar las interacciones de chat con IA.
 * Este servicio gestiona las sesiones de chat, procesa mensajes y genera
 * respuestas utilizando modelos de IA.
 * 
 * @class ChatService
 */
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/message.entity';
import { PersistentSession } from './entities/persistent-session.entity';
import { SearchHistory } from './entities/search-history.entity';
import { ShoppingCart } from './entities/shopping-cart.entity';
import { AiService } from '../ai/ai.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { ConfigService } from '@nestjs/config';
import { Chatbot } from '../admin/entities/chatbot.entity';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly defaultInstanceId: string;

  constructor(
    @InjectRepository(ChatSession, 'users')
    private chatSessionRepository: Repository<ChatSession>,
    @InjectRepository(ChatMessage, 'users')
    private messageRepository: Repository<ChatMessage>,
    @InjectRepository(PersistentSession, 'users')
    private sessionRepository: Repository<PersistentSession>,
    @InjectRepository(SearchHistory, 'users')
    private searchHistoryRepository: Repository<SearchHistory>,
    @InjectRepository(ShoppingCart, 'users')
    private shoppingCartRepository: Repository<ShoppingCart>,
    @InjectRepository(Chatbot, 'users')
    private chatbotRepository: Repository<Chatbot>,
    private aiService: AiService,
    @Inject(forwardRef(() => WhatsappService))
    private whatsappService: WhatsappService,
    private configService: ConfigService
  ) {
    this.defaultInstanceId = this.configService.get<string>('WHATSAPP_DEFAULT_INSTANCE');
  }

  /**
   * Procesa un mensaje entrante y genera una respuesta.
   * Este método maneja todo el flujo de chat, incluyendo:
   * - Validación del chatbot
   * - Preparación de datos para el procesamiento
   * - Envío de respuesta por WhatsApp
   * 
   * @param {string} phoneNumber - Número de teléfono del usuario
   * @param {string} message - Contenido del mensaje
   * @param {string} chatbotId - ID del chatbot
   * @param {Function} messageProcessor - Función para procesar el mensaje
   * @returns {Promise<string>} Respuesta generada
   * @throws {Error} Si hay un error en el procesamiento
   */
  async handleMessage(phoneNumber: string, message: string, chatbotId: string, messageProcessor?: Function) {
    try {
      // Verificar que el chatbot existe
      const chatbot = await this.chatbotRepository.findOne({
        where: { id: chatbotId, isActive: true }
      });

      if (!chatbot) {
        this.logger.error(`Chatbot no encontrado o inactivo: ${chatbotId}`);
        return "Error: Chatbot no encontrado o inactivo";
      }

      let response: string;

      // Si se proporciona un procesador de mensajes personalizado, usarlo
      if (messageProcessor && typeof messageProcessor === 'function') {
        response = await messageProcessor(message, phoneNumber, chatbotId);
      } else {
        // Respuesta por defecto si no hay procesador
        response = "🤖 Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte?";
      }

      // Verificar la configuración de WhatsApp del chatbot
      if (!chatbot.settings?.whatsapp?.instanceId) {
        this.logger.error(`No hay instanceId configurado para el chatbot ${chatbotId}`);
        throw new Error('No hay ID de instancia configurado para este chatbot');
      }

      // Enviar respuesta usando el servicio de WhatsApp
      await this.whatsappService.sendMessage(
        phoneNumber,
        response,
        chatbotId
      );

      return response;
    } catch (error) {
      this.logger.error(`Error procesando mensaje: ${error.message}`);
      return `Error procesando su mensaje: ${error.message}`;
    }
  }

  /**
   * Procesa un mensaje para un chatbot específico
   * 
   * @param {string} message - Mensaje del usuario
   * @param {string} from - Número de teléfono del usuario
   * @param {string} chatbotId - ID del chatbot
   * @returns {Promise<string>} Respuesta generada
   */


  /**
   * Procesa un mensaje para un chatbot específico
   * 
   * @param {string} message - Mensaje del usuario
   * @param {string} from - Número de teléfono del usuario
   * @param {string} chatbotId - ID del chatbot
   * @returns {Promise<string>} Respuesta generada
   */
  async processMessage(message: string, from: string, chatbotId: string): Promise<string> {
    try {
      this.logger.log(`🔄 Procesando mensaje para chatbot ${chatbotId}: ${message}`);
      
      // Por ahora, respuesta básica
      return `Mensaje recibido: "${message}". Estamos procesando tu consulta.`;
    } catch (error) {
      this.logger.error(`Error procesando mensaje: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene un chatbot por su ID.
   * 
   * @param {string} chatbotId - ID del chatbot
   * @returns {Promise<Chatbot>} Información del chatbot
   * @throws {Error} Si hay un error al obtener el chatbot
   */
  async getChatbotById(chatbotId: string) {
    try {
      return await this.chatbotRepository.findOne({
        where: { id: chatbotId, isActive: true }
      });
    } catch (error) {
      this.logger.error(`Error obteniendo chatbot: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtiene el historial de chat para un número de teléfono.
   * 
   * @param {string} phoneNumber - Número de teléfono del usuario
   * @returns {Promise<ChatSession>} Sesión de chat con mensajes
   * @throws {Error} Si hay un error al obtener el historial
   */
  async getChatHistory(phoneNumber: string) {
    try {
      return await this.chatSessionRepository.findOne({
        where: { phoneNumber },
        relations: ['messages'],
        order: {
          messages: {
            timestamp: 'ASC',
          },
        },
      });
    } catch (error) {
      this.logger.error(`Error obteniendo historial de chat: ${error.message}`);
      throw error;
    }
  }

  /**
   * Finaliza una sesión de chat activa.
   * 
   * @param {string} phoneNumber - Número de teléfono del usuario
   * @returns {Promise<void>}
   * @throws {Error} Si hay un error al finalizar la sesión
   */
  async endChatSession(phoneNumber: string) {
    try {
      const session = await this.chatSessionRepository.findOne({
        where: { phoneNumber, status: 'active' },
      });

      if (session) {
        session.status = 'ended';
        session.endTime = new Date();
        await this.chatSessionRepository.save(session);
      }
    } catch (error) {
      this.logger.error(`Error finalizando sesión de chat: ${error.message}`);
      throw error;
    }
  }

  // Métodos para PersistentSession
  async findSession(phoneNumber: string, status: string): Promise<PersistentSession | null> {
    return await this.sessionRepository.findOne({
      where: { phoneNumber, status },
      relations: ['searchHistory', 'shoppingCart']
    });
  }

  async findSessionByPhoneOnly(phoneNumber: string): Promise<PersistentSession | null> {
    return await this.sessionRepository.findOne({
      where: { phoneNumber },
      relations: ['searchHistory', 'shoppingCart']
    });
  }

  createSession(phoneNumber: string, chatbotId: string, status: string): PersistentSession {
    return this.sessionRepository.create({
      phoneNumber,
      activeChatbotId: chatbotId,
      status,
      lastActivity: new Date(),
      metadata: { userAgent: 'WhatsApp', platform: 'web' }
    });
  }

  async saveSession(session: PersistentSession): Promise<PersistentSession> {
    return await this.sessionRepository.save(session);
  }

  // Métodos para ChatMessage
  async saveMessage(session: PersistentSession, content: string, sender: string): Promise<ChatMessage> {
    const message = this.messageRepository.create({
      session,
      content,
      sender,
      timestamp: new Date()
    });
    return await this.messageRepository.save(message);
  }

  // Métodos para SearchHistory
  async saveSearchHistory(session: PersistentSession, originalTerm: string, normalizedTerm: string, resultsCount: number, chatbotId: string): Promise<SearchHistory> {
    const searchHistory = this.searchHistoryRepository.create({
      phoneNumber: session.phoneNumber,
      searchTerm: normalizedTerm,
      originalSearchTerm: originalTerm,
      resultsCount,
      hasResults: resultsCount > 0,
      sessionContext: session.context,
      chatbotId,
      session
    });
    return await this.searchHistoryRepository.save(searchHistory);
  }

  async findRecentSearches(phoneNumber: string, limit: number = 5): Promise<SearchHistory[]> {
    return await this.searchHistoryRepository.find({
      where: { phoneNumber },
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  async findSimilarSearchSuggestions(phoneNumber: string, searchTerm: string, limit: number = 3): Promise<any[]> {
    return await this.searchHistoryRepository
      .createQueryBuilder('search')
      .select('search.originalSearchTerm', 'term')
      .addSelect('search.createdAt', 'createdAt')
      .where('search.phoneNumber = :phoneNumber', { phoneNumber })
      .andWhere('search.hasResults = true')
      .andWhere('search.originalSearchTerm ILIKE :pattern', { pattern: `%${searchTerm.split(' ')[0]}%` })
      .groupBy('search.originalSearchTerm, search.createdAt')
      .orderBy('search.createdAt', 'DESC')
      .limit(limit)
      .getRawMany();
  }

  // Métodos para ShoppingCart
  async findActiveCartItems(phoneNumber: string): Promise<ShoppingCart[]> {
    return await this.shoppingCartRepository.find({
      where: { phoneNumber, status: 'active' },
      order: { createdAt: 'DESC' }
    });
  }

  async addToCart(session: PersistentSession, product: any, quantity: number = 1, chatbotId: string): Promise<ShoppingCart> {
    // Verificar si el producto ya está en el carrito
    const existingItem = await this.shoppingCartRepository.findOne({
      where: { 
        phoneNumber: session.phoneNumber, 
        productCode: product.codigo, 
        status: 'active' 
      }
    });

    if (existingItem) {
      // Si ya existe, actualizar cantidad
      existingItem.quantity += quantity;
      return await this.shoppingCartRepository.save(existingItem);
    } else {
      // Si no existe, crear nuevo item
      const cartItem = this.shoppingCartRepository.create({
        phoneNumber: session.phoneNumber,
        productCode: product.codigo,
        productName: product.nombre,
        unitPriceUsd: parseFloat(product?.preciounidad || 0),
        ivaTax: parseFloat(product?.alicuotaiva || 0),
        quantity: quantity,
        exchangeRate: parseFloat(product?.tasa_actual || 1),
        status: 'active',
        chatbotId: chatbotId,
        sessionId: session.id,
        metadata: {
          addedAt: new Date(),
          searchContext: session.context
        }
      });
      return await this.shoppingCartRepository.save(cartItem);
    }
  }

  async updateCartItemQuantity(phoneNumber: string, productCode: string, quantity: number): Promise<ShoppingCart | null> {
    const cartItem = await this.shoppingCartRepository.findOne({
      where: { phoneNumber, productCode, status: 'active' }
    });

    if (cartItem) {
      if (quantity <= 0) {
        await this.shoppingCartRepository.remove(cartItem);
        return null;
      } else {
        cartItem.quantity = quantity;
        return await this.shoppingCartRepository.save(cartItem);
      }
    }
    return null;
  }

  async removeFromCart(phoneNumber: string, productCode: string): Promise<boolean> {
    const cartItem = await this.shoppingCartRepository.findOne({
      where: { phoneNumber, productCode, status: 'active' }
    });

    if (cartItem) {
      await this.shoppingCartRepository.remove(cartItem);
      return true;
    }
    return false;
  }

  async clearCart(phoneNumber: string): Promise<number> {
    const result = await this.shoppingCartRepository.update(
      { phoneNumber, status: 'active' },
      { status: 'cleared' }
    );
    return result.affected || 0;
  }

  async getCartTotal(phoneNumber: string): Promise<{ totalUsd: number, totalBs: number, itemCount: number }> {
    const cartItems = await this.findActiveCartItems(phoneNumber);
    
    let totalUsd = 0;
    let totalBs = 0;
    let itemCount = 0;

    cartItems.forEach(item => {
      const itemSubtotal = item.unitPriceUsd * item.quantity;
      const itemWithIva = itemSubtotal * (1 + (item.ivaTax / 100));
      const itemBs = itemWithIva * (item.exchangeRate || 1);
      
      totalUsd += itemWithIva;
      totalBs += itemBs;
      itemCount += item.quantity;
    });

    return {
      totalUsd: Math.round(totalUsd * 100) / 100,
      totalBs: Math.round(totalBs * 100) / 100,
      itemCount
    };
  }

  // Métodos de limpieza
  async cleanInactiveSessions(cutoffDate: Date): Promise<any> {
    return await this.sessionRepository
      .createQueryBuilder()
      .delete()
      .where('lastActivity < :cutoffDate', { cutoffDate })
      .execute();
  }

  /**
   * Obtiene las sesiones de chat con paginación y filtros
   * 
   * @param {Object} options - Opciones de filtrado y paginación
   * @returns {Promise<Object>} Sesiones paginadas con metadata
   */
  async getSessions(options: {
    page: number;
    limit: number;
    chatbotId?: string;
    search?: string;
    status?: string;
  }) {
    try {
      const { page, limit, chatbotId, search, status } = options;
      const skip = (page - 1) * limit;

      // Verificar si la tabla existe antes de hacer la consulta
      try {
        const queryBuilder = this.sessionRepository
          .createQueryBuilder('session')
          .leftJoin('session.messages', 'messages')
          .addSelect(['messages.content', 'messages.sender', 'messages.timestamp'])
          .orderBy('session.lastActivity', 'DESC');

        // Filtrar por chatbot si se especifica
        if (chatbotId) {
          queryBuilder.andWhere('session.activeChatbotId = :chatbotId', { chatbotId });
        }

        // Filtrar por estado si se especifica
        if (status) {
          queryBuilder.andWhere('session.status = :status', { status });
        }

        // Búsqueda por nombre de cliente o número de teléfono
        if (search) {
          queryBuilder.andWhere(
            '(session.phoneNumber LIKE :search OR session.clientName LIKE :search OR session.clientId LIKE :search)',
            { search: `%${search}%` }
          );
        }

        const [sessions, total] = await queryBuilder
          .skip(skip)
          .take(limit)
          .getManyAndCount();

        // Formatear las sesiones para el frontend
        const formattedSessions = sessions.map(session => {
          const lastMessage = session.messages && session.messages.length > 0 
            ? session.messages[session.messages.length - 1] 
            : null;

          return {
            id: session.id,
            phoneNumber: session.phoneNumber,
            clientName: session.clientName,
            clientId: session.clientId,
            status: session.status,
            chatbotName: 'Chatbot', // TODO: Obtener nombre real del chatbot
            organizationName: 'Organización', // TODO: Obtener organización real
            lastMessage: lastMessage?.content,
            lastMessageAt: lastMessage?.timestamp,
            messageCount: session.messages?.length || 0,
            searchCount: session.searchCount || 0,
            createdAt: session.createdAt,
            duration: this.calculateSessionDuration(session.createdAt, session.lastActivity)
          };
        });

        return {
          data: formattedSessions,
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
          }
        };
      } catch (dbError) {
        // Si hay error de base de datos, devolver datos vacíos
        this.logger.warn(`Tabla persistent_sessions no disponible: ${dbError.message}`);
        return {
          data: [],
          meta: {
            total: 0,
            page,
            limit,
            totalPages: 0
          }
        };
      }
    } catch (error) {
      this.logger.error(`Error obteniendo sesiones: ${error.message}`);
      // Devolver estructura válida en caso de error
      return {
        data: [],
        meta: {
          total: 0,
          page: options.page,
          limit: options.limit,
          totalPages: 0
        }
      };
    }
  }

  /**
   * Obtiene los mensajes de una sesión específica
   * 
   * @param {string} sessionId - ID de la sesión
   * @returns {Promise<ChatMessage[]>} Mensajes de la sesión
   */
  async getSessionMessages(sessionId: string) {
    try {
      const session = await this.sessionRepository.findOne({
        where: { id: sessionId },
        relations: ['messages']
      });

      if (!session) {
        throw new Error('Sesión no encontrada');
      }

      return session.messages.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } catch (error) {
      this.logger.error(`Error obteniendo mensajes de sesión: ${error.message}`);
      throw error;
    }
  }

  /**
   * Envía un mensaje a una sesión específica
   * 
   * @param {string} sessionId - ID de la sesión
   * @param {string} message - Mensaje a enviar
   * @returns {Promise<Object>} Resultado del envío
   */
  async sendMessageToSession(sessionId: string, message: string) {
    try {
      const session = await this.sessionRepository.findOne({
        where: { id: sessionId }
      });

      if (!session) {
        throw new Error('Sesión no encontrada');
      }

      // Determinar el chatbotId a usar
      let chatbotId = session.activeChatbotId;
      
      // Si no tiene chatbot asignado, buscar el primer chatbot activo disponible
      if (!chatbotId) {
        const firstChatbot = await this.chatbotRepository.findOne({
          where: { isActive: true }
        });
        
        if (!firstChatbot) {
          throw new Error('No hay chatbots activos disponibles');
        }
        
        chatbotId = firstChatbot.id;
        this.logger.log(`Usando chatbot por defecto: ${chatbotId} para sesión ${sessionId}`);
      }

      // Enviar mensaje usando WhatsApp
      await this.whatsappService.sendMessage(
        session.phoneNumber,
        message,
        chatbotId
      );

      // Guardar el mensaje en la base de datos
      const savedMessage = await this.saveMessage(session, message, 'admin');

      return {
        messageId: savedMessage.id,
        timestamp: savedMessage.timestamp,
        status: 'sent'
      };
    } catch (error) {
      this.logger.error(`Error enviando mensaje a sesión: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calcula la duración de una sesión
   * 
   * @param {Date} startTime - Tiempo de inicio
   * @param {Date} endTime - Tiempo de fin
   * @returns {string} Duración formateada
   */
  private calculateSessionDuration(startTime: Date, endTime: Date): string {
    if (!startTime || !endTime) return 'N/A';
    
    const diffMs = new Date(endTime).getTime() - new Date(startTime).getTime();
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }
} 