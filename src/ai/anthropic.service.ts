import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeCompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  messages: ClaudeMessage[];
  systemPrompt?: string;
}

export interface AnthropicAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence: number;
  intent: string;
  emotions: string[];
  suggestedActions: string[];
}

@Injectable()
export class AnthropicService {
  private readonly logger = new Logger(AnthropicService.name);
  private isConfigured = false;
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1';

  constructor(private configService: ConfigService) {
    this.initializeAnthropic();
  }

  private initializeAnthropic() {
    this.apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    
    if (!this.apiKey) {
      this.logger.warn('Anthropic API key no configurada. Servicio funcionará en modo simulado.');
      return;
    }

    this.isConfigured = true;
    this.logger.log('✅ Anthropic Service inicializado correctamente');
  }

  /**
   * Generar respuesta usando Claude
   */
  async generateResponse(options: ClaudeCompletionOptions): Promise<string> {
    if (!this.isConfigured) {
      return this.generateMockResponse(options.messages);
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      };

      const payload = {
        model: options.model || 'claude-3-sonnet-20240229',
        max_tokens: options.maxTokens || 1000,
        temperature: options.temperature || 0.7,
        messages: options.messages,
        ...(options.systemPrompt && { system: options.systemPrompt })
      };

      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const message = data.content?.[0]?.text || 'Lo siento, no pude generar una respuesta.';
      
      this.logger.log(`🤖 Respuesta Claude generada: ${message.substring(0, 100)}...`);
      return message;
    } catch (error) {
      this.logger.error(`Error generando respuesta con Claude: ${error.message}`);
      return this.generateMockResponse(options.messages);
    }
  }

  /**
   * Análisis avanzado de texto con Claude
   */
  async analyzeText(text: string): Promise<AnthropicAnalysisResult> {
    if (!this.isConfigured) {
      return this.generateMockAnalysis(text);
    }

    try {
      const systemPrompt = `
        Eres un experto analista de comunicación. Analiza el siguiente texto y devuelve un JSON con:
        - sentiment: "positive", "negative" o "neutral"
        - confidence: número entre 0 y 1
        - intent: intención principal del usuario
        - emotions: array de emociones detectadas
        - suggestedActions: array de acciones sugeridas para responder

        Responde solo con el JSON válido, sin explicaciones.
      `;

      const response = await this.generateResponse({
        messages: [{ role: 'user', content: text }],
        systemPrompt,
        temperature: 0.3,
        maxTokens: 500
      });

      try {
        const analysis = JSON.parse(response);
        this.logger.log(`🧠 Análisis Claude completado para: "${text.substring(0, 50)}..."`);
        return analysis;
      } catch (parseError) {
        this.logger.warn(`Error parseando análisis de Claude: ${parseError.message}`);
        return this.generateMockAnalysis(text);
      }
    } catch (error) {
      this.logger.error(`Error analizando texto con Claude: ${error.message}`);
      return this.generateMockAnalysis(text);
    }
  }

  /**
   * Generar respuesta contextual para chatbot
   */
  async generateChatbotResponse(
    userMessage: string, 
    chatHistory: ClaudeMessage[], 
    context: {
      botPersonality?: string;
      businessInfo?: string;
      currentProducts?: string[];
      userProfile?: any;
    }
  ): Promise<string> {
    const systemPrompt = `
      Eres un asistente de ventas ${context.botPersonality || 'amigable y profesional'} para un negocio.
      
      ${context.businessInfo || 'Ayudas a los clientes con sus consultas sobre productos y servicios.'}
      
      ${context.currentProducts?.length ? `Productos disponibles: ${context.currentProducts.join(', ')}` : ''}
      
      Instrucciones:
      - Responde en español de manera conversacional
      - Mantén un tono ${context.botPersonality || 'profesional pero cercano'}
      - Si no sabes algo, admítelo honestamente
      - Enfócate en ayudar al cliente a encontrar lo que necesita
      - Sugiere productos relevantes cuando sea apropiado
    `;

    const messages: ClaudeMessage[] = [
      ...chatHistory.slice(-6), // Mantener últimos 6 mensajes para contexto
      { role: 'user', content: userMessage }
    ];

    return await this.generateResponse({
      messages,
      systemPrompt,
      temperature: 0.8,
      maxTokens: 300
    });
  }

  /**
   * Traducir texto
   */
  async translateText(text: string, targetLanguage: string = 'es'): Promise<string> {
    if (!this.isConfigured) {
      return `[Traducción simulada al ${targetLanguage}]: ${text}`;
    }

    const systemPrompt = `
      Traduce el siguiente texto al ${targetLanguage}. 
      Mantén el tono y contexto original.
      Responde solo con la traducción, sin explicaciones.
    `;

    return await this.generateResponse({
      messages: [{ role: 'user', content: text }],
      systemPrompt,
      temperature: 0.3,
      maxTokens: 200
    });
  }

  /**
   * Mejorar mensaje de marketing
   */
  async improveMarketingMessage(message: string, target: string = 'general'): Promise<string> {
    if (!this.isConfigured) {
      return `${message} ✨ [Mejorado con IA]`;
    }

    const systemPrompt = `
      Mejora el siguiente mensaje de marketing para que sea más atractivo y persuasivo.
      Audiencia objetivo: ${target}
      
      Mantén:
      - El mensaje principal
      - Información factual
      - Tono apropiado para WhatsApp
      
      Mejora:
      - Claridad y impacto
      - Call-to-action
      - Emociones positivas
      
      Responde solo con el mensaje mejorado.
    `;

    return await this.generateResponse({
      messages: [{ role: 'user', content: message }],
      systemPrompt,
      temperature: 0.9,
      maxTokens: 200
    });
  }

  /**
   * Generar FAQ automática
   */
  async generateFAQ(businessInfo: string, products: string[]): Promise<Array<{question: string, answer: string}>> {
    if (!this.isConfigured) {
      return this.getMockFAQ();
    }

    const prompt = `
      Basándote en la siguiente información del negocio y productos, genera 10 preguntas frecuentes con sus respuestas.
      
      Información del negocio: ${businessInfo}
      Productos: ${products.join(', ')}
      
      Devuelve un JSON array con objetos {question: string, answer: string}.
      Las preguntas deben ser típicas de clientes reales.
      Las respuestas deben ser útiles y específicas.
    `;

    try {
      const response = await this.generateResponse({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        maxTokens: 1500
      });

      const faq = JSON.parse(response);
      this.logger.log(`📋 FAQ generada con ${faq.length} preguntas`);
      return faq;
    } catch (error) {
      this.logger.error(`Error generando FAQ: ${error.message}`);
      return this.getMockFAQ();
    }
  }

  /**
   * Verificar si el servicio está configurado
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Obtener modelos disponibles
   */
  getAvailableModels(): string[] {
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0'
    ];
  }

  /**
   * Respuesta simulada cuando no hay API key
   */
  private generateMockResponse(messages: ClaudeMessage[]): string {
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    if (lastMessage.toLowerCase().includes('hola') || lastMessage.toLowerCase().includes('buenos')) {
      return '¡Hola! Soy Claude, tu asistente de IA. ¿En qué puedo ayudarte hoy? (Funcionando en modo simulado)';
    }
    
    if (lastMessage.toLowerCase().includes('producto')) {
      return 'Te puedo ayudar con información sobre productos. ¿Hay algo específico que te interese?';
    }
    
    if (lastMessage.toLowerCase().includes('precio')) {
      return 'Para consultas de precios, puedo conectarte con nuestro equipo de ventas o buscar información específica.';
    }
    
    return `Entiendo tu consulta: "${lastMessage.substring(0, 50)}...". Estoy funcionando en modo simulado. Para respuestas más precisas, configura tu clave de Anthropic.`;
  }

  /**
   * Análisis simulado
   */
  private generateMockAnalysis(text: string): AnthropicAnalysisResult {
    // Análisis básico simulado
    const positiveWords = ['gracias', 'excelente', 'bueno', 'perfecto', 'genial', 'me gusta'];
    const negativeWords = ['mal', 'problema', 'error', 'terrible', 'no funciona', 'malo'];
    
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    let confidence = 0.6;
    
    const textLower = text.toLowerCase();
    const hasPositive = positiveWords.some(word => textLower.includes(word));
    const hasNegative = negativeWords.some(word => textLower.includes(word));
    
    if (hasPositive && !hasNegative) {
      sentiment = 'positive';
      confidence = 0.8;
    } else if (hasNegative && !hasPositive) {
      sentiment = 'negative';
      confidence = 0.8;
    }
    
    // Detectar emociones
    const emotions = [];
    if (hasPositive) emotions.push('alegría', 'satisfacción');
    if (hasNegative) emotions.push('frustración', 'decepción');
    if (/pregunta|como|donde|cuando/i.test(text)) emotions.push('curiosidad');
    
    // Detectar intent
    let intent = 'consulta_general';
    if (/comprar|quiero|necesito/i.test(text)) intent = 'intencion_compra';
    if (/precio|costo|cuanto/i.test(text)) intent = 'consulta_precio';
    if (/ayuda|help|como/i.test(text)) intent = 'solicitud_ayuda';
    if (/reclamo|problema|mal/i.test(text)) intent = 'reclamo';
    
    return {
      sentiment,
      confidence,
      intent,
      emotions,
      suggestedActions: this.getSuggestedActions(intent, sentiment)
    };
  }

  /**
   * Obtener acciones sugeridas basadas en intent y sentiment
   */
  private getSuggestedActions(intent: string, sentiment: string): string[] {
    const actions = [];
    
    switch (intent) {
      case 'intencion_compra':
        actions.push('mostrar_productos', 'enviar_catalogo', 'consultar_disponibilidad');
        break;
      case 'consulta_precio':
        actions.push('enviar_lista_precios', 'calcular_descuentos', 'mostrar_ofertas');
        break;
      case 'solicitud_ayuda':
        actions.push('enviar_faq', 'conectar_agente', 'enviar_tutorial');
        break;
      case 'reclamo':
        actions.push('escalar_a_supervisor', 'documentar_problema', 'ofrecer_solucion');
        break;
      default:
        actions.push('continuar_conversacion', 'ofrecer_ayuda');
    }
    
    if (sentiment === 'negative') {
      actions.push('mostrar_empatia', 'buscar_solucion_rapida');
    } else if (sentiment === 'positive') {
      actions.push('aprovechar_momento', 'sugerir_productos_adicionales');
    }
    
    return actions;
  }

  /**
   * FAQ simulada
   */
  private getMockFAQ(): Array<{question: string, answer: string}> {
    return [
      {
        question: "¿Cuáles son sus horarios de atención?",
        answer: "Nuestro horario de atención es de lunes a viernes de 8:00 AM a 6:00 PM."
      },
      {
        question: "¿Hacen entregas a domicilio?",
        answer: "Sí, realizamos entregas a domicilio en toda la ciudad con un costo adicional."
      },
      {
        question: "¿Qué formas de pago aceptan?",
        answer: "Aceptamos efectivo, transferencias bancarias, y pagos móviles."
      },
      {
        question: "¿Tienen garantía en sus productos?",
        answer: "Todos nuestros productos cuentan con garantía de 30 días."
      },
      {
        question: "¿Puedo devolver un producto?",
        answer: "Sí, aceptamos devoluciones dentro de los primeros 15 días de la compra."
      }
    ];
  }
} 