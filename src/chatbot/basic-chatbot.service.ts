import { Injectable, Logger } from '@nestjs/common';
import { ChatbotInstance } from '../admin/entities/chatbot-instance.entity';
import { ChatbotServiceInterface } from './interfaces/chatbot-service.interface';

@Injectable()
export class BasicChatbotService implements ChatbotServiceInterface {
  private readonly logger = new Logger(BasicChatbotService.name);
  private sessions = new Map<string, any>();

  /**
   * Maneja mensajes para chatbots básicos sin BD externa
   */
  async handleMessage(
    message: any,
    phoneNumber: string,
    sessionData?: any,
    chatbot?: ChatbotInstance
  ): Promise<any> {
    try {
      this.logger.log(`🤖 BasicChatbotService procesando mensaje para: ${chatbot?.name}`);
      this.logger.log(`📱 Teléfono: ${phoneNumber}`);
      this.logger.log(`💬 Mensaje: ${message.body}`);

      // Obtener prompts personalizados del chatbot
      const chatbotConfig = this.safeParseConfig(chatbot?.chatbotConfig);
      const prompts = chatbotConfig.prompts || this.getDefaultPrompts(chatbot?.name);

      this.logger.log(`📝 Prompts configurados:`, JSON.stringify(prompts, null, 2));

      // Manejo de sesión simple
      const sessionKey = `${chatbot?.id}-${phoneNumber}`;
      let session = this.sessions.get(sessionKey) || {
        phoneNumber,
        chatbotId: chatbot?.id,
        startTime: new Date(),
        messageCount: 0,
        context: {}
      };

      session.messageCount++;
      session.lastMessage = new Date();

      // Lógica básica de respuesta
      let response = '';

      // Primer mensaje o saludo
      if (session.messageCount === 1 || this.isGreeting(message.body)) {
        response = prompts.welcome || prompts.greeting || `¡Hola! Soy ${chatbot?.name || 'tu asistente virtual'}. ¿En qué puedo ayudarte?`;
      }
      // Mensaje de despedida
      else if (this.isFarewell(message.body)) {
        response = prompts.farewell || prompts.goodbye || '¡Hasta luego! Que tengas un excelente día.';
        this.sessions.delete(sessionKey); // Limpiar sesión
      }
      // Información del chatbot
      else if (this.isInfoRequest(message.body)) {
        response = prompts.information || prompts.info || this.getDefaultInfo(chatbot);
      }
      // Respuesta por defecto
      else {
        response = prompts.default || prompts.fallback || this.generateContextualResponse(message.body, chatbot);
      }

      // Actualizar sesión
      this.sessions.set(sessionKey, session);

      this.logger.log(`✅ Respuesta generada: ${response}`);

      return {
        status: 'success',
        response: response,
        service: 'BasicChatbotService',
        chatbot: chatbot?.name,
        session: {
          messageCount: session.messageCount,
          sessionTime: Date.now() - session.startTime.getTime()
        }
      };

    } catch (error) {
      this.logger.error(`❌ Error en BasicChatbotService: ${error.message}`);
      return {
        status: 'error',
        response: 'Lo siento, ocurrió un error. Inténtalo de nuevo.',
        error: error.message
      };
    }
  }

  /**
   * Detecta si el mensaje es un saludo
   */
  private isGreeting(message: string): boolean {
    const greetings = ['hola', 'hey', 'buenos', 'buenas', 'hi', 'hello', 'saludos', 'que tal'];
    const lowerMessage = message.toLowerCase();
    return greetings.some(greeting => lowerMessage.includes(greeting));
  }

  /**
   * Detecta si el mensaje es una despedida
   */
  private isFarewell(message: string): boolean {
    const farewells = ['adiós', 'adios', 'chao', 'bye', 'hasta luego', 'nos vemos', 'gracias', 'listo'];
    const lowerMessage = message.toLowerCase();
    return farewells.some(farewell => lowerMessage.includes(farewell));
  }

  /**
   * Detecta si el mensaje solicita información
   */
  private isInfoRequest(message: string): boolean {
    const infoKeywords = ['info', 'información', 'informacion', 'ayuda', 'que haces', 'servicios'];
    const lowerMessage = message.toLowerCase();
    return infoKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Genera una respuesta contextual basada en el mensaje
   */
  private generateContextualResponse(message: string, chatbot: ChatbotInstance): string {
    const lowerMessage = message.toLowerCase();
    
    // Respuestas contextuales básicas
    if (lowerMessage.includes('precio') || lowerMessage.includes('costo') || lowerMessage.includes('cuanto')) {
      return 'Para información sobre precios, por favor contáctanos directamente. ¿Hay algo más en lo que pueda ayudarte?';
    }
    
    if (lowerMessage.includes('horario') || lowerMessage.includes('hora') || lowerMessage.includes('atencion')) {
      return 'Nuestro horario de atención es de lunes a viernes. ¿Necesitas alguna información específica?';
    }
    
    if (lowerMessage.includes('ubicacion') || lowerMessage.includes('direccion') || lowerMessage.includes('donde')) {
      return 'Para conocer nuestra ubicación, contáctanos y te proporcionaremos la dirección. ¿Algo más en lo que pueda ayudarte?';
    }

    // Respuesta por defecto personalizada
    return `Gracias por tu mensaje. Como ${chatbot?.name || 'asistente virtual'}, estoy aquí para ayudarte. ¿Puedes ser más específico sobre lo que necesitas?`;
  }

  /**
   * Obtiene prompts por defecto si no están configurados
   */
  private getDefaultPrompts(chatbotName: string): any {
    return {
      welcome: `¡Hola! Soy ${chatbotName || 'tu asistente virtual'}. ¿En qué puedo ayudarte hoy?`,
      farewell: '¡Gracias por contactarnos! Que tengas un excelente día.',
      information: `Soy ${chatbotName || 'un asistente virtual'} y estoy aquí para ayudarte con tus consultas.`,
      default: 'Gracias por tu mensaje. ¿En qué puedo ayudarte específicamente?'
    };
  }

  /**
   * Genera información por defecto del chatbot
   */
  private getDefaultInfo(chatbot: ChatbotInstance): string {
    const name = chatbot?.name || 'Asistente Virtual';
    const org = chatbot?.organization?.name;
    
    let info = `Soy ${name}, tu asistente virtual automatizado.`;
    
    if (org) {
      info += ` Represento a ${org}.`;
    }
    
    info += ' Estoy aquí para ayudarte con tus consultas y brindarte información.';
    
    return info;
  }

  /**
   * Parsea de forma segura un string JSON
   */
  private safeParseConfig(config: any): any {
    if (!config) return {};
    
    if (typeof config === 'object' && config !== null && !Array.isArray(config)) {
      return config;
    }
    
    if (typeof config === 'string') {
      try {
        return JSON.parse(config);
      } catch (error) {
        this.logger.warn(`Error parsing config: ${error.message}`);
        return {};
      }
    }
    
    return {};
  }

  /**
   * Limpia sesiones expiradas
   */
  public cleanExpiredSessions(): void {
    const now = Date.now();
    const expirationTime = 2 * 60 * 60 * 1000; // 2 horas

    for (const [sessionKey, session] of this.sessions.entries()) {
      if (now - session.lastMessage?.getTime() > expirationTime) {
        this.sessions.delete(sessionKey);
        this.logger.log(`🧹 Sesión expirada eliminada: ${sessionKey}`);
      }
    }
  }
} 