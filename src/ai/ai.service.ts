/**
 * Servicio para manejar las interacciones con servicios de IA.
 * Este servicio proporciona funcionalidades para:
 * - Generar respuestas de chat usando modelos de lenguaje
 * - Transcribir audio usando Whisper
 * - Analizar imágenes usando Vision
 * 
 * @class AiService
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { OpenAIService } from './openai.service';
import { AnthropicService } from './anthropic.service';
import { GoogleAIService } from './google-ai.service';
import { OllamaService } from './ollama.service';
import { DeepSeekService } from './deepseek.service';

export interface AIResponse {
  text: string;
  model: string;
  provider: string;
  tokens?: number;
  confidence?: number;
}

export interface ChatRequest {
  message: string;
  context?: string;
  phoneNumber?: string;
  chatbotId?: string;
  provider?: string;
  model?: string;
  temperature?: number;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openaiApiKey: string;
  private readonly openaiApiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly openAIService: OpenAIService,
    private readonly anthropicService: AnthropicService,
    private readonly googleAIService: GoogleAIService,
    private readonly ollamaService: OllamaService,
    private readonly deepSeekService: DeepSeekService,
  ) {
    this.openaiApiKey = this.configService.get('ai.apiKey');
    this.openaiApiUrl = this.configService.get('ai.chatUrl');
  }

  /**
   * Procesa un mensaje usando el proveedor de IA especificado o el por defecto
   * Por ahora retorna una respuesta básica hasta que se implementen completamente los proveedores
   */
  async processMessage(request: ChatRequest): Promise<AIResponse> {
    try {
      const provider = request.provider || this.configService.get('AI_DEFAULT_PROVIDER', 'basic');
      
      this.logger.log(`🤖 Procesando mensaje con ${provider}`);

      // Por ahora, retornamos una respuesta genérica
      const responses = [
        "¡Hola! ¿En qué puedo ayudarte hoy?",
        "Gracias por tu mensaje. ¿Podrías darme más detalles?",
        "Entiendo. ¿Hay algo específico que necesites?",
        "Perfecto. ¿Cómo puedo asistirte mejor?",
        "¡Excelente! Estoy aquí para ayudarte."
      ];

      const randomResponse = responses[Math.floor(Math.random() * responses.length)];

      return {
        text: randomResponse,
        model: request.model || 'basic-chat',
        provider: provider,
        confidence: 0.8
      };
    } catch (error) {
      this.logger.error(`Error procesando mensaje: ${error.message}`);
      return {
        text: 'Lo siento, no pude procesar tu mensaje en este momento. Por favor, intenta de nuevo.',
        model: 'error',
        provider: 'error'
      };
    }
  }

  /**
   * Análisis de sentimiento básico del mensaje
   */
  async analyzeSentiment(text: string, provider?: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
  }> {
    try {
      // Análisis básico por palabras clave
      const positiveWords = ['bueno', 'excelente', 'gracias', 'perfecto', 'genial', 'increíble'];
      const negativeWords = ['malo', 'terrible', 'problema', 'error', 'falla', 'horrible'];
      
      const lowerText = text.toLowerCase();
      const hasPositive = positiveWords.some(word => lowerText.includes(word));
      const hasNegative = negativeWords.some(word => lowerText.includes(word));
      
      if (hasPositive && !hasNegative) {
        return { sentiment: 'positive', confidence: 0.7 };
      } else if (hasNegative && !hasPositive) {
        return { sentiment: 'negative', confidence: 0.7 };
      } else {
        return { sentiment: 'neutral', confidence: 0.6 };
      }
    } catch (error) {
      this.logger.error(`Error en análisis de sentimiento: ${error.message}`);
      return { sentiment: 'neutral', confidence: 0.5 };
    }
  }

  /**
   * Verificar si el servicio está disponible
   */
  async checkAvailability(): Promise<{
    basic: boolean;
    openai: boolean;
    anthropic: boolean;
    google: boolean;
    ollama: boolean;
  }> {
    return {
      basic: true,
      openai: false, // Será true cuando se implemente completamente
      anthropic: false,
      google: false,
      ollama: false
    };
  }

  /**
   * Obtener respuesta por defecto
   */
  getDefaultResponse(): string {
    return "¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?";
  }

  /**
   * Genera una respuesta usando el mejor proveedor de IA disponible
   * @param message Mensaje del usuario
   * @param systemPrompt Instrucciones para la IA
   * @returns Respuesta generada
   */
  async generateResponse(message: string, systemPrompt: string): Promise<string> {
    try {
      // Intentar DeepSeek primero (el más recomendado)
      if (this.deepSeekService.isServiceConfigured()) {
        this.logger.log('🧠 Usando DeepSeek para generar respuesta');
        return await this.deepSeekService.generateChatbotResponse(message, systemPrompt, []);
      }
      
      // Intentar OpenAI como alternativa
      try {
        this.logger.log('🧠 Usando OpenAI para generar respuesta');
        return await this.openAIService.generateChatResponse({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ]
        });
      } catch (error) {
        this.logger.error(`Error con OpenAI: ${error.message}`);
      }
      
      // Intentar Anthropic como tercera opción
      try {
        this.logger.log('🧠 Usando Anthropic para generar respuesta');
        return await this.anthropicService.generateResponse({
          messages: [{ role: 'user', content: message }],
          systemPrompt: systemPrompt
        });
      } catch (error) {
        this.logger.error(`Error con Anthropic: ${error.message}`);
      }
      
      // Usar respuesta genérica si ninguno está disponible
      this.logger.warn('⚠️ Ningún servicio de IA disponible, usando respuesta genérica');
      return `Hola, soy un asistente virtual. Lamentablemente, no tengo acceso a servicios de IA en este momento. ¿En qué puedo ayudarte?`;
    } catch (error) {
      this.logger.error(`❌ Error generando respuesta con IA: ${error.message}`);
      return `Lo siento, ocurrió un error al procesar tu consulta. Por favor, intenta de nuevo más tarde.`;
    }
  }

  /**
   * Transcribe audio usando el modelo Whisper de OpenAI.
   * 
   * @param {Buffer} audioBuffer - Buffer del archivo de audio
   * @returns {Promise<string>} Texto transcrito
   * @throws {Error} Si hay un error en la transcripción
   */
  async transcribeAudio(audioBuffer: Buffer): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', new Blob([audioBuffer]), 'audio.mp3');
      formData.append('model', 'whisper-1');

      const response = await axios.post(
        this.configService.get('ai.whisperUrl'),
        formData,
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      return response.data.text;
    } catch (error) {
      this.logger.error(`Error transcribiendo audio: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analiza una imagen usando el modelo Vision de OpenAI.
   * 
   * @param {string} imageUrl - URL de la imagen a analizar
   * @returns {Promise<string>} Descripción de la imagen
   * @throws {Error} Si hay un error al analizar la imagen
   */
  async analyzeImage(imageUrl: string): Promise<string> {
    try {
      const response = await axios.post(
        this.openaiApiUrl,
        {
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: '¿Qué hay en esta imagen?' },
                { type: 'image_url', image_url: imageUrl }
              ]
            }
          ],
          max_tokens: 300
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      this.logger.error(`Error analizando imagen: ${error.message}`);
      throw error;
    }
  }
} 