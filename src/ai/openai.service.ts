import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  messages: ChatMessage[];
}

export interface TextAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  topics: string[];
  intent: string;
}

@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);
  private openai: OpenAI;
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    this.initializeOpenAI();
  }

  private initializeOpenAI() {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    if (!apiKey) {
      this.logger.warn('OpenAI API key no configurada. Servicio funcionará en modo simulado.');
      return;
    }

    try {
      this.openai = new OpenAI({
        apiKey: apiKey,
      });
      this.isConfigured = true;
      this.logger.log('✅ OpenAI Service inicializado correctamente');
    } catch (error) {
      this.logger.error(`Error inicializando OpenAI: ${error.message}`);
    }
  }

  /**
   * Generar respuesta de chat usando GPT
   */
  async generateChatResponse(options: ChatCompletionOptions): Promise<string> {
    if (!this.isConfigured) {
      return this.generateMockResponse(options.messages);
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: options.model || 'gpt-3.5-turbo',
        messages: options.messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 500,
      });

      const response = completion.choices[0]?.message?.content || 'Lo siento, no pude generar una respuesta.';
      this.logger.log(`💬 Respuesta OpenAI generada: ${response.substring(0, 100)}...`);
      return response;
    } catch (error) {
      this.logger.error(`Error generando respuesta OpenAI: ${error.message}`);
      return this.generateMockResponse(options.messages);
    }
  }

  /**
   * Analizar texto para sentiment y intent
   */
  async analyzeText(text: string): Promise<TextAnalysisResult> {
    if (!this.isConfigured) {
      return this.generateMockAnalysis(text);
    }

    try {
      const prompt = `
        Analiza el siguiente texto y devuelve un JSON con:
        - sentiment: "positive", "negative" o "neutral"
        - confidence: número entre 0 y 1
        - topics: array de temas principales
        - intent: intención principal del usuario

        Texto: "${text}"
        
        Responde solo con el JSON, sin explicaciones adicionales.
      `;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 300,
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      
      try {
        const analysis = JSON.parse(responseText);
        this.logger.log(`🧠 Análisis de texto completado para: "${text.substring(0, 50)}..."`);
        return analysis;
      } catch (parseError) {
        this.logger.warn(`Error parseando análisis de OpenAI: ${parseError.message}`);
        return this.generateMockAnalysis(text);
      }
    } catch (error) {
      this.logger.error(`Error analizando texto con OpenAI: ${error.message}`);
      return this.generateMockAnalysis(text);
    }
  }

  /**
   * Transcribir audio usando Whisper
   */
  async transcribeAudio(audioBuffer: Buffer, filename: string = 'audio.ogg'): Promise<string> {
    if (!this.isConfigured) {
      return 'Transcripción simulada del audio recibido.';
    }

    try {
      // Crear un objeto File-like compatible con la API de OpenAI
      const audioFile = new File([audioBuffer], filename, { 
        type: this.getAudioMimeType(filename) 
      });

      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'es', // Español por defecto
      });

      const text = transcription.text || 'No se pudo transcribir el audio.';
      this.logger.log(`🎤 Audio transcrito: "${text.substring(0, 100)}..."`);
      return text;
    } catch (error) {
      this.logger.error(`Error transcribiendo audio con Whisper: ${error.message}`);
      return 'Lo siento, no pude transcribir el audio. Por favor, intenta enviar un mensaje de texto.';
    }
  }

  /**
   * Generar imágenes usando DALL-E
   */
  async generateImage(prompt: string, size: '256x256' | '512x512' | '1024x1024' = '512x512'): Promise<string> {
    if (!this.isConfigured) {
      return 'https://via.placeholder.com/512x512.png?text=Imagen+Simulada';
    }

    try {
      const response = await this.openai.images.generate({
        model: 'dall-e-2',
        prompt: prompt,
        n: 1,
        size: size,
      });

      const imageUrl = response.data[0]?.url || '';
      this.logger.log(`🖼️ Imagen generada para prompt: "${prompt}"`);
      return imageUrl;
    } catch (error) {
      this.logger.error(`Error generando imagen con DALL-E: ${error.message}`);
      throw new Error('No se pudo generar la imagen solicitada');
    }
  }

  /**
   * Moderar contenido usando OpenAI Moderation
   */
  async moderateContent(text: string): Promise<{ flagged: boolean; categories: string[] }> {
    if (!this.isConfigured) {
      return { flagged: false, categories: [] };
    }

    try {
      const moderation = await this.openai.moderations.create({
        input: text,
      });

      const result = moderation.results[0];
      const flaggedCategories = Object.keys(result.categories).filter(
        category => result.categories[category]
      );

      return {
        flagged: result.flagged,
        categories: flaggedCategories
      };
    } catch (error) {
      this.logger.error(`Error moderando contenido: ${error.message}`);
      return { flagged: false, categories: [] };
    }
  }

  /**
   * Verificar si el servicio está configurado
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Generar respuesta simulada cuando no hay API key
   */
  private generateMockResponse(messages: ChatMessage[]): string {
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    // Respuestas simuladas básicas
    if (lastMessage.toLowerCase().includes('hola')) {
      return '¡Hola! ¿En qué puedo ayudarte hoy?';
    }
    
    if (lastMessage.toLowerCase().includes('precio') || lastMessage.toLowerCase().includes('costo')) {
      return 'Te ayudo con información de precios. ¿Qué producto te interesa?';
    }
    
    if (lastMessage.toLowerCase().includes('producto')) {
      return 'Tenemos varios productos disponibles. ¿Hay algo específico que busques?';
    }
    
    return 'Gracias por tu mensaje. Estoy funcionando en modo simulado. Para respuestas más inteligentes, configura tu clave de OpenAI.';
  }

  /**
   * Generar análisis simulado
   */
  private generateMockAnalysis(text: string): TextAnalysisResult {
    // Análisis básico simulado
    const hasPositiveWords = /gracias|excelente|bueno|perfecto|genial/i.test(text);
    const hasNegativeWords = /mal|problema|error|fallo|terrible/i.test(text);
    
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    let confidence = 0.5;
    
    if (hasPositiveWords) {
      sentiment = 'positive';
      confidence = 0.8;
    } else if (hasNegativeWords) {
      sentiment = 'negative';
      confidence = 0.8;
    }
    
    // Detectar intent básico
    let intent = 'general';
    if (/precio|costo|cuanto/i.test(text)) intent = 'price_inquiry';
    if (/comprar|quiero|necesito/i.test(text)) intent = 'purchase_intent';
    if (/ayuda|help|como/i.test(text)) intent = 'help_request';
    
    return {
      sentiment,
      confidence,
      topics: this.extractTopics(text),
      intent
    };
  }

  /**
   * Extraer temas básicos del texto
   */
  private extractTopics(text: string): string[] {
    const topics = [];
    
    if (/producto|item|articulo/i.test(text)) topics.push('productos');
    if (/precio|costo|dinero/i.test(text)) topics.push('precios');
    if (/envio|delivery|entrega/i.test(text)) topics.push('envío');
    if (/pago|tarjeta|transferencia/i.test(text)) topics.push('pagos');
    
    return topics;
  }

  /**
   * Obtener tipo MIME del archivo de audio
   */
  private getAudioMimeType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    const mimeTypes = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'm4a': 'audio/mp4',
      'flac': 'audio/flac'
    };
    
    return mimeTypes[extension] || 'audio/ogg';
  }
} 