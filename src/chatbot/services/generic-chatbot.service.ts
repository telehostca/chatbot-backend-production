import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { DatabaseMapperService } from './database-mapper.service';
import { PersistentSession } from '../../chat/entities/persistent-session.entity';
import { ChatService } from '../../chat/chat.service';

@Injectable()
export class GenericChatbotService {
  private readonly logger = new Logger(GenericChatbotService.name);

  constructor(
    private readonly databaseMapperService: DatabaseMapperService,
    @InjectRepository(PersistentSession, 'users')
    private persistentSessionRepository: Repository<PersistentSession>,
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
  ) {}

  /**
   * Servicio genérico SaaS multi-tenant
   * Lee TODA la configuración desde la base de datos
   * Soporta todos los tipos: Básico, E-commerce, Servicio al Cliente, Informativo, Leads
   * NUEVA FUNCIONALIDAD: Integración con IA para respuestas naturales + Base de Datos Externa
   */

  async handleMessage(message: string, from: string, chatbotConfig: any, chatbotId?: string): Promise<string> {
    this.logger.log(`🤖 [VERSIÓN ACTUALIZADA] Chatbot genérico procesando mensaje: ${message} de ${from}`);

    try {
      // 🔥 SIMPLIFICADO TEMPORALMENTE - Respuesta básica primero para debug
      this.logger.log(`🔍 Configuración recibida:`, chatbotConfig);
      
      // Respuesta básica funcional
      const basicResponses = [
        "¡Hola! Gracias por contactarnos. ¿En qué puedo ayudarte?",
        "Hola, estoy aquí para asistirte. ¿Cuál es tu consulta?",
        "¡Saludos! ¿Necesitas información sobre nuestros servicios?",
        "Hola, soy tu asistente virtual. ¿Cómo puedo ayudarte hoy?"
      ];
      
      const randomResponse = basicResponses[Math.floor(Math.random() * basicResponses.length)];
      this.logger.log(`✅ Respuesta básica generada exitosamente`);
      
      return randomResponse;

    } catch (error) {
      this.logger.error(`❌ Error en chatbot genérico: ${error.message}`);
      return this.getGenericErrorResponse();
    }
  }

  /**
   * NUEVA FUNCIÓN MEJORADA: Decidir si usar IA basado en complejidad del mensaje
   */
  private shouldUseAI(message: string, intent: string, config: any): boolean {
    this.logger.log(`🔍 Analizando si usar IA para: "${message}" (intent: ${intent})`);
    
    // LÓGICA CORREGIDA: Priorizar IA para preguntas complejas INDEPENDIENTEMENTE de templates
    
    // 1. PRIMERO Y MÁS IMPORTANTE: Analizar complejidad del mensaje
    const complexityIndicators = [
      // Preguntas filosóficas o complejas
      'por qué', 'cómo funciona', 'explica', 'cuál es', 'qué significa',
      'diferencia', 'ventaja', 'recomendación', 'consejo', 'opinas',
      'sentido', 'mejor', 'comparar', 'evaluar', 'análisis', 'detalladamente',
      'principios', 'fundamentos', 'teoría',
      
      // Preguntas médicas específicas y complejas
      'me duele', 'tengo síntomas', 'me siento', 'dolor de', 'fiebre',
      'recomiendas', 'qué tomar', 'es bueno para', 'efectos',
      'desde hace', 'qué hacer', 'cómo tratar', 'tengo diabetes',
      'hipertensión', 'interfiera', 'analgésico', 'tipo 2', 'metformina',
      'enalapril', 'tratamiento actual',
      
      // Preguntas de negocio complejas
      'competencia', 'servicio', 'calidad', 'proceso', 'método',
      'estrategia', 'experiencia', 'garantía', 'beneficio'
    ];

    const hasComplexityIndicators = complexityIndicators.some(indicator => 
      message.toLowerCase().includes(indicator)
    );

    // ⭐ NUEVA LÓGICA: Priorizar IA para consultas de productos
    const productKeywords = ['tienen', 'busco', 'necesito', 'precio', 'disponible', 'stock', 'harina', 'aceite', 'azúcar', 'leche', 'marca'];
    const hasProductKeywords = productKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
    
    // Usar IA si: es larga (>30 chars) O tiene indicadores de complejidad O menciona productos
    const isComplexQuestion = message.length > 30 || hasComplexityIndicators || hasProductKeywords;

    // ✅ NUEVA LÓGICA: Si es compleja, SIEMPRE usar IA (ignorar templates)
    if (isComplexQuestion) {
      this.logger.log(`🧠 PREGUNTA COMPLEJA DETECTADA → FORZAR IA`);
      this.logger.log(`   📏 Longitud: ${message.length} chars`);
      this.logger.log(`   🔍 Indicadores: ${hasComplexityIndicators}`);
      this.logger.log(`   🎯 Decisión: IA (ignorando templates)`);
      return true;
    }

    // 2. SOLO para preguntas simples: usar templates
    const responses = config.responses || {};
    
    // Si es un intent específico (no default) y tiene respuesta configurada, usar template
    if (intent !== 'default' && responses[intent]) {
      this.logger.log(`📋 Pregunta simple con intent específico: ${intent} → TEMPLATE`);
      return false;
    }

    // Para preguntas simples sin intent específico, usar respuesta default si existe
    if (responses.default) {
      this.logger.log(`📋 Pregunta simple, usando respuesta default → TEMPLATE`);
      return false;
    }

    // Si no hay respuesta default, usar IA
    this.logger.log(`🤖 No hay respuesta configurada → IA`);
    return true;
  }

  /**
   * NUEVA FUNCIÓN: Generar respuesta usando IA
   */
  private async generateAIResponse(message: string, from: string, chatbotConfig: any, config: any, chatbotId?: string): Promise<string> {
    try {
      // Extraer configuración de IA
      const aiConfig = this.extractAIConfiguration(chatbotConfig);
      
      // ✅ PRIORIZAR DEEPSEEK CON VARIABLE DE ENTORNO SI NO HAY API KEY
      if (!aiConfig || !aiConfig.provider || (!aiConfig.apiKey && aiConfig.provider !== 'deepseek')) {
        this.logger.warn(`⚠️ No hay configuración de IA válida para proveedor: ${aiConfig?.provider || 'sin proveedor'}`);
        return this.getGenericResponseByType(config.type || 'basic', 'default');
      }

      // Si es DeepSeek y no hay API key, usar la variable de entorno
      if (aiConfig.provider === 'deepseek' && !aiConfig.apiKey) {
        aiConfig.apiKey = process.env.DEEPSEEK_API_KEY;
        this.logger.log(`🔑 Usando API key de DeepSeek desde variable de entorno`);
      }

      this.logger.log(`🧠 Usando IA: ${aiConfig.provider} (${aiConfig.model})`);

      // Generar contexto para la IA (incluyendo contexto de BD externa)
      // Usar chatbotId del parámetro, si no está disponible, extraer del config
      const finalChatbotId = chatbotId || chatbotConfig?.id || chatbotConfig?.chatbotId;
      const systemPrompt = this.buildSystemPrompt(config, aiConfig, finalChatbotId);
      const userPrompt = `Usuario: ${message}`;

      // Llamar a la IA según el proveedor
      const aiResponse = await this.callAIProvider(aiConfig, systemPrompt, userPrompt);
      
      this.logger.log(`✅ Respuesta generada por IA exitosamente`);
      
      // ✨ NUEVA LÓGICA: Detectar si la IA solicita consultar productos
      if (aiResponse.includes('**EJECUTAR_CONSULTA_PRODUCTO:**')) {
        this.logger.log(`🔍 IA solicitó consulta de producto, procesando...`);
        return await this.processProductQuery(aiResponse, finalChatbotId);
      }
      
      return aiResponse;

    } catch (error) {
      this.logger.error(`❌ Error generando respuesta con IA: ${error.message}`);
      return this.getGenericResponseByType(config.type || 'basic', 'default');
    }
  }

  /**
   * NUEVA FUNCIÓN: Procesar consulta de producto
   */
  private async processProductQuery(aiResponse: string, chatbotId: string): Promise<string> {
    try {
      // Extraer producto y marca de la respuesta de la IA
      const productMatch = aiResponse.match(/- Producto:\s*(.+)/);
      const brandMatch = aiResponse.match(/- Marca:\s*(.+)/);
      
      if (!productMatch) {
        this.logger.error('❌ No se pudo extraer el producto de la respuesta de IA');
        return aiResponse.replace('**EJECUTAR_CONSULTA_PRODUCTO:**', '').replace(/- Producto:.*\n?/g, '').replace(/- Marca:.*\n?/g, '').trim();
      }
      
      const producto = productMatch[1].trim();
      const marca = brandMatch && brandMatch[1].trim() !== 'null' ? brandMatch[1].trim() : null;
      
      this.logger.log(`🔍 Ejecutando consulta: Producto="${producto}", Marca="${marca}"`);
      
      // Determinar tipo de consulta según el término
      const queryType = this.databaseMapperService.determineQueryType(producto);
      
      // Ejecutar consulta en la base de datos
      const queryResult = await this.databaseMapperService.executeQuery(chatbotId, queryType, {
        consulta: producto,
        marca: marca
      });
      
      if (queryResult.success && queryResult.data && queryResult.data.length > 0) {
        // Formatear resultados para el usuario
        const formattedResponse = await this.databaseMapperService.formatProductResults(
          queryResult.data, 
          producto, 
          38.5 // Tasa del dólar por defecto
        );
        
        // Combinar respuesta inicial de IA (sin la parte técnica) con los resultados
        const cleanAiResponse = aiResponse.split('**EJECUTAR_CONSULTA_PRODUCTO:**')[0].trim();
        return `${cleanAiResponse}\n\n${formattedResponse}`;
      } else {
        // No se encontraron productos
        const noResultsMessage = `😔 Disculpa, no encontré "${producto}" disponible en este momento. ¿Deseas probar otra marca o presentación?`;
        const cleanAiResponse = aiResponse.split('**EJECUTAR_CONSULTA_PRODUCTO:**')[0].trim();
        return `${cleanAiResponse}\n\n${noResultsMessage}`;
      }
      
    } catch (error) {
      this.logger.error(`❌ Error procesando consulta de producto: ${error.message}`);
      // Retornar respuesta de IA sin la parte técnica
      return aiResponse.replace('**EJECUTAR_CONSULTA_PRODUCTO:**', '').replace(/- Producto:.*\n?/g, '').replace(/- Marca:.*\n?/g, '').trim();
    }
  }

  /**
   * NUEVA FUNCIÓN: Extraer configuración de IA
   */
  private extractAIConfiguration(chatbotConfig: any): any {
    try {
      // Prioridad 1: aiConfig directo
      if (chatbotConfig?.aiConfig) {
        const aiConfig = typeof chatbotConfig.aiConfig === 'string'
          ? JSON.parse(chatbotConfig.aiConfig)
          : chatbotConfig.aiConfig;
        
        if (aiConfig?.provider) {
          this.logger.log(`🔧 Configuración de IA encontrada en aiConfig: ${aiConfig.provider}`);
          return aiConfig;
        }
      }

      // Prioridad 2: desde chatbotConfig anidado
      if (chatbotConfig?.chatbotConfig) {
        const nestedConfig = typeof chatbotConfig.chatbotConfig === 'string'
          ? JSON.parse(chatbotConfig.chatbotConfig)
          : chatbotConfig.chatbotConfig;
        
        if (nestedConfig?.aiConfig?.provider) {
          this.logger.log(`🔧 Configuración de IA encontrada en chatbotConfig.aiConfig: ${nestedConfig.aiConfig.provider}`);
          return nestedConfig.aiConfig;
        }
      }

      // Prioridad 3: en el nivel raíz del chatbotConfig
      if (chatbotConfig?.aiProvider) {
        const rootConfig = {
          provider: chatbotConfig.aiProvider,
          model: chatbotConfig.aiModel || 'deepseek-chat',
          apiKey: chatbotConfig.aiApiKey || '',
          temperature: chatbotConfig.temperature || 0.7
        };
        
        this.logger.log(`🔧 Configuración de IA encontrada en nivel raíz: ${rootConfig.provider}`);
        return rootConfig;
      }

      this.logger.warn(`⚠️ No se encontró configuración de IA`);
      return null;
    } catch (error) {
      this.logger.error(`❌ Error extrayendo configuración de IA: ${error.message}`);
      return null;
    }
  }

    /**
   * NUEVA FUNCIÓN MEJORADA: Construir prompt del sistema para conversaciones humanas + BD Externa
   */
  private buildSystemPrompt(config: any, aiConfig: any, chatbotId?: string): string {
    const companyName = config.companyName || 'Nuestra empresa';
    const botName = config.botName || 'Asistente';
    const chatbotType = config.type || 'basic';

    // BASE: Personalidad humana y natural
    let systemPrompt = `Eres ${botName}, un asistente virtual de ${companyName}. 

🎯 PRINCIPIOS DE CONVERSACIÓN HUMANA:
- Céntrate completamente en ayudar al usuario
- NO vayas de experto, mantén una mentalidad abierta y humilde
- Usa preguntas abiertas para entender mejor las necesidades
- Deja que la conversación fluya naturalmente
- Si no sabes algo, reconócelo honestamente
- NO compares experiencias del usuario con otras
- No te repitas, di las cosas una sola vez
- Omite detalles técnicos innecesarios
- ESCUCHA para entender, no para contestar
- Sé breve y conciso pero amable

💬 ESTILO CONVERSACIONAL:
- Habla como una persona real, no como un robot
- Muestra interés genuino en lo que dice el usuario
- Haz preguntas abiertas: "¿Cómo te sientes con eso?" en lugar de "¿Tienes miedo?"
- Adapta tu tono según el tipo de consulta
- Mantén el hilo de la conversación
- Si el usuario cambia de tema, síguelo naturalmente`;

    // Contexto específico según el tipo de chatbot
    const conversationalContext = {
      basic: `
Tu papel: Eres un asistente amigable que ayuda con consultas generales.
Tono: Profesional pero cálido, como un buen amigo que sabe del tema.
Enfoque: Escucha activamente y ayuda a clarificar lo que realmente necesita el usuario.`,
      
      ecommerce: `
Tu papel: Eres un consultor de ventas experimentado pero sin presión.
Tono: Entusiasta pero respetuoso, nunca agresivo en ventas.
Enfoque: Ayuda al usuario a encontrar lo que realmente necesita, no lo que más cuesta.
- Haz preguntas abiertas sobre sus necesidades: "¿Para qué lo vas a usar principalmente?"
- Sugiere alternativas cuando sea apropiado
- Explica beneficios reales, no características técnicas`,
      
      customer_service: `
Tu papel: Eres un especialista en atención al cliente empático y competente.
Tono: Comprensivo, paciente y orientado a soluciones.
Enfoque: Escucha el problema completo antes de sugerir soluciones.
- Valida los sentimientos: "Entiendo que esto debe ser frustrante"
- Ofrece soluciones paso a paso
- Pregunta si la solución funciona antes de dar más opciones`,
      
      informative: `
Tu papel: Eres un educador que hace complejo simple.
Tono: Didáctico pero accesible, como un profesor favorito.
Enfoque: Explica conceptos de forma que cualquiera pueda entender.
- Usa analogías y ejemplos reales
- Verifica comprensión: "¿Te queda claro esto hasta aquí?"
- Construye conocimiento paso a paso`,
      
      leads: `
Tu papel: Eres un consultor que identifica necesidades reales.
Tono: Consultivo, no vendedor, genuinamente interesado en ayudar.
Enfoque: Haz las preguntas correctas para entender el contexto completo.
- "¿Qué te llevó a buscar esta solución?"
- "¿Cómo imaginas que esto cambiaría tu situación?"
- Ofrece valor antes que vender`
    };

    systemPrompt += (conversationalContext[chatbotType] || conversationalContext.basic);

    // Información de contacto de manera natural
    let contactInfo = `

📞 INFORMACIÓN DE CONTACTO:`;
    if (config.contactPhone) {
      contactInfo += `
Teléfono: ${config.contactPhone}`;
    }
    if (config.contactEmail) {
      contactInfo += `
Email: ${config.contactEmail}`;
    }
    if (config.address) {
      contactInfo += `
Ubicación: ${config.address}`;
    }

    systemPrompt += contactInfo;

    // ✨ NUEVO: Agregar contexto de base de datos externa si está disponible
    if (chatbotId) {
      try {
        const databaseContext = this.databaseMapperService.generateAgentContext(chatbotId);
        if (databaseContext && databaseContext !== "No hay configuración de base de datos externa disponible.") {
          this.logger.log(`🗄️ Incluyendo contexto de base de datos para chatbot ${chatbotId}`);
          systemPrompt += `

🗄️ INFORMACIÓN DE BASE DE DATOS DISPONIBLE:
${databaseContext}

📋 INSTRUCCIONES ESPECIALES PARA CONSULTAS DE PRODUCTOS:
- Cuando el usuario pregunte por productos específicos (ej. "harina pan", "aceite", "azúcar"), necesitas ejecutar una consulta real en la base de datos
- Para consultar productos, sigue este formato EXACTO en tu respuesta:
  
  **EJECUTAR_CONSULTA_PRODUCTO:**
  - Producto: [nombre del producto que solicita el usuario]
  - Marca: [marca específica si la menciona, o null]
  
- Ejemplo de respuesta cuando pregunten por "harina pan":
  "Te ayudo a buscar harina pan en nuestro inventario.
  
  **EJECUTAR_CONSULTA_PRODUCTO:**
  - Producto: harina pan
  - Marca: null"

- Ejemplo si preguntan por "aceite mazola":
  "Voy a consultar si tenemos aceite mazola disponible.
  
  **EJECUTAR_CONSULTA_PRODUCTO:**
  - Producto: aceite
  - Marca: mazola"

🚨 REGLAS IMPORTANTES:
- NUNCA inventes precios o productos que no tienes confirmados
- Siempre usa el formato EJECUTAR_CONSULTA_PRODUCTO cuando pregunten por productos específicos
- Mantén un tono amigable y natural
- Si no es una consulta de producto, responde normalmente`;
        }
      } catch (error) {
        this.logger.warn(`⚠️ No se pudo cargar contexto de BD para chatbot ${chatbotId}: ${error.message}`);
      }
    }

    // Reglas finales para conversación natural
    systemPrompt += `

🎪 REGLAS FINALES:
- Responde siempre en español, de forma natural y conversacional
- Si detectas una emergencia médica, recomienda contactar un profesional
- No inventes información que no tengas
- Si algo está fuera de tu ámbito, derivala a contacto humano
- Mantén respuestas entre 50-150 palabras (como una minifalda: suficientemente corta para mantener interés, suficientemente larga para cubrir el asunto)
- NUNCA uses formato de lista a menos que sea estrictamente necesario
- Habla como hablaría una persona real en esa situación`;

    return systemPrompt;
  }

  /**
   * NUEVA FUNCIÓN: Llamar al proveedor de IA
   */
  private async callAIProvider(aiConfig: any, systemPrompt: string, userPrompt: string): Promise<string> {
    const provider = aiConfig.provider?.toLowerCase();

    switch (provider) {
      case 'deepseek':
        return await this.callDeepSeek(aiConfig, systemPrompt, userPrompt);
      case 'openai':
        return await this.callOpenAI(aiConfig, systemPrompt, userPrompt);
      case 'anthropic':
        return await this.callAnthropic(aiConfig, systemPrompt, userPrompt);
      default:
        throw new Error(`Proveedor de IA no soportado: ${provider}`);
    }
  }

  /**
   * NUEVA FUNCIÓN: Llamar a DeepSeek
   */
  private async callDeepSeek(aiConfig: any, systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      this.logger.log(`🧠 Llamando a DeepSeek API...`);
      const startTime = Date.now();
      
      const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
        model: aiConfig.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: aiConfig.temperature || 0.7,
        max_tokens: aiConfig.maxTokens || 1000
      }, {
        headers: {
          'Authorization': `Bearer ${aiConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000  // 20 segundos
      });

      const responseTime = Date.now() - startTime;
      this.logger.log(`✅ DeepSeek respondió exitosamente en ${responseTime}ms (${response.data.usage?.total_tokens || 'N/A'} tokens)`);
      
      return response.data.choices[0].message.content;
    } catch (error) {
      this.logger.error(`❌ Error llamando a DeepSeek: ${error.message}`);
      if (error.response) {
        this.logger.error(`   Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * NUEVA FUNCIÓN: Llamar a OpenAI
   */
  private async callOpenAI(aiConfig: any, systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      this.logger.log(`🧠 Llamando a OpenAI API...`);
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: aiConfig.model || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: aiConfig.temperature || 0.7,
        max_tokens: aiConfig.maxTokens || 1000
      }, {
        headers: {
          'Authorization': `Bearer ${aiConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      this.logger.log(`✅ OpenAI respondió exitosamente`);
      return response.data.choices[0].message.content;
    } catch (error) {
      this.logger.error(`❌ Error llamando a OpenAI: ${error.message}`);
      throw error;
    }
  }

  /**
   * NUEVA FUNCIÓN: Llamar a Anthropic
   */
  private async callAnthropic(aiConfig: any, systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      this.logger.log(`🧠 Llamando a Anthropic API...`);
      const response = await axios.post('https://api.anthropic.com/v1/messages', {
        model: aiConfig.model || 'claude-3-sonnet-20240229',
        max_tokens: aiConfig.maxTokens || 1000,
        temperature: aiConfig.temperature || 0.7,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      }, {
        headers: {
          'x-api-key': aiConfig.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        timeout: 15000
      });

      this.logger.log(`✅ Anthropic respondió exitosamente`);
      return response.data.content[0].text;
    } catch (error) {
      this.logger.error(`❌ Error llamando a Anthropic: ${error.message}`);
      throw error;
    }
  }

  private selectRandomResponse(response: string | string[]): string {
    if (Array.isArray(response)) {
      return response[Math.floor(Math.random() * response.length)];
    }
    return response || 'Respuesta no disponible';
  }

  private extractChatbotConfiguration(chatbotConfig: any): any {
    try {
      // Prioridad 1: chatbotConfig
      if (chatbotConfig?.chatbotConfig) {
        const config = typeof chatbotConfig.chatbotConfig === 'string' 
          ? JSON.parse(chatbotConfig.chatbotConfig) 
          : chatbotConfig.chatbotConfig;
        
        if (config && Object.keys(config).length > 0) {
          this.logger.log(`✅ Configuración extraída de chatbotConfig`);
          return config;
        }
      }

      // Prioridad 2: aiConfig
      if (chatbotConfig?.aiConfig) {
        const aiConfig = typeof chatbotConfig.aiConfig === 'string'
          ? JSON.parse(chatbotConfig.aiConfig)
          : chatbotConfig.aiConfig;
        
        if (aiConfig && Object.keys(aiConfig).length > 0) {
          this.logger.log(`✅ Configuración extraída de aiConfig`);
          return aiConfig;
        }
      }

      // Prioridad 3: configuración directa
      if (chatbotConfig && typeof chatbotConfig === 'object') {
        this.logger.log(`✅ Usando configuración directa`);
        return chatbotConfig;
      }

      this.logger.warn(`⚠️ No se encontró configuración válida`);
      return null;

    } catch (error) {
      this.logger.error(`❌ Error extrayendo configuración: ${error.message}`);
      return null;
    }
  }

  private analyzeIntent(message: string, config: any): string {
    // Keywords configurables por tipo de chatbot
    const intentKeywords = config.intents || {};
    
    // Revisar cada intent configurado
    for (const [intent, keywords] of Object.entries(intentKeywords)) {
      if (Array.isArray(keywords) && keywords.some(keyword => message.includes(keyword.toLowerCase()))) {
        this.logger.log(`🎯 Intent detectado: ${intent}`);
        return intent;
      }
    }

    // Fallback a intents básicos si no hay configuración específica
    const basicIntents = this.getBasicIntents();
    for (const [intent, keywords] of Object.entries(basicIntents)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        this.logger.log(`🎯 Intent básico detectado: ${intent}`);
        return intent;
      }
    }

    return 'default';
  }

  private getBasicIntents(): Record<string, string[]> {
    return {
      greeting: ['hola', 'hello', 'hi', 'buenos días', 'buenas tardes', 'buenas noches'],
      help: ['ayuda', 'help', 'asistencia', 'soporte'],
      info: ['información', 'info', 'datos', 'detalles'],
      contact: ['contacto', 'teléfono', 'email', 'dirección'],
      hours: ['horario', 'hora', 'abierto', 'cerrado', 'atención'],
      location: ['ubicación', 'dirección', 'donde', 'llegar', 'mapa'],
      price: ['precio', 'costo', 'valor', 'cuanto', 'tarifa'],
      service: ['servicio', 'producto', 'ofrecer', 'hacer'],
      medications: ['paracetamol', 'ibuprofeno', 'aspirina', 'medicamento', 'medicina', 'pastilla']
    };
  }

  private generateConfigurableResponse(intent: string, originalMessage: string, config: any): string {
    // Respuestas completamente configurables
    const responses = config.responses || {};
    
    // Buscar respuesta específica para el intent
    if (responses[intent]) {
      this.logger.log(`✅ Usando respuesta configurada para intent: ${intent}`);
      const response = this.selectRandomResponse(responses[intent]);
      return this.processResponseTemplate(response, originalMessage, config);
    }

    // Buscar respuesta por defecto
    if (responses.default || responses.greeting) {
      const defaultResponse = responses.default || responses.greeting;
      this.logger.log(`✅ Usando respuesta por defecto`);
      const response = this.selectRandomResponse(defaultResponse);
      return this.processResponseTemplate(response, originalMessage, config);
    }

    // Última opción: respuesta genérica basada en tipo
    this.logger.warn(`⚠️ No hay respuesta configurada para intent: ${intent}, usando genérica`);
    return this.getGenericResponseByType(config.type || 'basic', intent);
  }

  private processResponseTemplate(response: string, originalMessage: string, config: any): string {
    // Procesar variables en la respuesta
    let processedResponse = response;
    
    // Variables básicas
    processedResponse = processedResponse.replace(/\{user_message\}/g, originalMessage);
    processedResponse = processedResponse.replace(/\{bot_name\}/g, config.botName || 'Asistente');
    processedResponse = processedResponse.replace(/\{company_name\}/g, config.companyName || 'Nuestra empresa');
    
    // Variables de contacto
    if (config.contactPhone) {
      processedResponse = processedResponse.replace(/\{contact_phone\}/g, config.contactPhone);
    }
    if (config.contactEmail) {
      processedResponse = processedResponse.replace(/\{contact_email\}/g, config.contactEmail);
    }
    if (config.address) {
      processedResponse = processedResponse.replace(/\{address\}/g, config.address);
    }
    
    return processedResponse;
  }

  private getGenericResponseByType(type: string, intent: string): string {
    const genericResponses = {
      basic: {
        greeting: "¡Hola! ¿En qué puedo ayudarte hoy?",
        help: "Estoy aquí para ayudarte. ¿Qué necesitas saber?",
        default: "Gracias por tu mensaje. ¿Puedes ser más específico sobre lo que necesitas?"
      },
      ecommerce: {
        greeting: "¡Bienvenido! ¿Qué producto estás buscando?",
        help: "Te ayudo con información sobre productos, precios y pedidos.",
        default: "Estoy aquí para ayudarte con cualquier consulta sobre productos o servicios."
      },
      customer_service: {
        greeting: "¡Hola! Soy tu asistente de atención al cliente.",
        help: "Estoy aquí para resolver tus consultas y problemas.",
        default: "Gracias por contactarnos. ¿En qué puedo asistirte?"
      }
    };

    const typeResponses = genericResponses[type] || genericResponses.basic;
    return typeResponses[intent] || typeResponses.default;
  }

    private getGenericErrorResponse(): string {
    return `🤖 Disculpa, tuvimos un inconveniente técnico.

🔄 Por favor, intenta nuevamente en unos momentos.

Si el problema persiste, contacta a soporte técnico.`;
  }

  /**
   * 🆕 NUEVO: Obtener o crear sesión persistente
   */
  private async getOrCreateSession(phoneNumber: string, chatbotId: string): Promise<PersistentSession> {
    try {
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
        // Crear nueva sesión
        session = this.persistentSessionRepository.create({
          phoneNumber: normalizedPhone,
          activeChatbotId: chatbotId,
          isAuthenticated: false,
          isNewClient: false,
          context: 'new_session',
          status: 'active',
          messageCount: 0,
          searchCount: 0,
          lastActivity: new Date(),
          metadata: {
            chatbotType: 'generic',
            serviceName: 'GenericChatbotService'
          }
        });
        
        this.logger.log(`🆕 Nueva sesión genérica creada para ${normalizedPhone}`);
      } else {
        // Actualizar última actividad
        session.lastActivity = new Date();
      }
      
      return session;
    } catch (error) {
      this.logger.error(`❌ Error creando/obteniendo sesión: ${error.message}`);
      throw error;
    }
  }

}