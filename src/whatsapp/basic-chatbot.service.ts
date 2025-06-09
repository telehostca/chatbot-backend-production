import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersistentSession } from '../chat/entities/persistent-session.entity';
import { ChatMessage } from '../chat/entities/message.entity';
import { ChatService } from '../chat/chat.service';

@Injectable()
export class BasicChatbotService {
  private readonly logger = new Logger(BasicChatbotService.name);

  constructor(
    @InjectRepository(PersistentSession, 'users')
    private persistentSessionRepository: Repository<PersistentSession>,
    @InjectRepository(ChatMessage, 'users')
    private chatMessageRepository: Repository<ChatMessage>,
    private chatService: ChatService
  ) {}

  /**
   * Procesa un mensaje con respuestas básicas predefinidas
   */
  async handleMessage(message: string, phoneNumber: string, chatbot: any): Promise<string> {
    try {
      this.logger.log(`🤖 BasicChatbotService procesando: ${message}`);
      
      // Obtener o crear sesión persistente
      let session = await this.getOrCreateSession(phoneNumber, chatbot.id);
      
      // Incrementar contador de mensajes
      session.messageCount = (session.messageCount || 0) + 1;
      session.lastUserMessage = message;
      session.lastActivity = new Date();
      
      // Generar respuesta según el contexto
      let response: string;
      
      const config = chatbot?.chatbotConfig || {};
      const prompts = config.customPrompts || {};
      const lowerText = message.toLowerCase();
      
      // Detectar intenciones básicas
      if (this.isGreeting(lowerText)) {
        response = prompts.welcome || this.getDefaultWelcomeMessage(chatbot);
        session.context = 'welcomed';
      } else if (this.isHelpRequest(lowerText)) {
        response = prompts.help || this.getDefaultHelpMessage(chatbot);
        session.context = 'help_provided';
      } else if (this.isLocationRequest(lowerText)) {
        response = prompts.location || this.getDefaultLocationMessage(chatbot);
        session.context = 'location_provided';
      } else if (this.isHoursRequest(lowerText)) {
        response = prompts.hours || this.getDefaultHoursMessage(chatbot);
        session.context = 'hours_provided';
      } else if (this.isContactRequest(lowerText)) {
        response = prompts.contact || this.getDefaultContactMessage(chatbot);
        session.context = 'contact_provided';
      } else {
        response = prompts.unknown || this.getDefaultUnknownMessage(chatbot);
        session.context = 'unknown_request';
      }
      
      // Guardar respuesta en la sesión
      session.lastBotResponse = response;
      await this.persistentSessionRepository.save(session);
      
      // Guardar mensajes en el historial usando ChatService
      await this.saveMessageToHistory(session, message, 'user');
      await this.saveMessageToHistory(session, response, 'assistant');
      
      this.logger.log(`✅ BasicChatbotService generó respuesta: ${response.substring(0, 100)}...`);
      return response;
      
    } catch (error) {
      this.logger.error(`❌ Error en BasicChatbotService: ${error.message}`);
      return this.getErrorResponse(chatbot);
    }
  }

  private async getOrCreateSession(phoneNumber: string, chatbotId: string): Promise<PersistentSession> {
    // Normalizar número de teléfono
    const normalizedPhone = phoneNumber.replace('@s.whatsapp.net', '').replace('+', '');
    
    // Buscar sesión existente
    let session = await this.persistentSessionRepository.findOne({
      where: { 
        phoneNumber: normalizedPhone, 
        activeChatbotId: chatbotId,
        status: 'active' 
      }
    });
    
    if (!session) {
      // Crear nueva sesión para chatbot básico
      session = this.persistentSessionRepository.create({
        phoneNumber: normalizedPhone,
        activeChatbotId: chatbotId,
        isAuthenticated: false,
        isNewClient: false, // Los chatbots básicos no manejan clientes
        context: 'new_session',
        status: 'active',
        messageCount: 0,
        searchCount: 0,
        lastActivity: new Date(),
        metadata: {
          chatbotType: 'basic',
          serviceName: 'BasicChatbotService'
        }
      });
      
      this.logger.log(`🆕 Nueva sesión básica creada para ${normalizedPhone}`);
    }
    
    return session;
  }

  private async saveMessageToHistory(session: any, content: string, sender: 'user' | 'assistant'): Promise<void> {
    try {
      const message = this.chatMessageRepository.create({
        content,
        sender,
        timestamp: new Date(),
        session
      });
      
      await this.chatMessageRepository.save(message);
      this.logger.log(`💾 Mensaje guardado: ${content.substring(0, 50)}...`);
    } catch (error) {
      this.logger.error(`❌ Error guardando mensaje en historial: ${error.message}`);
    }
  }

  // Detectores de intención
  private isGreeting(text: string): boolean {
    const greetings = ['hola', 'buenos', 'buenas', 'hi', 'hello', 'saludos', 'buen día'];
    return greetings.some(greeting => text.includes(greeting));
  }

  private isHelpRequest(text: string): boolean {
    const helpKeywords = ['ayuda', 'help', 'asistencia', 'información', 'info', 'que puedes hacer'];
    return helpKeywords.some(keyword => text.includes(keyword));
  }

  private isLocationRequest(text: string): boolean {
    const locationKeywords = ['ubicación', 'dirección', 'donde', 'ubicacion', 'address', 'location'];
    return locationKeywords.some(keyword => text.includes(keyword));
  }

  private isHoursRequest(text: string): boolean {
    const hoursKeywords = ['horario', 'hora', 'abren', 'cierran', 'abierto', 'hours'];
    return hoursKeywords.some(keyword => text.includes(keyword));
  }

  private isContactRequest(text: string): boolean {
    const contactKeywords = ['contacto', 'teléfono', 'telefono', 'whatsapp', 'contact', 'phone'];
    return contactKeywords.some(keyword => text.includes(keyword));
  }

  // Respuestas por defecto
  private getDefaultWelcomeMessage(chatbot: any): string {
    const name = chatbot?.name || 'Asistente Virtual';
    const orgName = chatbot?.organization?.name || 'nuestra empresa';
    
    return `🌟 ¡Hola! Soy ${name} 🌟\n\n` +
           `Bienvenido/a a ${orgName}. Estoy aquí para ayudarte con información y asistencia básica.\n\n` +
           `💬 ¿En qué puedo ayudarte hoy?`;
  }

  private getDefaultHelpMessage(chatbot: any): string {
    const name = chatbot?.name || 'Asistente Virtual';
    
    return `🆘 ¡Estoy aquí para ayudarte! 🆘\n\n` +
           `Soy ${name} y puedo asistirte con:\n\n` +
           `📍 Información de ubicación\n` +
           `🕒 Horarios de atención\n` +
           `📞 Información de contacto\n` +
           `💬 Respuestas a consultas básicas\n\n` +
           `¡Solo pregúntame lo que necesites!`;
  }

  private getDefaultLocationMessage(chatbot: any): string {
    const orgName = chatbot?.organization?.name || 'Nuestro establecimiento';
    
    return `📍 Ubicación de ${orgName} 📍\n\n` +
           `Nos encontramos en [Dirección por configurar]\n\n` +
           `🗺️ ¿Te gustaría que comparta la ubicación exacta?`;
  }

  private getDefaultHoursMessage(chatbot: any): string {
    return `🕒 Horarios de Atención 🕒\n\n` +
           `📅 Lunes a Viernes: 8:00 AM - 6:00 PM\n` +
           `📅 Sábados: 8:00 AM - 2:00 PM\n` +
           `📅 Domingos: Cerrado\n\n` +
           `💡 Los horarios pueden variar en días festivos`;
  }

  private getDefaultContactMessage(chatbot: any): string {
    const orgName = chatbot?.organization?.name || 'Nuestro establecimiento';
    
    return `📞 Contacto de ${orgName} 📞\n\n` +
           `📱 WhatsApp: [Por configurar]\n` +
           `☎️ Teléfono: [Por configurar]\n` +
           `📧 Email: [Por configurar]\n\n` +
           `💬 ¡Estamos aquí para atenderte!`;
  }

  private getDefaultUnknownMessage(chatbot: any): string {
    const name = chatbot?.name || 'Asistente Virtual';
    
    return `🤔 Lo siento, no entendí completamente tu consulta.\n\n` +
           `Soy ${name} y puedo ayudarte con:\n` +
           `• Información general\n` +
           `• Ubicación y contacto\n` +
           `• Horarios de atención\n\n` +
           `💡 ¿Podrías ser más específico en tu consulta?`;
  }

  private getErrorResponse(chatbot: any): string {
    const name = chatbot?.name || 'Asistente Virtual';
    
    return `😅 ¡Ups! Hubo un problema técnico temporal.\n\n` +
           `Soy ${name} y estoy experimentando dificultades momentáneas.\n\n` +
           `🔄 Por favor, intenta nuevamente en unos segundos.`;
  }
} 