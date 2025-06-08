import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekCompletionOptions {
  messages: DeepSeekMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

@Injectable()
export class DeepSeekService {
  private readonly logger = new Logger(DeepSeekService.name);
  private readonly apiKey: string;
  private readonly apiUrl: string;
  private readonly model: string;
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    this.apiUrl = this.configService.get<string>('DEEPSEEK_API_URL', 'https://api.deepseek.com/v1');
    this.model = this.configService.get<string>('DEEPSEEK_MODEL', 'deepseek-chat');
    
    this.isConfigured = !!this.apiKey && this.apiKey !== 'your-deepseek-api-key';
    
    if (this.isConfigured) {
      this.logger.log('✅ DeepSeek Service inicializado correctamente');
      this.logger.log(`🔑 API Key: ${this.apiKey.substring(0, 10)}...`);
      this.logger.log(`🌐 API URL: ${this.apiUrl}`);
      this.logger.log(`🤖 Modelo: ${this.model}`);
    } else {
      this.logger.warn('⚠️ DeepSeek API key no configurada. Servicio funcionará en modo simulado.');
    }
  }

  /**
   * Generar respuesta usando DeepSeek
   */
  async generateResponse(options: DeepSeekCompletionOptions): Promise<string> {
    if (!this.isConfigured) {
      return this.generateMockResponse(options.messages);
    }

    try {
      this.logger.log(`🧠 Enviando solicitud a DeepSeek...`);
      
      const startTime = Date.now();
      
      const payload = {
        model: options.model || this.model,
        messages: options.messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        stream: false
      };

      this.logger.log(`📤 Payload:`, JSON.stringify(payload, null, 2));

      const response = await axios.post(`${this.apiUrl}/chat/completions`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        timeout: 30000
      });

      const responseTime = Date.now() - startTime;
      const message = response.data.choices?.[0]?.message?.content || 'Lo siento, no pude generar una respuesta.';
      
      this.logger.log(`✅ DeepSeek respondió en ${responseTime}ms`);
      this.logger.log(`📊 Tokens: ${response.data.usage?.total_tokens || 'N/A'}`);
      this.logger.log(`💬 Respuesta: ${message.substring(0, 100)}...`);
      
      return message.trim();
    } catch (error) {
      this.logger.error(`❌ Error llamando a DeepSeek: ${error.message}`);
      if (error.response) {
        this.logger.error(`📄 Error Response:`, error.response.data);
      }
      return this.generateMockResponse(options.messages);
    }
  }

  /**
   * Generar respuesta contextual para chatbot
   */
  async generateChatbotResponse(
    userMessage: string,
    systemPrompt: string,
    chatHistory: DeepSeekMessage[] = []
  ): Promise<string> {
    const messages: DeepSeekMessage[] = [
      { role: 'system', content: systemPrompt },
      ...chatHistory.slice(-6), // Mantener últimos 6 mensajes para contexto
      { role: 'user', content: userMessage }
    ];

    return await this.generateResponse({
      messages,
      temperature: 0.7,
      maxTokens: 500
    });
  }

  /**
   * Generar respuesta simulada
   */
  private generateMockResponse(messages: DeepSeekMessage[]): string {
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
    
    // Respuestas contextuales simuladas para farmacia
    if (lastUserMessage.toLowerCase().includes('medicamento') || 
        lastUserMessage.toLowerCase().includes('medicina') ||
        lastUserMessage.toLowerCase().includes('pastilla')) {
      return '💊 Hola! Para información sobre medicamentos específicos, te recomiendo consultar con nuestro farmacéutico. ¿Hay algo más en lo que pueda ayudarte?';
    }
    
    if (lastUserMessage.toLowerCase().includes('horario') || 
        lastUserMessage.toLowerCase().includes('hora')) {
      return '🕒 Nuestros horarios de atención son: Lunes a Viernes de 8:00 AM a 8:00 PM, Sábados de 8:00 AM a 6:00 PM y Domingos de 9:00 AM a 2:00 PM. ¿Necesitas algo más?';
    }
    
    if (lastUserMessage.toLowerCase().includes('delivery') || 
        lastUserMessage.toLowerCase().includes('domicilio')) {
      return '🚚 Sí, ofrecemos servicio de delivery! El costo varía según la zona. ¿En qué área te encuentras?';
    }
    
    if (lastUserMessage.toLowerCase().includes('ubicacion') || 
        lastUserMessage.toLowerCase().includes('direccion')) {
      return '📍 Estamos ubicados en el centro de la ciudad. ¿Te gustaría que te comparta la dirección exacta?';
    }
    
    return '🏥 Gracias por contactar nuestra farmacia. Estoy aquí para ayudarte con información sobre medicamentos, horarios y servicios. ¿En qué puedo asistirte?';
  }

  /**
   * Verificar si el servicio está configurado correctamente
   */
  isServiceConfigured(): boolean {
    return this.isConfigured;
  }

  /**
   * Obtener estado del servicio
   */
  getServiceStatus(): {
    configured: boolean;
    apiUrl: string;
    model: string;
    hasApiKey: boolean;
  } {
    return {
      configured: this.isConfigured,
      apiUrl: this.apiUrl,
      model: this.model,
      hasApiKey: !!this.apiKey && this.apiKey !== 'your-deepseek-api-key'
    };
  }
} 