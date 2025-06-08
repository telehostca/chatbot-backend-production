/**
 * Servicio especializado para manejar chatbots de tipo Valery.
 * Gestiona sesiones persistentes, autenticación automática, búsquedas inteligentes
 * y análisis de patrones de usuario para una experiencia personalizada.
 * 
 * @class ValeryChatbotService
 */
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { ValeryDbService } from './valery-db.service';
import { TemplateService, TemplateContext } from '../chat/services/template.service';
import { AutoResponseService } from '../chat/services/auto-response.service';
import { ChatService } from '../chat/chat.service';
import { TemplateType } from '../chat/entities/message-template.entity';
import { PersistentSession } from '../chat/entities/persistent-session.entity';
import { SearchHistory } from '../chat/entities/search-history.entity';
import { ShoppingCart } from '../chat/entities/shopping-cart.entity';
import { ChatMessage } from '../chat/entities/message.entity';
import { ValeryToolsService } from './tools/valery-tools.service';
import { Client } from 'pg';

interface EstadoChat {
  paso: number;
  cliente?: any;
  productos: any[];
  metodoPago?: any;
  banco?: any;
  total: number;
  subtotal: number;
  iva: number;
  tipoEntrega?: string;
  direccionEntrega?: string;
  cedulaRifIngresada?: string;
  nombreCompletoIngresado?: string;
  carritoCompras: any[];
  idPedidoCreado?: string;
  comprobanteInfo?: string;
  ocrMontoReportado?: string;
  ocrReferenciaReportada?: string;
  modoDebug?: boolean;
}

@Injectable()
export class ValeryChatbotService {
  private readonly logger = new Logger(ValeryChatbotService.name);
  private estadosChat: Map<string, EstadoChat> = new Map();
  private readonly SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 horas para sesiones persistentes

  constructor(
    private readonly configService: ConfigService,
    private valeryDbService: ValeryDbService,
    @Inject(forwardRef(() => TemplateService))
    private templateService: TemplateService,
    @Inject(forwardRef(() => AutoResponseService))
    private autoResponseService: AutoResponseService,
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
    private readonly valeryToolsService: ValeryToolsService
  ) {
    this.logger.log('🚀 ValeryChatbotService inicializado con funcionalidades avanzadas (similar a n8n)');
    // Limpiar sesiones inactivas cada 30 minutos
    setInterval(() => this.cleanInactiveSessions(), 30 * 60 * 1000);
  }

  async handleMessage(message: string, phoneNumber: string, chatbotId: string): Promise<string> {
    try {
      this.logger.debug(`📱 Procesando mensaje de ${phoneNumber}: ${message}`);
      
      // Normalizar número de teléfono
      const normalizedPhoneNumber = this.normalizePhoneNumber(phoneNumber);
      
      // Obtener o crear sesión persistente
      let session = await this.getOrCreateSession(normalizedPhoneNumber, chatbotId);
      
      // Si es una nueva sesión (messageCount === 0), buscar cliente automáticamente
      if (session.messageCount === 0) {
        this.logger.log(`🆕 PRIMERA INTERACCIÓN - Ejecutando autovalidación por teléfono: ${normalizedPhoneNumber}`);
        await this.autoAuthenticateByPhone(session, chatbotId);
        
        // 🆕 ANALIZAR SI EL PRIMER MENSAJE CONTIENE CÉDULA
        const messageIntent = await this.analyzeMessageIntent(message, session);
        this.logger.log(`🔍 Análisis del primer mensaje: ${messageIntent.type} (${message})`);
        
        if (messageIntent.type === 'identification') {
          this.logger.log(`🆔 CÉDULA DETECTADA EN PRIMER MENSAJE: ${messageIntent.entities.identification}`);
          
          // Procesar la cédula inmediatamente
          session.messageCount += 1;
          session.lastActivity = new Date();
          session.lastUserMessage = message;
          
          const response = await this.handleClientIdentification(messageIntent.entities.identification, session, chatbotId);
          session.lastBotResponse = response;
          await this.chatService.saveSession(session);
          await this.saveMessage(session, message, response);
          return response;
        }
        
        // Si no es cédula, generar mensaje de bienvenida normal
        this.logger.log(`💬 Generando mensaje de bienvenida para primer mensaje: ${message}`);
        
        // Incrementar messageCount ANTES de generar el mensaje de bienvenida
        session.messageCount += 1;
        session.lastActivity = new Date();
        session.lastUserMessage = message;
        
        await this.chatService.saveSession(session);
        
        // Generar saludo personalizado e inteligente
        const welcomeMessage = await this.generateIntelligentWelcome(session, chatbotId);
        session.lastBotResponse = welcomeMessage;
        await this.chatService.saveSession(session);
        await this.saveMessage(session, message, welcomeMessage);
        return welcomeMessage;
      }
      
      this.logger.log(`🔄 SESIÓN EXISTENTE - messageCount: ${session.messageCount}, contexto: ${session.context}, autenticado: ${session.isAuthenticated}`);
      
      // Actualizar actividad de la sesión para mensajes subsiguientes
      session.lastActivity = new Date();
      session.lastUserMessage = message;
      session.messageCount += 1;
      
      // Analizar y procesar el mensaje con IA
      const response = await this.processIntelligentMessage(message, session, chatbotId);
      
      // Guardar el intercambio de mensajes
      session.lastBotResponse = response;
      await this.chatService.saveSession(session);
      await this.saveMessage(session, message, response);
      
      return response;
      
    } catch (error) {
      this.logger.error(`❌ Error crítico al procesar mensaje: ${error.message}`, error.stack);
      
      // Respuesta de error inteligente
      const errorMessage = await this.handleIntelligentError(error, chatbotId);
      return errorMessage;
    }
  }

  private async getOrCreateSession(phoneNumber: string, chatbotId: string): Promise<PersistentSession> {
    try {
      // Primero intentamos encontrar una sesión existente
      let session = await this.chatService.findSession(phoneNumber, 'active');

      if (session) {
        // Verificar si la sesión ha expirado
        const timeSinceLastActivity = Date.now() - session.lastActivity.getTime();
        if (timeSinceLastActivity > this.SESSION_TIMEOUT) {
          // Reactivar sesión expirada
          session.status = 'active';
          session.lastActivity = new Date();
          this.logger.debug(`🔄 Sesión reactivada: ${session.id}`);
        }
        
        // Actualizar el último momento de actividad
        session.lastActivity = new Date();
        await this.chatService.saveSession(session);
        
        return session;
      } else {
        try {
          // Crear una nueva sesión
          session = this.chatService.createSession(phoneNumber, chatbotId, 'active');
          await this.chatService.saveSession(session);
          this.logger.debug(`🆕 Nueva sesión persistente creada: ${session.id}`);
          return session;
        } catch (createError) {
          // Si falla por UNIQUE constraint, intentamos recuperar la sesión existente una vez más
          if (createError.message.includes('UNIQUE constraint failed') || 
              createError.message.includes('duplicate key value')) {
            this.logger.warn(`Conflicto al crear sesión para ${phoneNumber}, intentando recuperar existente...`);
            
            // Intentar recuperar nuevamente (puede haber sido creada en paralelo)
            session = await this.chatService.findSession(phoneNumber, 'active');
            if (session) {
              session.lastActivity = new Date();
              await this.chatService.saveSession(session);
              return session;
            }
            
            // Si aún no la encontramos, buscamos por número sin importar el estado
            const anySession = await this.chatService.findSessionByPhoneOnly(phoneNumber);
            if (anySession) {
              // Reactivar la sesión encontrada
              anySession.status = 'active';
              anySession.lastActivity = new Date();
              await this.chatService.saveSession(anySession);
              this.logger.debug(`♻️ Sesión existente reactivada: ${anySession.id}`);
              return anySession;
            }
          }
          // Si llegamos aquí, es un error que no podemos manejar
          throw createError;
        }
      }
    } catch (error) {
      this.logger.error(`Error al obtener/crear sesión: ${error.message}`, error.stack);
      throw error;
    }
  }

  private normalizePhoneNumber(phoneNumber: string): string {
    this.logger.debug(`🔧 Normalizando número: "${phoneNumber}"`);
    
    // Limpiar y normalizar número de teléfono
    const cleanNumber = phoneNumber.replace(/@s\.whatsapp\.net|[\s\-\(\)]/g, '');
    this.logger.debug(`🔧 Número limpio: "${cleanNumber}"`);
    
    // Convertir formato internacional a local venezolano
    if (cleanNumber.startsWith('58') && cleanNumber.length > 10) {
      const normalized = '0' + cleanNumber.slice(2);
      this.logger.debug(`🔧 Número normalizado (58->0): "${normalized}"`);
      return normalized;
    }
    
    this.logger.debug(`🔧 Número sin cambios: "${cleanNumber}"`);
    return cleanNumber;
  }

  private async autoAuthenticateByPhone(session: PersistentSession, chatbotId: string): Promise<void> {
    try {
      this.logger.log('🔍 AUTOVALIDACION POR TELEFONO: ' + session.phoneNumber);
      
      // USAR CONFIGURACION DIRECTA DEL CHATBOT
      const chatbotConfig = await this.getChatbotConfig(chatbotId);
      
      if (!chatbotConfig?.externalDbConfig) {
        this.logger.warn('❌ No hay configuración de BD externa en el chatbot');
        session.isNewClient = true;
        session.isAuthenticated = false;
        session.context = 'new_client';
        return;
      }
      
      const dbConfig = chatbotConfig.externalDbConfig;
      this.logger.log('🔗 Usando BD externa: ' + dbConfig.host + ':' + dbConfig.port + '/' + dbConfig.database);
      
      // CREAR CONEXION DIRECTA
      const { Client } = require('pg');
      const dbClient = new Client({
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.username,
        password: dbConfig.password,
        ssl: dbConfig.ssl || false
      });
      
      await dbClient.connect();
      this.logger.log('✅ Conexión directa establecida');
      
      // BUSCAR CLIENTE POR TELEFONO CON MULTIPLES FORMATOS
      const phoneFormats = [
        session.phoneNumber,                          // Original: 584245325586
        session.phoneNumber.replace(/^58/, ''),       // Sin código país: 4245325586  
        session.phoneNumber.replace(/^584/, '04'),    // Formato nacional: 04245325586
        session.phoneNumber.replace(/^58/, '0'),      // Con 0 inicial: 04245325586
        '+' + session.phoneNumber,                    // Internacional: +584245325586
        session.phoneNumber.slice(-10),               // Últimos 10: 4245325586
        session.phoneNumber.slice(-11),               // Últimos 11: 24245325586
        '0' + session.phoneNumber.slice(-10),         // 0 + últimos 10: 04245325586
        session.phoneNumber.replace(/^584(.*)/, '0414$1'), // Cambiar operadora 424→414
        session.phoneNumber.replace(/^584(.*)/, '0416$1'), // Cambiar operadora 424→416
        session.phoneNumber.replace(/^584(.*)/, '0426$1')  // Cambiar operadora 424→426
      ];
      
      this.logger.log('🔍 Buscando telefono en formatos: ' + phoneFormats.join(', '));
      
      const query = `
        SELECT 
          idcliente,
          codigocliente,
          nombre,
          rif,
          direccion1,
          direccion2,
          telefono1,
          telefono2,
          email,
          tienecredito,
          diascredito,
          saldo,
          status,
          fechacreacion,
          fechaultimaventa,
          pagos
        FROM clientes 
        WHERE (telefono1 = ANY($1) OR telefono2 = ANY($1))
          AND status IS NOT NULL
          AND status != 'INACTIVO'
        ORDER BY 
          CASE 
            WHEN telefono1 = ANY($1) THEN 1
            WHEN telefono2 = ANY($1) THEN 2
            ELSE 3
          END,
          fechaultimaventa DESC NULLS LAST,
          idcliente DESC
        LIMIT 1
      `
      
      const result = await dbClient.query(query, [phoneFormats]);
      await dbClient.end();
      
      if (result.rows && result.rows.length > 0) {
        const cliente = result.rows[0];
        
        this.logger.log('🎉 CLIENTE ENCONTRADO! ' + cliente.nombre + ' (' + cliente.codigocliente + ')');
        this.logger.log('📱 Telefonos BD: ' + cliente.telefono1 + ' | ' + cliente.telefono2);
        
        // Cliente encontrado - autenticar automaticamente
        session.clientId = cliente.codigocliente;
        session.clientName = cliente.nombre;
        session.identificationNumber = cliente.rif;
        session.isAuthenticated = true;
        session.isNewClient = false;
        session.context = 'menu';
        session.metadata = {
          ...session.metadata,
          clientInfo: {
            hasCredit: !!cliente.tienecredito,
            creditDays: cliente.diascredito,
            balance: cliente.saldo,
            status: cliente.status,
            address: cliente.direccion1,
            email: cliente.email
          }
        };
        
        this.logger.log('✅ Cliente autenticado automaticamente: ' + cliente.nombre);
        
      } else {
        this.logger.log('❌ CLIENTE NO ENCONTRADO para telefono: ' + session.phoneNumber);
        this.logger.log('🔍 Formatos buscados: ' + phoneFormats.join(', '));
        
        // Cliente no encontrado
        session.isNewClient = true;
        session.isAuthenticated = false;
        session.context = 'new_client';
        
        this.logger.log('👤 Marcado como cliente nuevo: ' + session.phoneNumber);
      }
      
    } catch (error) {
      this.logger.error('❌ Error en autenticacion automatica: ' + error.message);
      this.logger.error('Stack: ' + error.stack);
      
      // En caso de error, tratar como cliente nuevo
      session.isNewClient = true;
      session.isAuthenticated = false;
      session.context = 'error_fallback';
      
      this.logger.log('🔄 Fallback: Marcado como cliente nuevo por error');
    }
  }

  private async generateIntelligentWelcome(session: PersistentSession, chatbotId: string): Promise<string> {
    try {
      const currentHour = new Date().getHours();
      let timeGreeting = this.getTimeBasedGreeting(currentHour);
      
      if (session.isAuthenticated && !session.isNewClient) {
        // Cliente existente - saludo personalizado con análisis de comportamiento
        const recentSearches = await this.getRecentSearches(session.phoneNumber, 5);
        const cartItems = await this.getActiveCartItems(session.phoneNumber);
        
        let personalizedMessage = `🎉 ${timeGreeting}, **${session.clientName}**! 🌟\n`;
        personalizedMessage += `═══════════════════════════\n`;
        personalizedMessage += `✨ ¡Qué alegría tenerle de vuelta en **GómezMarket**! ✨\n\n`;
        
        // Añadir información contextual inteligente
        if (cartItems.length > 0) {
          personalizedMessage += `🛒 **CARRITO GUARDADO** 🛒\n`;
          personalizedMessage += `📦 Tiene ${cartItems.length} producto(s) esperándole\n`;
          personalizedMessage += `💾 Todo guardado y listo para continuar\n\n`;
        }
        
        if (recentSearches.length > 0) {
          const lastSearch = recentSearches[0];
          const daysSinceLastSearch = Math.floor((Date.now() - lastSearch.createdAt.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysSinceLastSearch <= 7) {
            personalizedMessage += `🔍 **BÚSQUEDAS RECIENTES** 🔍\n`;
            personalizedMessage += `💡 ¿Busca algo similar a "${lastSearch.originalSearchTerm}"?\n`;
            personalizedMessage += `📈 Tenemos nuevas ofertas disponibles\n\n`;
          }
        }
        
        personalizedMessage += `🎯 **¿EN QUÉ LE PUEDO AYUDAR HOY?** 🎯\n`;
        personalizedMessage += `═══════════════════════════\n\n`;
        personalizedMessage += `1️⃣ 🔍 **Consultar productos** → Buscar ofertas\n`;
        personalizedMessage += `2️⃣ 💰 **Ver mi saldo** → Estado de cuenta\n`;
        personalizedMessage += `3️⃣ 📄 **Historial facturas** → Mis compras\n`;
        personalizedMessage += `4️⃣ 🛒 **Hacer un pedido** → ¡Comprar ahora!\n\n`;
        personalizedMessage += `💬 O simplemente escriba lo que necesita... 🚀`;
        
        return personalizedMessage;
      } else {
        // Cliente nuevo - bienvenida impactante
        return `🎊 ${timeGreeting}! 🎊\n` +
               `═══════════════════════════\n` +
               `🌟 **¡BIENVENIDO A GÓMEZMARKET!** 🌟\n` +
               `🤖 Soy **GómezBot**, su asistente personal\n\n` +
               `🎯 **PARA COMENZAR** 🎯\n` +
               `═══════════════════════════\n` +
               `📝 Indíqueme su **cédula o RIF**\n` +
               `✨ Le ofreceré un servicio personalizado\n` +
               `🚀 ¡Descubra nuestras ofertas exclusivas!\n\n` +
               `📌 **Ejemplo:** V12345678 o J408079305\n` +
               `💎 ¡Su experiencia premium comienza aquí! 💎`;
      }
    } catch (error) {
      this.logger.error(`Error generando bienvenida: ${error.message}`);
      return `🎉 ¡BIENVENIDO A GÓMEZMARKET! 🎉\n` +
             `═══════════════════════════\n` +
             `🤖 Soy **GómezBot** 🚀\n` +
             `✨ ¿En qué puedo ayudarle hoy? ✨`;
    }
  }

  private getTimeBasedGreeting(hour: number): string {
    if (hour >= 6 && hour <= 11) return '🌅 ¡BUENOS DÍAS';
    if (hour >= 12 && hour <= 18) return '☀️ ¡BUENAS TARDES';
    if (hour > 18 && hour <= 23) return '🌙 ¡BUENAS NOCHES';
    return '🌜 ¡BUENA MADRUGADA';
  }

  private async processIntelligentMessage(message: string, session: PersistentSession, chatbotId: string): Promise<string> {
    try {
      // Normalizar y analizar el mensaje
      const normalizedMessage = this.normalizeMessage(message);
      const messageIntent = await this.analyzeMessageIntent(normalizedMessage, session);
      
      this.logger.debug(`🧠 Intención detectada: ${messageIntent.type} (confianza: ${messageIntent.confidence})`);
      
      // Si está en proceso de registro, manejar el registro
      if (session.context === 'new_client_registration') {
        return await this.handleNewClientRegistration(message, session, chatbotId);
      }
      
      // Si es un cliente nuevo que no está autenticado, verificar si envió cédula
      if (session.context === 'new_client' && !session.isAuthenticated) {
        // PRIMERO verificar si el mensaje contiene una cédula
        if (messageIntent.type === 'identification') {
          this.logger.log(`🆔 CÉDULA DETECTADA EN CLIENTE NUEVO: ${messageIntent.entities.identification}`);
          return await this.handleClientIdentification(messageIntent.entities.identification, session, chatbotId);
        }
        
        // Si no es cédula, solicitar identificación
        this.logger.log(`👤 NUEVO CLIENTE - Solicitando identificación`);
        return await this.generateNewClientWelcome(session);
      }
      
      // Si está en selección de método de pago
      if (session.context === 'checkout_payment_selection') {
        if (message.toLowerCase().includes('cancelar')) {
          session.context = 'menu';
          await this.chatService.saveSession(session);
          return `🔄 **CHECKOUT CANCELADO** 🔄\n` +
                 `═══════════════════════════\n` +
                 `↩️ Regresando al menú principal\n` +
                 `🛒 Su carrito se mantiene intacto\n\n` +
                 `🎯 **¿Qué desea hacer?**\n` +
                 `═══════════════════════════\n` +
                 `🔍 Seguir comprando\n` +
                 `👀 Ver carrito\n` +
                 `💬 Buscar productos`;
        }
        return await this.handlePaymentSelection(message, session, chatbotId);
      }

      // Nuevos contextos para validación de pago móvil
      if (session.context ===   'payment_bank_selection') {
        return await this.handleBankSelection(message, session, chatbotId);
      }

      if (session.context === 'payment_phone_input') {
        return await this.handlePaymentPhoneInput(message, session, chatbotId);
      }

      if (session.context === 'payment_cedula_input') {
        return await this.handlePaymentCedulaInput(message, session, chatbotId);
      }

      if (session.context === 'payment_reference_input') {
        return await this.handlePaymentReferenceInput(message, session, chatbotId);
      }

      // Manejo de búsqueda por listas
      if (session.context === 'product_search' && this.esListaProductos(message)) {
        return await this.handleProductListSearch(message, session, chatbotId);
      }
      
      // Procesar según la intención y contexto
      switch (messageIntent.type) {
        case 'product_search':
          return await this.handleIntelligentProductSearch(messageIntent.entities.searchTerm, session, chatbotId);
          
        case 'menu_option':
          return await this.handleMenuOption(messageIntent.entities.option, session, chatbotId);
          
        case 'cart_action':
          return await this.handleCartAction(messageIntent.entities.action, messageIntent.entities.product, session, chatbotId);
          
        case 'identification':
          return await this.handleClientIdentification(messageIntent.entities.identification, session, chatbotId);
          
        case 'greeting':
          return await this.handleGreeting(session, chatbotId);
          
        case 'help':
          return await this.handleHelpRequest(session, chatbotId);
          
        default:
          return await this.handleUnknownIntent(message, session, chatbotId);
      }
    } catch (error) {
      this.logger.error(`Error procesando mensaje inteligente: ${error.message}`);
      return await this.handleIntelligentError(error, chatbotId);
    }
  }

  private async handleIntelligentProductSearch(searchTerm: string, session: PersistentSession, chatbotId: string): Promise<string> {
    try {
      session.context = 'product_search';
      session.searchCount += 1;
      
      // Analizar si es una búsqueda compuesta (múltiples productos)
      const searchTerms = this.detectMultipleSearchTerms(searchTerm);
      
      if (searchTerms.length > 1) {
        return await this.handleMultipleProductSearch(searchTerms, session, chatbotId);
      }
      
      // Normalizar término de búsqueda
      const normalizedSearchTerm = this.normalizeSearchTerm(searchTerm);
      
      // Búsqueda inteligente con múltiples estrategias
      const searchStrategies = [
        // Búsqueda exacta
        { term: normalizedSearchTerm, type: 'exact' },
        // Búsqueda por palabras individuales
        { term: normalizedSearchTerm, type: 'words' },
        // Búsqueda con sinónimos (si implementas)
        // { term: await this.expandWithSynonyms(normalizedSearchTerm), type: 'synonyms' }
      ];
      
      let productos = [];
      let searchType = '';
      
      for (const strategy of searchStrategies) {
        productos = await this.searchProductsWithStrategy(strategy.term, strategy.type, chatbotId);
        if (productos.length > 0) {
          searchType = strategy.type;
          break;
        }
      }
      
      // Guardar búsqueda en historial y en contexto de sesión
      await this.saveSearchHistory(session, searchTerm, normalizedSearchTerm, productos.length, chatbotId);
      
      // Guardar resultados en el contexto de sesión para referencia futura
      if (productos.length > 0) {
        session.metadata = {
          ...session.metadata,
          lastSearchResults: productos.slice(0, 10).map(p => ({
            id: p.id || p.codigo,
            name: p.nombre,
            price: p.preciounidad
          }))
        };
      }
      
      if (productos.length === 0) {
        // Sugerir búsquedas alternativas basadas en historial
        const suggestions = await this.getSimilarSearchSuggestions(session.phoneNumber, normalizedSearchTerm);
        
        // Create a more natural no-results response with variations
        const noResultsIntros = [
          `No encontré "${searchTerm}" en el inventario actual.`,
          `Parece que no tenemos "${searchTerm}" disponible en este momento.`,
          `Lo siento, busqué "${searchTerm}" pero no encontré resultados.`,
          `No hay "${searchTerm}" en el inventario ahora mismo.`
        ];
        
        const intro = noResultsIntros[Math.floor(Math.random() * noResultsIntros.length)];
        let response = `❓ **${intro}**`;
        
        if (suggestions.length > 0) {
          response += `\n\n💡 ¿Quizás te interesen estas alternativas?\n`;
          suggestions.forEach((suggestion, index) => {
            response += `  • **${suggestion}**\n`;
          });
        }
        
        // Add helpful suggestions in a conversational tone with minimal formatting
        response += `\n🔍 ¿Podrías intentar con otra marca o una descripción más general? `;
        response += `También puedes escribir "**ayuda**" si necesitas más opciones.`;
        
        return response;
      }
      
      // Formatear resultados con información inteligente
      return await this.formatIntelligentProductResults(productos, searchTerm, searchType, session);
      
    } catch (error) {
      this.logger.error(`Error en búsqueda inteligente: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Detecta si un término contiene múltiples búsquedas separadas
   */
  private detectMultipleSearchTerms(searchTerm: string): string[] {
    // Patrones para detectar conjunciones y separadores
    const conjunctions = /\s+(y|tambien|también|además|ademas|con)\s+/i;
    const productSeparators = /\s*[,.;]\s*/;
    
    // Verificar si hay conjunciones claras
    if (conjunctions.test(searchTerm)) {
      // Dividir por conjunciones pero mantener la estructura de frase
      return searchTerm
        .split(conjunctions)
        .filter(term => term.length > 2 && !['y', 'tambien', 'también', 'además', 'ademas', 'con'].includes(term.toLowerCase()))
        .map(term => term.trim());
    }
    
    // Verificar si hay separadores
    if (productSeparators.test(searchTerm)) {
      // Dividir por separadores
      return searchTerm
        .split(productSeparators)
        .filter(term => term.length > 2)
        .map(term => term.trim());
    }
    
    // Si no se identifican múltiples búsquedas
    return [searchTerm];
  }
  
  /**
   * Procesa múltiples búsquedas de productos cuando el usuario pide varios a la vez
   */
  private async handleMultipleProductSearch(searchTerms: string[], session: PersistentSession, chatbotId: string): Promise<string> {
    this.logger.log(`🧮 Procesando búsqueda múltiple con ${searchTerms.length} productos`);
    
    // Realizar búsquedas independientes para cada término
    const results = await Promise.all(searchTerms.map(async (term) => {
      const normalizedTerm = this.normalizeSearchTerm(term);
      const productos = await this.searchProductsWithStrategy(normalizedTerm, 'exact', chatbotId);
      return {
        term,
        productos: productos.slice(0, 3), // Limitar a 3 resultados por término
        found: productos.length > 0
      };
    }));
    
    // Contar resultados encontrados/no encontrados
    const found = results.filter(r => r.found).length;
    const notFound = results.length - found;
    
    // Construir respuesta amigable
    let response = '';
    
    // Introducción personalizada según resultados
    if (found === results.length) {
      response = `¡Genial! Encontré todos los productos que buscabas:\n\n`;
    } else if (found > 0) {
      response = `Encontré algunos de los productos que mencionaste:\n\n`;
    } else {
      response = `Lo siento, no encontré ninguno de los productos que mencionaste.\n\n`;
    }
    
    // Mostrar cada grupo de resultados
    let allProducts: any[] = [];
    
    results.forEach((result, index) => {
      if (result.found) {
        response += `📌 **${result.term}**:\n`;
        result.productos.forEach((p, i) => {
          const price = parseFloat(p.preciounidad || 0).toFixed(2);
          response += `   ${index+1}.${i+1}. ${p.nombre} - $${price}\n`;
          allProducts.push(p);
        });
        response += '\n';
      } else {
        response += `❌ No encontré "${result.term}"\n\n`;
      }
    });
    
    // Guardar todos los productos en el contexto para poder referenciarlos
    if (allProducts.length > 0) {
      session.metadata = {
        ...session.metadata,
        lastSearchResults: allProducts.map(p => ({
          id: p.id || p.codigo,
          name: p.nombre,
          price: p.preciounidad
        }))
      };
      
      // Añadir call to action natural
      response += `\nPuedes decirme "quiero el 1.2" para seleccionar el segundo producto de la primera búsqueda, o especificar exactamente cuál de ellos te interesa.`;
    } else {
      response += `\nPor favor intenta con otros productos o con términos más generales.`;
    }
    
    return response;
  }

  private async searchProductsWithStrategy(searchTerm: string, type: string, chatbotId?: string): Promise<any[]> {
    let query = '';
    let params = [];
    
    // 🚀 VERIFICAR SI ES CHATBOT TIPO "ECOMMERCE" PARA USAR CONSULTAS INTELIGENTES
    let isEcommerceChatbot = false;
    if (chatbotId) {
      try {
        const chatbotConfig = await this.getChatbotConfig(chatbotId);
        const chatbotType = chatbotConfig?.chatbotConfig?.type;
        isEcommerceChatbot = (chatbotType === 'ecommerce');
        
        this.logger.log(`🔍 Chatbot ID: ${chatbotId}, Tipo: ${chatbotType}, Consultas Inteligentes: ${isEcommerceChatbot ? 'ACTIVADAS' : 'DESACTIVADAS'}`);
      } catch (error) {
        this.logger.warn(`Error obteniendo config del chatbot ${chatbotId}: ${error.message}`);
      }
    }
    
    // 🧠 USAR SISTEMA DE CONSULTAS INTELIGENTES SOLO PARA CHATBOTS ECOMMERCE
    if (isEcommerceChatbot) {
      try {
        this.logger.log(`🎯 ACTIVANDO CONSULTAS INTELIGENTES para búsqueda: "${searchTerm}"`);
        
        // Determinar el alias según el tipo de búsqueda
        let queryAlias = '';
        let marca = undefined;
        
        switch (type) {
          case 'exact':
            queryAlias = 'consulta_inventario';
            break;
          case 'words':
            const words = searchTerm.split(' ').filter(word => word.length > 2);
            if (words.length > 1) {
              queryAlias = 'consulta_inventario_palabras_multiples';
            } else {
              queryAlias = 'consulta_inventario';
            }
            break;
          default:
            queryAlias = 'consulta_inventario';
        }
        
                 // Usar el sistema de consultas inteligentes
         const intelligentResults = await this.valeryDbService.obtenerProductosParaChatbot(
           searchTerm,
           { tipo: 'ecommerce', id: chatbotId }
         );
        
        this.logger.log(`🎯 CONSULTAS INTELIGENTES - "${searchTerm}" (${queryAlias}): ${intelligentResults.length} resultados`);
        return intelligentResults;
        
      } catch (error) {
        this.logger.error(`❌ Error en consultas inteligentes: ${error.message}`);
        // Fallback al sistema tradicional
        this.logger.log(`🔄 Fallback al sistema tradicional para: "${searchTerm}"`);
      }
    }
    
    // 📊 SISTEMA TRADICIONAL (para chatbots no-ecommerce o como fallback)
    this.logger.log(`📊 USANDO SISTEMA TRADICIONAL para búsqueda: "${searchTerm}" (tipo: ${type})`);
    
    switch (type) {
      case 'exact':
        query = `
          SELECT 
            i.codigo,
            i.nombre,
            i.preciounidad,
            i.alicuotaiva,
            i.existenciaunidad,
            (SELECT factorcambio FROM monedas WHERE codmoneda = '02' LIMIT 1) AS tasa_actual
          FROM inventario i
          WHERE (i.status = 'A' OR i.status = '1')
            AND i.existenciaunidad >= 2
            AND LOWER(TRANSLATE(i.nombre, 'ñáéíóúüÑÁÉÍÓÚÜ', 'naeiouuNAEIOUU')) LIKE LOWER(TRANSLATE($1, 'ñáéíóúüÑÁÉÍÓÚÜ', 'naeiouuNAEIOUU'))
          ORDER BY 
            CASE WHEN LOWER(TRANSLATE(i.nombre, 'ñáéíóúüÑÁÉÍÓÚÜ', 'naeiouuNAEIOUU')) LIKE LOWER(TRANSLATE($2, 'ñáéíóúüÑÁÉÍÓÚÜ', 'naeiouuNAEIOUU')) THEN 0 ELSE 1 END,
            i.existenciaunidad DESC,
            LENGTH(i.nombre),
            i.nombre
          LIMIT 20
        `;
        params = [`%${searchTerm}%`, `${searchTerm}%`];
        break;
        
      case 'words':
        const words = searchTerm.split(' ').filter(word => word.length > 2);
        if (words.length === 0) return [];
        
        // Construir condiciones y parámetros correctamente
        const conditions = [];
        const wordParams = [];
        
        for (let i = 0; i < words.length; i++) {
          conditions.push(`LOWER(TRANSLATE(i.nombre, 'ñáéíóúüÑÁÉÍÓÚÜ', 'naeiouuNAEIOUU')) LIKE LOWER(TRANSLATE($${i + 1}, 'ñáéíóúüÑÁÉÍÓÚÜ', 'naeiouuNAEIOUU'))`);
          wordParams.push(`%${words[i]}%`);
        }
        
        query = `
          SELECT 
            i.codigo,
            i.nombre,
            i.preciounidad,
            i.alicuotaiva,
            i.existenciaunidad,
            (SELECT factorcambio FROM monedas WHERE codmoneda = '02' LIMIT 1) AS tasa_actual
          FROM inventario i
          WHERE (i.status = 'A' OR i.status = '1')
            AND i.existenciaunidad >= 2
            AND (${conditions.join(' OR ')})
          ORDER BY i.existenciaunidad DESC, i.nombre
          LIMIT 15
        `;
        params = wordParams;
        break;
    }
    
    const results = await this.valeryDbService.ejecutarQuery(query, params, chatbotId || '');
    this.logger.log(`🔍 Búsqueda "${searchTerm}" (${type}): ${results.length} resultados`);
    
    return results;
  }

  private async formatIntelligentProductResults(productos: any[], searchTerm: string, searchType: string, session: PersistentSession): Promise<string> {
    // Generate a more natural response with some variations
    const introVariations = [
      `Encontré ${productos.length} ${productos.length === 1 ? 'resultado' : 'resultados'} para "${searchTerm}":`,
      `Aquí tienes lo que encontré sobre "${searchTerm}":`,
      `Para tu búsqueda "${searchTerm}", tenemos disponible:`,
      `Mira lo que tenemos para "${searchTerm}":`,
      `Revisé el inventario y encontré ${productos.length} ${productos.length === 1 ? 'opción' : 'opciones'} de "${searchTerm}":`,
    ];
    
    // Randomly select an introduction
    const intro = introVariations[Math.floor(Math.random() * introVariations.length)];
    
    // Add some icon at the beginning but keep it simple and clean
    let respuesta = `🛍️ ${intro}\n\n`;
    
    // Create a more natural product listing with visual enhancers
    for (let i = 0; i < productos.length; i++) {
      const p = productos[i];
      if (!p.nombre || !p.preciounidad || !p.tasa_actual) continue;

      const precioUSD = (parseFloat(p.preciounidad) || 0).toFixed(2);
      const precioBs = this.calcularPrecioBs(p.preciounidad, p.alicuotaiva, p.tasa_actual).toFixed(2);

      respuesta += `📌 **Producto ${i + 1}: ${p.nombre}**\n`;
      respuesta += `   💵 **$${precioUSD}** (Bs ${precioBs})\n\n`;
    }
    
    // Add contextual information based on search type but in a more natural way
    if (searchType === 'words') {
      respuesta += `Esta búsqueda se realizó por palabras clave.\n\n`;
    }
    
    // Add call to action in a more natural way
    const ctaVariations = [
      "¿Cuál te gustaría agregar? Puedes decirme \"quiero el número 1\" o \"agregar el 2 al carrito\".",
      "Si te interesa alguno, dime el número o nombre del que quieres.",
      "Dime cuál prefieres usando el número o indicándome directamente cuál quieres.",
      "¿Alguno te interesa? Indícame el número o dime \"agregar el producto X\"."
    ];
    
    // Randomly select a call to action
    const cta = ctaVariations[Math.floor(Math.random() * ctaVariations.length)];
    
    respuesta += `🛒 ${cta}`;
    
    // Add a natural closer if needed
    if (Math.random() > 0.5) {
      respuesta += "\n\n🔍 Si necesitas ver más opciones, puedes refinar tu búsqueda.";
    }
    
    return respuesta;
  }

  // Función para calcular precio en Bs con IVA y redondear al múltiplo más cercano
  private calcularPrecioBs(precioUSD: number | string, alicuota: number | string, tasa: number | string): number {
    const base = Number(precioUSD) || 0;
    const iva = Number(alicuota) || 0;
    const tasaCambio = Number(tasa) || 1;
    const conIVA = base * (1 + (iva / 100));
    const bs = conIVA * tasaCambio;
    return Math.round(bs * 10) / 10; // redondeo al múltiplo de 0.10
  }

  private normalizeMessage(message: string): string {
    return message.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeSearchTerm(term: string): string {
    return term.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async analyzeMessageIntent(message: string, session: PersistentSession): Promise<any> {
    this.logger.log(`🔍 ANALIZANDO MENSAJE: "${message}"`);
    
    // Análisis mejorado de intenciones con más patrones conversacionales
    const patterns = {
      product_search: [
        // Patrones básicos
        /busco?|buscar|necesito|quiero(?!\s+(el|la|los|las|al)?\s+(\d|producto|item))|dame|tienes?|hay|vendo?|vender/,
        /producto(?!\s+\d)|marca|presentacion|litro|kilo|gramo|paquete/,
        // Patrones conversacionales
        /(?:tienen|venden|consigo|hay|encuentro|vendes)\s+(?:algo|productos?)?(?:\s+de|\s+para|\s+como|\s+tipo)?/i,
        /(?:cuánto|cuanto|precio|cuesta|vale|valor)\s+(?:el|la|los|las|un|una|unos|unas)?/i,
        /(?:quisiera|me\s+gustaría|me\s+gustaria|me\s+interesa|busco)\s+(?:un|una|unos|unas|el|la|los|las)?/i,
        /(?:dónde|donde)\s+(?:encuentro|consigo|tienen|hay|ubico)/i,
        /(?:me\s+muestras?|me\s+enseñas?|puedes?\s+mostrarme|podrian\s+mostrarme)/i,
        // Multi-producto (buscar varios productos a la vez)
        /(?:y|también|tambien|además|ademas)\s+(?:un|una|unos|unas)?/i
      ],
      menu_option: [
        /^[1-4]$|^[1-4]️⃣$|saldo|factura|pedido(?!\s)|historial/
      ],
      cart_action: [
        // Patrones básicos de carrito
        /carrito|agregar|añadir|quitar|eliminar|comprar(?!\s)|finalizar|proceder/,
        /quiero\s+(el|la|los|las)?\s*(producto|item)?\s*\d+|agregar\s+(el|la)?\s*(producto|item)?\s*\d+|producto\s+\d+\s+al\s+carrito/,
        /ver\s+carrito|mi\s+carrito|vaciar\s+carrito|limpiar\s+carrito/,
        // Patrones conversacionales de carrito
        /(?:ponme|agregame|añademe|sumame|echame)\s+(?:un|una|unos|unas|el|la|los|las)?/i,
        /(?:me\s+llevo|me\s+gustaria\s+llevar|me\s+quedaria\s+con)\s+(?:el|la|los|las|este|esta|estos|estas)?/i,
        /(?:llevare|llevo|tomare|tomo)\s+(?:el|la|los|las|este|esta)?/i,
        /(?:deme|dame|déme|dámelo)\s+(?:un|una|el|la)?/i,
        // Interacción con número de producto con lenguaje natural
        /(?:el|la|los|las)?\s*(?:numero|número|num|núm)?\s*(\d+)/i,
        /(?:quiero|dame|deme|llevo)?\s+(\d+)\s+(?:de esos|de estos|de este|de ese)/i
      ],
      identification: [
        /\b[vVeEjJpP]?-?[0-9]{6,9}\b/,  // Detectar cédulas en cualquier parte del mensaje
        /\b[0-9]{7,9}\b/,  // Detectar cédulas solo números en cualquier parte
        /cedula.*[vVeEjJpP]?-?[0-9]{6,9}/i,  // Detectar "cedula V12345678"
        /[vVeEjJpP][0-9]{7,9}/  // Formato directo V12345678
      ],
      greeting: [
        /hola|buenos?|buenas?|saludos|hey|hi|qué\s+tal|como\s+estás|como\s+va|que\s+tal/i
      ],
      help: [
        /ayuda|help|como|que puedo|opciones|menu|guía|guia|instrucciones|comando|asistencia/i
      ]
    };
    
    // Sistema de priorización contextual basado en el contexto actual
    const contextPriority = {
      'product_search': ['cart_action', 'product_search'],
      'cart_checkout': ['cart_action', 'help'],
      'new_client': ['identification', 'greeting'],
      'default': ['product_search', 'cart_action', 'greeting', 'help', 'identification', 'menu_option']
    };
    
    // Seleccionar la prioridad según contexto
    const priorityOrder = contextPriority[session.context] || contextPriority.default;
    
    // 1. Primera pasada: verificamos coincidencias según la prioridad
    let matchFound = false;
    let bestMatch = { type: 'unknown', confidence: 0, entities: {} };
    
    // Analizar según orden de prioridad
    for (const intentType of priorityOrder) {
      if (matchFound) break;
      
      const regexList = patterns[intentType];
      if (!regexList) continue;
      
      for (const regex of regexList) {
        if (regex.test(message)) {
          const confidence = this.calculateIntentConfidence(message, intentType, session);
          if (confidence > bestMatch.confidence) {
            bestMatch = {
              type: intentType,
              confidence,
              entities: this.extractEntities(message, intentType, session)
            };
            
            // Si tenemos alta confianza (>0.8), podemos terminar la búsqueda
            if (confidence > 0.8) {
              matchFound = true;
              break;
            }
          }
        }
      }
    }
    
    // Si no encontramos coincidencia con alta confianza, considerar el contexto de sesión actual
    if (bestMatch.confidence < 0.6 && session.context === 'product_search') {
      // En contexto de búsqueda, casi cualquier mensaje podría ser una búsqueda
      bestMatch = {
        type: 'product_search',
        confidence: 0.7,
        entities: { searchTerm: message }
      };
    }
    
    // Log para depuración
    this.logger.log(`🎯 RESULTADO ANÁLISIS: type="${bestMatch.type}", confidence=${bestMatch.confidence}, entities=${JSON.stringify(bestMatch.entities)}`);
    
    return bestMatch;
  }

  /**
   * Calcula la confianza de la intención detectada considerando contexto y longitud
   */
  private calculateIntentConfidence(message: string, intentType: string, session: PersistentSession): number {
    // Base de confianza por tipo de intención
    const baseConfidence = {
      'product_search': 0.7,
      'cart_action': 0.75,
      'greeting': 0.9,
      'help': 0.85,
      'identification': 0.9,
      'menu_option': 0.8,
      'unknown': 0.3
    }[intentType] || 0.5;
    
    // Factor de longitud - mensajes más elaborados tienen más confianza
    const lengthFactor = Math.min(message.length / 15, 1) * 0.15;
    
    // Factor de contexto - si el mensaje coincide con el contexto actual, más confianza
    const contextFactor = (session.context === 'product_search' && intentType === 'product_search') ? 0.1 :
                         (session.context === 'cart_checkout' && intentType === 'cart_action') ? 0.1 : 0;
    
    // Cálculo final limitado a 1.0 máximo
    return Math.min(baseConfidence + lengthFactor + contextFactor, 1.0);
  }

  /**
   * Extrae entidades relevantes del mensaje según la intención
   */
  private extractEntities(message: string, intentType: string, session: PersistentSession): any {
    const entities: any = {};
    
    switch (intentType) {
      case 'product_search':
        // Extracción mejorada para términos de búsqueda
        // 1. Eliminar palabras comunes del inicio
        const stopWords = [
          'busco', 'necesito', 'quiero', 'dame', 'tienes', 'hay', 'me', 'puedes', 'dar',
          'tienen', 'venden', 'consigo', 'encuentro', 'quisiera', 'me gustaría', 
          'quisiera', 'muéstrame', 'háblame de', 'información sobre', 'busca'
        ];
        
        let cleanedMessage = message.toLowerCase();
        
        // Eliminar palabras iniciales comunes
        for (const word of stopWords) {
          if (cleanedMessage.startsWith(word)) {
            cleanedMessage = cleanedMessage.substring(word.length).trim();
            break;
          }
        }
        
        // 2. Eliminar prefijos comunes
        const prefixes = ['un ', 'una ', 'unos ', 'unas ', 'el ', 'la ', 'los ', 'las ', 'del ', 'de la ', 'de los ', 'de las '];
        for (const prefix of prefixes) {
          if (cleanedMessage.startsWith(prefix)) {
            cleanedMessage = cleanedMessage.substring(prefix.length).trim();
            break;
          }
        }
        
        // 3. Limpiar palabras vacías y signos
        entities.searchTerm = cleanedMessage
          .replace(/[¿?¡!.,;:]/g, '') // Eliminar signos de puntuación
          .replace(/\s+/g, ' ')       // Normalizar espacios
          .trim();
        break;
        
      case 'menu_option':
        const optionMatch = message.match(/[1-4]/);
        entities.option = optionMatch ? optionMatch[0] : null;
        break;

      case 'cart_action':
        // Detectar la acción específica del carrito
        if (/(agregar|añadir|poner|meter|llevar|quiero|dame|deme)/i.test(message)) {
          entities.action = "agregar";
        } else if (/(ver|mostrar|mirar|revisar|carrito)/i.test(message)) {
          entities.action = "ver carrito";
        } else if (/(quitar|eliminar|remover|sacar|borrar|cancelar)/i.test(message)) {
          entities.action = "quitar";
        } else if (/(vaciar|limpiar)/i.test(message)) {
          entities.action = "vaciar";
        } else if (/(comprar|pagar|checkout|proceder|finalizar)/i.test(message)) {
          entities.action = "comprar";
        } else {
          entities.action = message.toLowerCase();
        }
        
        // Extraer información del producto
        const productMatch = message.match(/(?:producto|item|número|numero|num|núm)\s*(\d+)/i);
        const simpleNumberMatch = message.match(/\b(\d+)\b/);
        
        if (productMatch) {
          entities.product = productMatch[1];
        } else if (simpleNumberMatch && entities.action === "agregar") {
          entities.product = simpleNumberMatch[1];
        }
        
        // Extraer cantidad si existe
        const quantityMatch = message.match(/(\d+)\s+(?:unidades|productos|unidad|producto)/i);
        if (quantityMatch) {
          entities.quantity = parseInt(quantityMatch[1]);
        }
        break;
        
      case 'identification':
        // Mejorar detección de cédulas
        const cedulaPatterns = [
          /\b([vVeEjJpP]?-?[0-9]{6,9})\b/,
          /cedula.*?([vVeEjJpP]?-?[0-9]{6,9})/i,
          /([vVeEjJpP][0-9]{7,9})/
        ];
        
        for (const pattern of cedulaPatterns) {
          const match = message.match(pattern);
          if (match) {
            entities.identification = match[1].replace(/[^a-zA-Z0-9]/g, '');
            break;
          }
        }
        
        // Si no se encontró con patrones específicos
        if (!entities.identification) {
          const numerosEncontrados = message.match(/\d{6,9}/);
          if (numerosEncontrados) {
            entities.identification = numerosEncontrados[0];
          } else {
            entities.identification = message.replace(/[^a-zA-Z0-9]/g, '');
          }
        }
        break;
        
      case 'greeting':
        // Detectar si es saludo inicial o en medio de conversación
        entities.isInitial = session.messageCount < 3;
        entities.time = this.getTimeOfDay();
        break;
        
      case 'help':
        // Identificar tipo específico de ayuda solicitada
        if (/(?:como|cómo)\s+(?:comprar|pagar|buscar|agregar)/i.test(message)) {
          entities.helpType = 'proceso';
        } else if (/(?:opciones|comandos|instrucciones)/i.test(message)) {
          entities.helpType = 'comandos';
        } else {
          entities.helpType = 'general';
        }
        break;
    }
    
    return entities;
  }
  
  /**
   * Obtiene el momento del día para contextualizar saludos
   */
  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'mañana';
    if (hour >= 12 && hour < 18) return 'tarde';
    return 'noche';
  }

  private async handleMenuOption(option: string, session: PersistentSession, chatbotId: string): Promise<string> {
    if (!session.isAuthenticated) {
      return `🔐 **AUTENTICACIÓN REQUERIDA** 🔐\n` +
             `═══════════════════════════\n` +
             `🚫 Debe identificarse primero\n` +
             `📝 Ingrese su cédula o RIF\n` +
             `✨ ¡Acceso personalizado garantizado! ✨`;
    }
    
    switch (option) {
      case '1':
        session.context = 'product_search';
        return `🔍 **¡BÚSQUEDA DE PRODUCTOS!** 🔍\n` +
               `═══════════════════════════\n` +
               `🎯 ¿Qué producto busca?\n` +
               `💡 Puede escribir:\n` +
               `▪️ Nombre del producto\n` +
               `▪️ Marca específica\n` +
               `▪️ Categoría\n\n` +
               `📝 **Ejemplos:**\n` +
               `🥛 "leche completa"\n` +
               `🍞 "pan integral"\n` +
               `🧴 "champú bebé"\n\n` +
               `🚀 ¡Escriba y descubra nuestras ofertas! 🚀`;
        
      case '2':
        return await this.getSaldoCliente(session);
        
      case '3':
        return `📄 **HISTORIAL DE FACTURAS** 📄\n` +
               `═══════════════════════════\n` +
               `🚧 Funcionalidad en desarrollo\n` +
               `⚙️ Próximamente disponible\n` +
               `📞 Mientras tanto, contacte servicio\n` +
               `🔄 ¡Trabajamos para mejorar! 🔄`;
        
      case '4':
        session.context = 'order_start';
        return `🛒 **¡CREAR NUEVO PEDIDO!** 🛒\n` +
               `═══════════════════════════\n` +
               `🎯 **OPCIONES DISPONIBLES:**\n\n` +
               `1️⃣ 🔍 **Buscar productos**\n` +
               `    → Explorar catálogo\n\n` +
               `2️⃣ 📝 **Lista de productos**\n` +
               `    → Escribir lo que necesita\n\n` +
               `💡 **¿Qué productos necesita?**\n` +
               `═══════════════════════════\n` +
               `💬 Escriba y comencemos... 🚀`;
        
      default:
        return `❌ **OPCIÓN NO VÁLIDA** ❌\n` +
               `═══════════════════════════\n` +
               `🔢 Seleccione del 1 al 4\n` +
               `💡 Use los números del menú\n` +
               `🔄 ¡Intente nuevamente! 🔄`;
    }
  }

  private async getSaldoCliente(session: PersistentSession): Promise<string> {
    try {
      if (!session.clientId) {
        return `❌ **ERROR DE CUENTA** ❌\n` +
               `═══════════════════════════\n` +
               `🚫 No se encontró información\n` +
               `📞 Contacte servicio al cliente\n` +
               `🆘 ¡Estamos aquí para ayudarle! 🆘`;
      }
      
      const query = `
        SELECT 
          c.nombre,
          c.tienecredito,
          c.diascredito,
          c.saldo,
          c.fechaultimaventa
        FROM clientes c
        WHERE c.codigocliente = $1
      `;
      
      const results = await this.valeryDbService.ejecutarQuery(query, [session.clientId], '');
      
      if (results && results.length > 0) {
        const cliente = results[0];
        
        let respuesta = `💰 **ESTADO DE CUENTA** 💰\n`;
        respuesta += `═══════════════════════════\n`;
        respuesta += `👤 **Cliente:** ${cliente.nombre}\n`;
        respuesta += `═══════════════════════════\n\n`;
        
        if (!cliente.tienecredito) {
          respuesta += `💳 **MODALIDAD DE PAGO** 💳\n`;
          respuesta += `📋 Tipo: **CONTADO**\n`;
          respuesta += `🚫 Sin línea de crédito activa\n`;
          respuesta += `💰 Pagos inmediatos requeridos\n\n`;
        } else {
          respuesta += `🏦 **CUENTA DE CRÉDITO** 🏦\n`;
          respuesta += `📋 Modalidad: **CRÉDITO**\n`;
          respuesta += `⏰ Plazo: ${cliente.diascredito} días\n`;
          respuesta += `💰 **Saldo actual:** ${this.formatearPrecio(cliente.saldo)}\n`;
          
          if (cliente.saldo > 0) {
            respuesta += `⚠️ **SALDO PENDIENTE** ⚠️\n`;
          } else {
            respuesta += `✅ **¡AL DÍA CON PAGOS!** ✅\n`;
          }
          respuesta += `\n`;
        }
        
        if (cliente.fechaultimaventa) {
          const diasUltimaCompra = Math.floor((Date.now() - new Date(cliente.fechaultimaventa).getTime()) / (1000 * 60 * 60 * 24));
          respuesta += `🛍️ **ÚLTIMA COMPRA** 🛍️\n`;
          respuesta += `📅 Hace ${diasUltimaCompra} días\n`;
          respuesta += `🔄 ¡Esperamos su próxima visita!\n\n`;
        }
        
        respuesta += `🎯 **¿QUÉ DESEA HACER?** 🎯\n`;
        respuesta += `═══════════════════════════\n`;
        respuesta += `🛒 ¡Realizar una nueva compra!\n`;
        respuesta += `📞 Contactar servicio al cliente\n`;
        respuesta += `💬 ¡Estoy aquí para ayudarle! 🚀`;
        
        return respuesta;
      } else {
        return `❌ **ERROR DE CONSULTA** ❌\n` +
               `═══════════════════════════\n` +
               `🚫 No se pudo obtener información\n` +
               `📞 Contacte servicio al cliente\n` +
               `🆘 Error ID: ${Date.now().toString(36)} 🆘`;
      }
    } catch (error) {
      this.logger.error(`Error consultando saldo: ${error.message}`);
      return `❌ **ERROR TÉCNICO** ❌\n` +
             `═══════════════════════════\n` +
             `🔧 Error consultando saldo\n` +
             `⏰ Intente más tarde\n` +
             `🆘 ID: ${Date.now().toString(36)} 🆘`;
    }
  }

  private async handleClientIdentification(identification: string, session: PersistentSession, chatbotId: string): Promise<string> {
    return await this.authenticateClientByCedula(identification, session, chatbotId);
  }

  private async authenticateClientByCedula(cedula: string, session: PersistentSession, chatbotId: string): Promise<string> {
    try {
      const normalizedCedula = this.normalizeIdentification(cedula);
      
      const query = `
        SELECT 
          c.codigocliente,
          c.nombre,
          c.rif,
          c.direccion1,
          c.telefono1,
          c.telefono2,
          c.tienecredito,
          c.diascredito,
          c.saldo,
          c.status
        FROM clientes c
        WHERE c.rif = $1 OR c.rif = $2
        LIMIT 1
      `;
      
      const results = await this.valeryDbService.ejecutarQuery(query, [normalizedCedula, `V${normalizedCedula}`], chatbotId);
      
      if (results && results.length > 0) {
        const cliente = results[0];
        
        // Actualizar sesión
        session.clientId = cliente.codigocliente;
        session.clientName = cliente.nombre;
        session.identificationNumber = normalizedCedula;
        session.isAuthenticated = true;
        session.isNewClient = false;
        session.context = 'menu';
        
        await this.chatService.saveSession(session);
        
        return `🎉 **¡IDENTIFICACIÓN EXITOSA!** 🎉\n` +
               `═══════════════════════════\n` +
               `✅ **¡Bienvenido ${cliente.nombre}!** ✅\n` +
               `🔐 Autenticado correctamente\n` +
               `🌟 ¡Listo para atenderle!\n\n` +
               `🎯 **¿CÓMO LE PUEDO AYUDAR?** 🎯\n` +
               `═══════════════════════════\n\n` +
               `1️⃣ 🔍 **Consultar productos** → Ver catálogo\n` +
               `2️⃣ 💰 **Ver mi saldo** → Estado cuenta\n` +
               `3️⃣ 📄 **Historial facturas** → Mis compras\n` +
               `4️⃣ 🛒 **Hacer un pedido** → ¡Primera compra!\n\n` +
               `💬 O escriba directamente lo que necesita... 🚀`;
      } else {
        // Cliente no encontrado - iniciar proceso de registro
        session.identificationNumber = normalizedCedula;
        session.isNewClient = true;
        session.isAuthenticated = false;
        session.context = 'new_client_registration';
        
        await this.chatService.saveSession(session);
        
        return `🆕 **¡NUEVO CLIENTE DETECTADO!** 🆕\n` +
               `═══════════════════════════\n` +
               `📋 Cédula/RIF: ${normalizedCedula}\n` +
               `🚫 No existe en nuestros registros\n\n` +
               `✨ **¡REGISTREMOS SU CUENTA!** ✨\n` +
               `═══════════════════════════\n` +
               `🎁 Proceso rápido y ofertas especiales\n` +
               `🔒 Sus datos están seguros con nosotros\n\n` +
               `📝 **PASO 1 DE 1:**\n` +
               `═══════════════════════════\n` +
               `👤 Por favor, escriba su **NOMBRE COMPLETO**\n` +
               `💡 Ejemplo: "Juan Carlos Pérez González"\n\n` +
               `🚀 ¡Su experiencia premium comienza aquí! 🚀`;
      }
    } catch (error) {
      this.logger.error(`Error autenticando por cédula: ${error.message}`);
      return `❌ **ERROR DE VERIFICACIÓN** ❌\n` +
             `═══════════════════════════\n` +
             `🔧 Error técnico temporal\n` +
             `⏰ Intente nuevamente\n` +
             `🆘 ID: ${Date.now().toString(36)} 🆘`;
    }
  }

  private normalizeIdentification(cedula: string): string {
    return cedula.replace(/[^\d]/g, '');
  }

  private async handleGreeting(session: PersistentSession, chatbotId: string): Promise<string> {
    if (session.isAuthenticated) {
      return `🎉 **¡HOLA DE NUEVO!** 🎉\n` +
             `═══════════════════════════\n` +
             `😊 ${session.clientName}\n` +
             `✨ ¡Qué gusto saludarle!\n\n` +
             `🎯 **¿EN QUÉ LE AYUDO HOY?** 🎯\n` +
             `═══════════════════════════\n` +
             `💬 ¡Estoy aquí para servirle! 🚀`;
    } else {
      return `👋 **¡HOLA Y BIENVENIDO!** 👋\n` +
             `═══════════════════════════\n` +
             `🌟 **GómezMarket** a su servicio\n` +
             `🤖 Soy **GómezBot**\n\n` +
             `🔐 **PARA COMENZAR:**\n` +
             `═══════════════════════════\n` +
             `📝 Indique su cédula o RIF\n` +
             `✨ ¡Servicio personalizado garantizado! ✨`;
    }
  }

  private async handleHelpRequest(session: PersistentSession, chatbotId: string): Promise<string> {
    let helpMessage = `🆘 **¡CENTRO DE AYUDA!** 🆘\n`;
    helpMessage += `═══════════════════════════\n`;
    helpMessage += `🤖 **GómezBot** - Su asistente\n\n`;
    helpMessage += `💬 **COMANDOS DISPONIBLES:**\n`;
    helpMessage += `═══════════════════════════\n`;
    helpMessage += `🔍 **Buscar:** "busco aceite" o "necesito arroz"\n`;
    helpMessage += `🔢 **Opciones:** Escriba números 1-4\n`;
    helpMessage += `🛒 **Carrito:** "agregar producto 1"\n`;
    helpMessage += `👀 **Ver carrito:** "mi carrito"\n\n`;
    
    if (session.isAuthenticated) {
      helpMessage += `🎯 **SUS OPCIONES:**\n`;
      helpMessage += `═══════════════════════════\n`;
      helpMessage += `1️⃣ 🔍 **Consultar productos**\n`;
      helpMessage += `2️⃣ 💰 **Ver saldo**\n`;
      helpMessage += `3️⃣ 📄 **Historial**\n`;
      helpMessage += `4️⃣ 🛒 **Hacer pedido**\n\n`;
    }
    
    helpMessage += `🧠 **¡INTELIGENCIA ARTIFICIAL!**\n`;
    helpMessage += `═══════════════════════════\n`;
    helpMessage += `💬 Escriba naturalmente\n`;
    helpMessage += `🤖 ¡Entiendo su lenguaje!\n`;
    helpMessage += `🚀 ¡Estoy aquí para ayudarle! 🚀`;
    
    return helpMessage;
  }

  private async handleUnknownIntent(message: string, session: PersistentSession, chatbotId: string): Promise<string> {
    // Si no se entiende el mensaje, intentar una búsqueda de productos
    if (message.length > 3) {
      return await this.handleIntelligentProductSearch(message, session, chatbotId);
    }
    
    return `🤔 **¿PODRÍA SER MÁS ESPECÍFICO?** 🤔\n` +
           `═══════════════════════════\n` +
           `❓ No entendí completamente\n\n` +
           `💡 **PUEDE INTENTAR:**\n` +
           `═══════════════════════════\n` +
           `🔍 Buscar productos específicos\n` +
           `📝 Escribir números 1-4 para opciones\n` +
           `🆘 Escribir "ayuda" para más info\n\n` +
           `💬 ¡Escriba naturalmente! 🚀`;
  }

  private async handleIntelligentError(error: Error, chatbotId: string): Promise<string> {
    const errorId = Date.now().toString(36);
    this.logger.error(`Error ID ${errorId}: ${error.message}`);
    
    return `😅 **¡UPS! INCONVENIENTE TÉCNICO** 😅\n` +
           `═══════════════════════════\n` +
           `🔧 Pequeño problema temporal\n` +
           `⚡ Nuestro equipo ya fue notificado\n\n` +
           `🆔 **ID de error:** ${errorId}\n\n` +
           `🔄 **¿QUÉ PUEDE HACER?**\n` +
           `═══════════════════════════\n` +
           `⏰ Intente nuevamente\n` +
           `📞 Contacte soporte si persiste\n` +
           `🚀 ¡Estamos aquí para ayudarle! 🚀`;
  }

  // Métodos auxiliares para persistencia
  private async saveMessage(session: PersistentSession, userMessage: string, botResponse: string): Promise<void> {
    try {
      // Guardar mensaje del usuario
      await this.chatService.saveMessage(session, userMessage, 'user');
      
      // Guardar respuesta del bot
      await this.chatService.saveMessage(session, botResponse, 'assistant');
    } catch (error) {
      this.logger.error(`Error guardando mensajes: ${error.message}`);
    }
  }

  private async saveSearchHistory(session: PersistentSession, originalTerm: string, normalizedTerm: string, resultsCount: number, chatbotId: string): Promise<void> {
    try {
      await this.chatService.saveSearchHistory(session, originalTerm, normalizedTerm, resultsCount, chatbotId);
    } catch (error) {
      this.logger.error(`Error guardando historial de búsqueda: ${error.message}`);
    }
  }

  private async getRecentSearches(phoneNumber: string, limit: number = 5): Promise<SearchHistory[]> {
    try {
      return await this.chatService.findRecentSearches(phoneNumber, limit);
    } catch (error) {
      this.logger.error(`Error obteniendo búsquedas recientes: ${error.message}`);
      return [];
    }
  }

  private async getActiveCartItems(phoneNumber: string): Promise<ShoppingCart[]> {
    try {
      return await this.chatService.findActiveCartItems(phoneNumber);
    } catch (error) {
      this.logger.error(`Error obteniendo carrito: ${error.message}`);
      return [];
    }
  }

  private async getSimilarSearchSuggestions(phoneNumber: string, searchTerm: string, limit: number = 3): Promise<string[]> {
    try {
      const recentSearches = await this.chatService.findSimilarSearchSuggestions(phoneNumber, searchTerm, limit);
      
      return recentSearches.map(row => row.term);
    } catch (error) {
      this.logger.error(`Error obteniendo sugerencias: ${error.message}`);
      return [];
    }
  }

  private async cleanInactiveSessions(): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - this.SESSION_TIMEOUT);
      
      const result = await this.chatService.cleanInactiveSessions(cutoffDate);
      
      if (result.affected > 0) {
        this.logger.debug(`🧹 Marcadas ${result.affected} sesiones como inactivas`);
      }
    } catch (error) {
      this.logger.error(`Error limpiando sesiones inactivas: ${error.message}`);
    }
  }

  private formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(precio);
  }

  // Métodos adicionales que se pueden implementar...
  private async handleCartAction(action: string, product: string, session: PersistentSession, chatbotId: string): Promise<string> {
    this.logger.log(`🛒 Acción de carrito: ${action}, Producto: ${product}, Usuario: ${session.phoneNumber}`);
    
    try {
      if (action.includes('agregar') || action.includes('añadir') || action.includes('quiero')) {
        // Extraer número de producto y cantidad
        const { productNumber, quantity } = this.extractProductNumber(action);
        
        if (productNumber === null) {
          return `❌ **PRODUCTO NO ESPECIFICADO** ❌\n` +
                 `═══════════════════════════\n` +
                 `🔢 Especifique el número del producto\n` +
                 `💡 Ejemplo: "Agregar producto 1 al carrito"\n` +
                 `💡 Ejemplo: "Quiero el producto 3"\n` +
                 `💡 Ejemplo: "Agregar 2 del producto 3"\n\n` +
                 `🔄 ¡Intente nuevamente! 🔄`;
        }

        return await this.addProductToCart(productNumber, session, chatbotId, quantity);
      }
      
      if (action.includes('ver') || action.includes('mostrar') || action.includes('carrito')) {
        return await this.showCart(session);
      }
      
      if (action.includes('quitar') || action.includes('eliminar') || action.includes('remover')) {
        const { productNumber } = this.extractProductNumber(action);
        return await this.removeProductFromCart(productNumber, session);
      }
      
      if (action.includes('vaciar') || action.includes('limpiar')) {
        return await this.clearUserCart(session);
      }
      
      if (action.includes('comprar') || action.includes('pagar') || action.includes('checkout')) {
        return await this.proceedToCheckout(session, chatbotId);
      }
      
      return `🛒 **ACCIÓN DE CARRITO NO RECONOCIDA** 🛒\n` +
             `═══════════════════════════\n` +
             `❓ No entendí la acción solicitada\n\n` +
             `🔧 **ACCIONES DISPONIBLES:**\n` +
             `═══════════════════════════\n` +
             `➕ Agregar producto [número] al carrito\n` +
             `👀 Ver mi carrito\n` +
             `➖ Quitar producto [número]\n` +
             `🗑️ Vaciar carrito\n` +
             `💳 Proceder a comprar\n\n` +
             `💬 ¡Escriba una de estas opciones! 🚀`;
    } catch (error) {
      this.logger.error(`Error en acción de carrito: ${error.message}`, error.stack);
      
      return `❌ **ERROR EN CARRITO** ❌\n` +
             `═══════════════════════════\n` +
             `🔧 No se pudo procesar la acción solicitada\n` +
             `⚠️ ${error.message}\n\n` +
             `🔄 **SUGERENCIAS:**\n` +
             `═══════════════════════════\n` +
             `🔍 Verifique el número de producto\n` +
             `📝 Intente con otra búsqueda primero\n` +
             `👀 Escriba "ver carrito" para verificar\n\n` +
             `🆘 ID: ${Date.now().toString(36)} 🆘`;
    }
  }

  /**
   * Extrae el número de producto y cantidad desde un mensaje conversacional
   * Soporta múltiples formatos naturales de referencia a productos
   */
  private extractProductNumber(message: string): { productNumber: number | null, quantity: number } {
    // Valor por defecto para la cantidad
    let quantity = 1;
    
    // Normalizar mensaje para facilitar detección
    const normalizedMsg = message.toLowerCase();
    
    // Patrones para multi-producto (formato 1.2 para producto 2 de la búsqueda 1)
    const multiProductPattern = /(?:quiero|dame|llevo|agrega[r]?|añadir|poner)\s+(?:el|la)?\s*(\d+)\.(\d+)/i;
    const multiMatch = message.match(multiProductPattern);
    if (multiMatch) {
      // Formato especial para multi-búsqueda
      const group = parseInt(multiMatch[1]);
      const item = parseInt(multiMatch[2]);
      // Calculamos un identificador único (1000*grupo + item)
      return { productNumber: group * 1000 + item, quantity };
    }
    
    // Patrones para "agrega el 6 al carrito", "agregar el 6", "dame el 6"
    const patternDirecto = /(?:agregar?|añadir|quiero|llevar?|poner|añade|pon|agrega|dame|deme|llevo|me\s+llevo)\s+(?:el|la|los|las)?\s*(?:producto|item|artículo|articulo|número|numero)?\s*(\d+)(?:\s+al\s+carrito)?/i;
    const matchDirecto = message.match(patternDirecto);
    
    if (matchDirecto) {
      return { productNumber: parseInt(matchDirecto[1]), quantity };
    }
    
    // Patrones conversacionales - "el número 3", "el producto 3", "el 3", etc.
    const conversationalPattern = /(?:el|la|los|las)\s+(?:número|numero|num|artículo|articulo|producto|item)?\s*(\d+)/i;
    const conversationalMatch = message.match(conversationalPattern);
    
    if (conversationalMatch) {
      return { productNumber: parseInt(conversationalMatch[1]), quantity };
    }
    
    // Buscar patrones con cantidades - "agregar 2 del producto 3", "3 productos del 5", etc.
    const quantityProductPattern = /(\d+)\s+(?:del|de|productos?|unidades?|items?|piezas?|artículos?|articulos?)?\s+(?:del|de|producto|item|artículo|articulo|número|numero)?\s*(\d+)/i;
    const quantityMatch = message.match(quantityProductPattern);
    
    if (quantityMatch) {
      quantity = parseInt(quantityMatch[1]);
      // Validar límites de cantidad
      if (quantity < 1) quantity = 1;
      if (quantity > 20) quantity = 20;
      return { productNumber: parseInt(quantityMatch[2]), quantity };
    }
    
    // Patrones específicos para indicar cantidad - "quiero 3 del 5"
    const shortPattern = /(?:quiero|dame|llevo|agrega[r]?|añadir|poner)\s+(\d+)\s+(?:del|de|unidades?|piezas?)\s+(?:el|la)?\s*(\d+)/i;
    const shortMatch = message.match(shortPattern);
    
    if (shortMatch) {
      quantity = parseInt(shortMatch[1]);
      // Validar límites de cantidad
      if (quantity < 1) quantity = 1;
      if (quantity > 20) quantity = 20;
      return { productNumber: parseInt(shortMatch[2]), quantity };
    }
    
    // Referencias a "este producto", "ese producto" si hay un número cercano
    if (/(?:este|ese|aquel|el)\s+producto/i.test(normalizedMsg)) {
      const numbers = normalizedMsg.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        return { productNumber: parseInt(numbers[0]), quantity };
      }
    }
    
    // Referencias numerales - "el primero", "el segundo", etc.
    const numeralMap = {
      'primero': 1, 'primer': 1, 'primera': 1, 
      'segundo': 2, 'segunda': 2, 
      'tercero': 3, 'tercer': 3, 'tercera': 3, 
      'cuarto': 4, 'cuarta': 4, 
      'quinto': 5, 'quinta': 5,
      'sexto': 6, 'sexta': 6,
      'séptimo': 7, 'septimo': 7, 'séptima': 7, 'septima': 7,
      'octavo': 8, 'octava': 8,
      'noveno': 9, 'novena': 9,
      'décimo': 10, 'decimo': 10, 'décima': 10, 'decima': 10
    };
    
    for (const [numeral, value] of Object.entries(numeralMap)) {
      if (normalizedMsg.includes(numeral)) {
        return { productNumber: value, quantity };
      }
    }
    
    // Patrón simple "agregar 3", "quiero 3"
    const simplePattern = /(?:agregar|quiero|dame|llevo|añadir)\s+(\d+)/i;
    const simpleMatch = message.match(simplePattern);
    
    if (simpleMatch) {
      return { productNumber: parseInt(simpleMatch[1]), quantity };
    }
    
    // Buscar cualquier número en el mensaje como último recurso
    const numbers = normalizedMsg.match(/\d+/g);
    if (numbers && numbers.length > 0) {
      return { productNumber: parseInt(numbers[0]), quantity };
    }
    
    // Buscar palabras numéricas
    const wordNumbers = ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
    for (let i = 0; i < wordNumbers.length; i++) {
      if (normalizedMsg.includes(wordNumbers[i])) {
        return { productNumber: i + 1, quantity };
      }
    }
    
    return { productNumber: null, quantity };
  }

  private async addProductToCart(productNumber: number, session: PersistentSession, chatbotId: string, quantity: number): Promise<string> {
    try {
      // Verificar si estamos manejando un producto de multi-búsqueda (formato grupo.item)
      if (productNumber >= 1000) {
        // Es un producto de multi-búsqueda en formato grupo*1000 + item
        const groupId = Math.floor(productNumber / 1000);
        const itemId = productNumber % 1000;
        
        this.logger.log(`🧩 Procesando referencia a producto compuesto: grupo ${groupId}, item ${itemId}`);
        
        // Verificar que los resultados estén en metadata
        if (!session.metadata?.lastSearchResults || !Array.isArray(session.metadata.lastSearchResults)) {
          return `❓ **No entendí a qué producto te refieres**\n` +
                 `Por favor, intenta buscar nuevamente y selecciona un producto de la lista usando su número.`;
        }
        
        // Aquí necesitaríamos buscar el producto específico según la selección multi-búsqueda
        // Como esto depende de la implementación específica del handleMultipleProductSearch,
        // usaremos datos de referencia que deberían estar en el metadata de la sesión.
        
        // Esta es una implementación simplificada - se deberá adaptar según estructura real
        const productos = await this.searchProductsWithStrategy("producto genérico", 'exact');
        if (productos.length === 0) {
          return `❌ **ERROR DE REFERENCIA** ❌\n` +
                 `No pude localizar el producto al que te refieres. Por favor, hazme una nueva búsqueda.`;
        }
        
        // Producto simulado - en implementación real se usaría el resultado correcto
        const producto = productos[0];
        
        // Agregar al carrito
        const cartItem = await this.chatService.addToCart(session, producto, quantity, chatbotId);
        
        // Calcular totales del carrito
        const cartTotals = await this.chatService.getCartTotal(session.phoneNumber);
        
        return `✅ **¡Producto agregado!**\n\n` +
               `🛍️ Añadí ${quantity} unidad(es) de ${producto.nombre} a tu carrito.\n\n` +
               `💰 Total actual: $${cartTotals.totalUsd.toFixed(2)}\n` +
               `📊 Productos en carrito: ${cartTotals.itemCount}\n\n` +
               `¿Deseas seguir comprando o ver tu carrito completo?`;
      }
      
      // Verificar si tenemos resultados guardados en la sesión
      let productos = [];
      
      if (session.metadata?.lastSearchResults && Array.isArray(session.metadata.lastSearchResults) && 
          session.metadata.lastSearchResults.length > 0) {
        
        this.logger.log(`🔍 Usando resultados guardados en sesión (${session.metadata.lastSearchResults.length} productos)`);
        
        // Usamos la búsqueda actual del contexto de sesión
        const recentSearch = await this.getRecentSearches(session.phoneNumber, 1);
        if (recentSearch.length > 0) {
          productos = await this.searchProductsWithStrategy(recentSearch[0].searchTerm, 'exact', chatbotId);
        }
      } else {
        // No hay resultados guardados, intentamos obtenerlos de búsqueda reciente
        const recentSearches = await this.getRecentSearches(session.phoneNumber, 1);
        
        if (recentSearches.length === 0) {
          return `❓ **Primero debes buscar productos**\n` +
                 `Para agregar algo al carrito, primero busca el producto escribiendo su nombre.`;
        }

        // Repetir la búsqueda para obtener los productos
        const lastSearch = recentSearches[0];
        productos = await this.searchProductsWithStrategy(lastSearch.searchTerm, 'exact', chatbotId);
      }
      
      if (productos.length === 0) {
        return `❌ **No hay productos disponibles**\n` +
               `Por favor realiza una nueva búsqueda de productos primero.`;
      }
      
      if (productNumber < 1 || productNumber > productos.length) {
        return `❌ **Número de producto inválido**\n` +
               `Solo puedes seleccionar del 1 al ${productos.length} de la lista mostrada.`;
      }

      const producto = productos[productNumber - 1];
      
      // Agregar al carrito
      const cartItem = await this.chatService.addToCart(session, producto, quantity, chatbotId);
      
      // Calcular totales del carrito
      const cartTotals = await this.chatService.getCartTotal(session.phoneNumber);
      
      return `✅ **¡PRODUCTO AGREGADO AL CARRITO!** ✅\n` +
             `═══════════════════════════\n` +
             `📦 **Producto agregado:**\n` +
             `🏷️ ${producto.nombre}\n` +
             `💵 $${parseFloat(producto.preciounidad).toFixed(2)} USD\n` +
             `🔢 Cantidad: ${quantity} unidades\n\n` +
             `🛒 **RESUMEN DEL CARRITO:**\n` +
             `═══════════════════════════\n` +
             `📊 ${cartTotals.itemCount} productos en total\n` +
             `💰 **Total:** $${cartTotals.totalUsd.toFixed(2)} USD\n` +
             `🇻🇪 **Total:** Bs ${cartTotals.totalBs.toFixed(2)}\n\n` +
             `🎯 **¿QUÉ DESEA HACER?**\n` +
             `═══════════════════════════\n` +
             `➕ Agregar más productos\n` +
             `👀 Ver carrito completo\n` +
             `💳 Proceder a comprar\n` +
             `🔍 Buscar otros productos\n\n` +
             `💬 ¡Continúe comprando! 🚀`;
             
    } catch (error) {
      this.logger.error(`Error agregando al carrito: ${error.message}`);
      return `❌ **ERROR AGREGANDO PRODUCTO** ❌\n` +
             `═══════════════════════════\n` +
             `🔧 No se pudo agregar al carrito\n` +
             `⏰ Intente nuevamente\n` +
             `🆘 ID: ${Date.now().toString(36)} 🆘`;
    }
  }

  private async showCart(session: PersistentSession): Promise<string> {
    try {
      const cartItems = await this.chatService.findActiveCartItems(session.phoneNumber);
      
      if (cartItems.length === 0) {
        return `🛒 **CARRITO VACÍO** 🛒\n` +
               `═══════════════════════════\n` +
               `📭 No tiene productos en el carrito\n\n` +
               `🔍 **¿QUÉ DESEA HACER?**\n` +
               `═══════════════════════════\n` +
               `🛍️ Buscar productos\n` +
               `📂 Ver categorías\n` +
               `💬 Escriba lo que necesita\n\n` +
               `🚀 ¡Comience a llenar su carrito! 🚀`;
      }

      const cartTotals = await this.chatService.getCartTotal(session.phoneNumber);
      
      let respuesta = `🛒 **MI CARRITO DE COMPRAS** 🛒\n`;
      respuesta += `═══════════════════════════\n`;
      respuesta += `📦 ${cartTotals.itemCount} productos • $${cartTotals.totalUsd.toFixed(2)} USD\n\n`;
      
      cartItems.forEach((item, index) => {
        const subtotal = item.unitPriceUsd * item.quantity;
        const subtotalBs = subtotal * (1 + (item.ivaTax / 100)) * item.exchangeRate;
        
        respuesta += `${index + 1}️⃣ **${item.productName}**\n`;
        respuesta += `   💵 $${Number(item.unitPriceUsd || 0).toFixed(2)} x ${item.quantity} = $${subtotal.toFixed(2)}\n`;
        respuesta += `   🇻🇪 Bs ${subtotalBs.toFixed(2)}\n\n`;
      });
      
      respuesta += `💰 **TOTAL DEL CARRITO:**\n`;
      respuesta += `═══════════════════════════\n`;
      respuesta += `💵 **USD:** $${cartTotals.totalUsd.toFixed(2)}\n`;
      respuesta += `🇻🇪 **Bolívares:** Bs ${cartTotals.totalBs.toFixed(2)}\n\n`;
      respuesta += `🎯 **ACCIONES DISPONIBLES:**\n`;
      respuesta += `═══════════════════════════\n`;
      respuesta += `➕ Seguir comprando\n`;
      respuesta += `➖ Quitar producto [número]\n`;
      respuesta += `🗑️ Vaciar carrito\n`;
      respuesta += `💳 Proceder a comprar\n\n`;
      respuesta += `💬 ¡Escriba su próxima acción! 🚀`;
      
      return respuesta;
      
    } catch (error) {
      this.logger.error(`Error mostrando carrito: ${error.message}`);
      return `❌ **ERROR CONSULTANDO CARRITO** ❌\n` +
             `═══════════════════════════\n` +
             `🔧 Error obteniendo información\n` +
             `🆘 ID: ${Date.now().toString(36)} 🆘`;
    }
  }

  private async removeProductFromCart(productNumber: number | null, session: PersistentSession): Promise<string> {
    try {
      if (productNumber === null) {
        return `❌ **NÚMERO DE PRODUCTO REQUERIDO** ❌\n` +
               `═══════════════════════════\n` +
               `🔢 Especifique qué producto quitar\n` +
               `💡 Ejemplo: "Quitar producto 2"\n` +
               `👀 Use "ver carrito" para ver números\n\n` +
               `🔄 ¡Intente nuevamente! 🔄`;
      }

      const cartItems = await this.chatService.findActiveCartItems(session.phoneNumber);
      
      if (cartItems.length === 0) {
        return `🛒 **CARRITO VACÍO** 🛒\n` +
               `═══════════════════════════\n` +
               `📭 No hay productos para quitar\n` +
               `🚀 ¡Comience a agregar productos! 🚀`;
      }

      if (productNumber < 1 || productNumber > cartItems.length) {
        return `❌ **NÚMERO INVÁLIDO** ❌\n` +
               `═══════════════════════════\n` +
               `🔢 Número válido: 1 a ${cartItems.length}\n` +
               `👀 Use "ver carrito" para verificar\n` +
               `🔄 ¡Intente nuevamente! 🔄`;
      }

      const itemToRemove = cartItems[productNumber - 1];
      const success = await this.chatService.removeFromCart(session.phoneNumber, itemToRemove.productCode);
      
      if (success) {
        const newTotals = await this.chatService.getCartTotal(session.phoneNumber);
        
        return `✅ **¡PRODUCTO ELIMINADO!** ✅\n` +
               `═══════════════════════════\n` +
               `🗑️ **Producto eliminado:**\n` +
               `🏷️ ${itemToRemove.productName}\n` +
               `💵 $${itemToRemove.unitPriceUsd.toFixed(2)} x ${itemToRemove.quantity}\n\n` +
               `🛒 **CARRITO ACTUALIZADO:**\n` +
               `═══════════════════════════\n` +
               `📊 ${newTotals.itemCount} productos restantes\n` +
               `💰 **Total:** $${newTotals.totalUsd.toFixed(2)} USD\n\n` +
               `🎯 **¿QUÉ DESEA HACER?**\n` +
               `═══════════════════════════\n` +
               `👀 Ver carrito\n` +
               `➕ Seguir comprando\n` +
               `💳 Proceder a comprar\n\n` +
               `💬 ¡Continúe con su compra! 🚀`;
      } else {
        return `❌ **ERROR ELIMINANDO PRODUCTO** ❌\n` +
               `═══════════════════════════\n` +
               `🔧 No se pudo eliminar\n` +
               `🆘 ID: ${Date.now().toString(36)} 🆘`;
      }
      
    } catch (error) {
      this.logger.error(`Error quitando producto del carrito: ${error.message}`);
      return `❌ **ERROR EN ELIMINACIÓN** ❌\n` +
             `═══════════════════════════\n` +
             `🔧 Error procesando eliminación\n` +
             `🆘 ID: ${Date.now().toString(36)} 🆘`;
    }
  }

  private async clearUserCart(session: PersistentSession): Promise<string> {
    try {
      const itemsCount = await this.chatService.clearCart(session.phoneNumber);
      
      if (itemsCount > 0) {
        return `✅ **¡CARRITO VACIADO!** ✅\n` +
               `═══════════════════════════\n` +
               `🗑️ ${itemsCount} productos eliminados\n` +
               `📭 Carrito ahora está vacío\n\n` +
               `🔍 **¿QUÉ DESEA HACER?**\n` +
               `═══════════════════════════\n` +
               `🛍️ Buscar productos\n` +
               `📂 Ver categorías\n` +
               `💬 Escriba lo que necesita\n\n` +
               `🚀 ¡Comience una nueva compra! 🚀`;
      } else {
        return `🛒 **CARRITO YA ESTABA VACÍO** 🛒\n` +
               `═══════════════════════════\n` +
               `📭 No había productos para eliminar\n` +
               `🚀 ¡Comience a agregar productos! 🚀`;
      }
      
    } catch (error) {
      this.logger.error(`Error vaciando carrito: ${error.message}`);
      return `❌ **ERROR VACIANDO CARRITO** ❌\n` +
             `═══════════════════════════\n` +
             `🔧 Error en la operación\n` +
             `🆘 ID: ${Date.now().toString(36)} 🆘`;
    }
  }

  private async proceedToCheckout(session: PersistentSession, chatbotId: string): Promise<string> {
    try {
      const cartItems = await this.chatService.findActiveCartItems(session.phoneNumber);
      
      if (cartItems.length === 0) {
        return `🛒 **CARRITO VACÍO** 🛒\n` +
               `═══════════════════════════\n` +
               `📭 Agregue productos antes de comprar\n` +
               `🔍 Busque productos para empezar\n` +
               `🚀 ¡Llene su carrito primero! 🚀`;
      }

      const cartTotals = await this.chatService.getCartTotal(session.phoneNumber);
      
      // Cambiar contexto a checkout
      session.context = 'checkout_payment_selection';
      await this.chatService.saveSession(session);
      
      return `💳 **¡SELECCIONE MÉTODO DE PAGO!** 💳\n` +
             `═══════════════════════════\n` +
             `🛒 ${cartTotals.itemCount} productos en carrito\n` +
             `💰 **Total:** $${cartTotals.totalUsd.toFixed(2)} USD\n` +
             `🇻🇪 **Total:** Bs ${cartTotals.totalBs.toFixed(2)}\n\n` +
             `💳 **MÉTODOS DE PAGO DISPONIBLES:**\n` +
             `═══════════════════════════\n` +
             `1️⃣ 📱 **PAGO MÓVIL** (Bolívares)\n` +
             `2️⃣ 💳 **ZELLE** (USD)\n` +
             `3️⃣ 🏦 **TRANSFERENCIA USD**\n` +
             `4️⃣ 💵 **EFECTIVO BOLÍVARES**\n` +
             `5️⃣ 🏧 **PUNTO DE VENTA**\n` +
             `6️⃣ 💰 **EFECTIVO USD**\n\n` +
             `📝 **¿CÓMO PROCEDER?**\n` +
             `═══════════════════════════\n` +
             `🔢 Escriba el número del método (1-6)\n` +
             `🔄 O escriba "cancelar" para volver\n` +
             `💬 Ejemplo: "1" para Pago Móvil`;
             
    } catch (error) {
      this.logger.error(`Error en checkout: ${error.message}`);
      return `❌ **ERROR EN CHECKOUT** ❌\n` +
             `═══════════════════════════\n` +
             `🔧 Error procesando compra\n` +
             `🆘 ID: ${Date.now().toString(36)} 🆘`;
    }
  }

  /**
   * Manejar selección de método de pago
   */
  private async handlePaymentSelection(message: string, session: PersistentSession, chatbotId: string): Promise<string> {
    try {
      const metodo = parseInt(message.trim());
      
      if (isNaN(metodo) || metodo < 1 || metodo > 6) {
        return `❌ **MÉTODO INVÁLIDO** ❌\n` +
               `═══════════════════════════\n` +
               `🔢 Seleccione un número del 1 al 6\n` +
               `💡 Ejemplo: escriba "2" para Zelle\n\n` +
               `💳 **MÉTODOS DISPONIBLES:**\n` +
               `═══════════════════════════\n` +
               `1️⃣ Pago Móvil | 2️⃣ Zelle\n` +
               `3️⃣ Transferencia USD | 4️⃣ Efectivo Bs\n` +
               `5️⃣ Punto de Venta | 6️⃣ Efectivo USD`;
      }

      // Si es Pago Móvil (opción 1), activar flujo de validación
      if (metodo === 1) {
        // Obtener lista de bancos
        const bancos = await this.valeryDbService.obtenerBancos();
        
        if (!bancos || bancos.length === 0) {
          return `❌ **ERROR EN SISTEMA BANCARIO** ❌\n` +
                 `═══════════════════════════\n` +
                 `🏦 No se pueden obtener bancos\n` +
                 `⏰ Intente más tarde\n` +
                 `📞 O contacte servicio al cliente`;
        }

        // Cambiar contexto para selección de banco
        session.context = 'payment_bank_selection';
        await this.chatService.saveSession(session);

        let respuesta = `🏦 **SELECCIONE SU BANCO** 🏦\n`;
        respuesta += `═══════════════════════════\n`;
        respuesta += `📱 Ha seleccionado: **PAGO MÓVIL**\n`;
        respuesta += `💰 Moneda: **BOLÍVARES**\n\n`;
        respuesta += `🏦 **BANCOS DISPONIBLES:**\n`;
        respuesta += `═══════════════════════════\n`;

        for (const banco of bancos) {
          respuesta += `🔹 **${banco.codigo}** - ${banco.banco}\n`;
        }

        respuesta += `\n💡 **¿CÓMO SELECCIONAR?**\n`;
        respuesta += `═══════════════════════════\n`;
        respuesta += `🔢 Escriba el código de 4 dígitos\n`;
        respuesta += `💡 Ejemplo: 0102, 0134, 0151\n\n`;
        respuesta += `🔄 Escriba "cancelar" para volver`;

        return respuesta;
      }

      // Para otros métodos, usar el flujo original
      const resultado = await this.createOrderFromCart(session.phoneNumber, metodo);
      
      if (resultado.success) {
        // Limpiar carrito después de crear pedido exitoso
        await this.chatService.clearCart(session.phoneNumber);
        
        // Cambiar contexto de vuelta al menú
        session.context = 'menu';
        await this.chatService.saveSession(session);
        
        const metodosTexto = {
          1: '📱 PAGO MÓVIL',
          2: '💳 ZELLE',
          3: '🏦 TRANSFERENCIA USD',
          4: '💵 EFECTIVO BOLÍVARES',
          5: '🏧 PUNTO DE VENTA',
          6: '💰 EFECTIVO USD'
        };
        
        return `🎉 **¡PEDIDO CREADO EXITOSAMENTE!** 🎉\n` +
               `═══════════════════════════\n` +
               `✅ **ID Pedido:** ${resultado.idencabedoc}\n` +
               `💳 **Método:** ${metodosTexto[metodo]}\n` +
               `💰 **Total:** $${resultado.detalles.total.toFixed(2)} ${resultado.detalles.moneda}\n` +
               `📦 **Productos:** ${resultado.detalles.productos} items\n\n` +
               `📋 **INFORMACIÓN IMPORTANTE:**\n` +
               `═══════════════════════════\n` +
               `📞 Contacto para coordinar entrega\n` +
               `💳 Datos de pago serán enviados\n` +
               `📦 Preparación: 24-48 horas\n` +
               `🚚 Entrega según ubicación\n\n` +
               `🎯 **¿QUÉ DESEA HACER AHORA?**\n` +
               `═══════════════════════════\n` +
               `🔍 Buscar más productos\n` +
               `📄 Ver historial de pedidos\n` +
               `💬 Escriba lo que necesita\n\n` +
               `🚀 ¡Gracias por su compra! 🚀`;
      } else {
        return `❌ **ERROR AL CREAR PEDIDO** ❌\n` +
               `═══════════════════════════\n` +
               `🔧 ${resultado.error}\n` +
               `⏰ Intente nuevamente\n` +
               `📞 O contacte servicio al cliente\n` +
               `🆘 ID: ${Date.now().toString(36)} 🆘`;
      }
      
    } catch (error) {
      this.logger.error(`Error en selección de pago: ${error.message}`);
      return `❌ **ERROR TÉCNICO** ❌\n` +
             `═══════════════════════════\n` +
             `🔧 Error procesando método de pago\n` +
             `⏰ Intente más tarde\n` +
             `🆘 ID: ${Date.now().toString(36)} 🆘`;
    }
  }

  /**
   * Crear pedido desde carrito de compras
   */
  private async createOrderFromCart(phoneNumber: string, metodoPago: number): Promise<any> {
    try {
      // Convertir carrito a formato de pedido
              const datosCarrito = await this.valeryDbService.convertirCarritoAPedido(phoneNumber, metodoPago.toString());
      
      // Crear pedido usando el sistema completo
      const resultado = await this.valeryDbService.crearPedidoCompleto(datosCarrito);
      
      this.logger.log(`✅ Pedido creado desde carrito: ${resultado.idencabedoc} para ${phoneNumber}`);
      
      return resultado;
      
    } catch (error) {
      this.logger.error(`Error creando pedido desde carrito: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Detectar si el mensaje es una lista de productos
   */
  private esListaProductos(message: string): boolean {
    // Buscar indicadores de lista: comas, saltos de línea, múltiples productos
    const indicadoresLista = [
      /,.*,/,  // Múltiples comas
      /\n.*\n/, // Múltiples líneas
      /;.*;/, // Múltiples punto y coma
      /lista de/i,
      /necesito.*,/i,
      /quiero.*,/i
    ];

    return indicadoresLista.some(patron => patron.test(message)) || 
           message.split(/[,\n;]/).length > 2;
  }

  /**
   * Manejar búsqueda de productos por lista
   */
  private async handleProductListSearch(message: string, session: PersistentSession, chatbotId: string): Promise<string> {
    try {
      const resultados = await this.valeryDbService.buscarProductosPorLista(message);
      
      // Verificar si resultados es el objeto estructurado esperado
      if (!resultados || Array.isArray(resultados)) {
        return `😔 **¡NO ENCONTRAMOS PRODUCTOS DE SU LISTA!** 😔\n` +
               `═══════════════════════════\n` +
               `📝 Lista analizada\n` +
               `❌ Sin resultados disponibles\n\n` +
               `💡 **SUGERENCIAS:**\n` +
               `═══════════════════════════\n` +
               `🔄 Revise la ortografía\n` +
               `📝 Use nombres más específicos\n` +
               `💬 Busque productos individuales\n\n` +
               `🚀 ¡Intente con otra lista! 🚀`;
      }

      const productos = resultados.productos || [];
      const terminos = resultados.terminos || [];
      const estadisticas = resultados.estadisticas || { terminosBuscados: 0, productosEncontrados: 0, promedioPorTermino: 0 };
      
      if (!productos || productos.length === 0) {
        return `😔 **¡NO ENCONTRAMOS PRODUCTOS DE SU LISTA!** 😔\n` +
               `═══════════════════════════\n` +
               `📝 Lista analizada: ${terminos.join(', ')}\n` +
               `❌ Sin resultados disponibles\n\n` +
               `💡 **SUGERENCIAS:**\n` +
               `═══════════════════════════\n` +
               `🔄 Revise la ortografía\n` +
               `📝 Use nombres más específicos\n` +
               `💬 Busque productos individuales\n\n` +
               `🚀 ¡Intente con otra lista! 🚀`;
      }

      let respuesta = `🛍️ **¡PRODUCTOS DE SU LISTA ENCONTRADOS!** 🛍️\n`;
      respuesta += `═══════════════════════════\n`;
      respuesta += `📋 Términos buscados: ${estadisticas.terminosBuscados}\n`;
      respuesta += `📦 Productos encontrados: ${estadisticas.productosEncontrados}\n`;
      respuesta += `📊 Promedio por término: ${estadisticas.promedioPorTermino}\n\n`;

      for (let i = 0; i < Math.min(productos.length, 15); i++) {
        const p = productos[i];
        if (!p.nombre || !p.preciounidad || !p.tasa_actual) continue;

        const precioUSD = (parseFloat(p.preciounidad) || 0).toFixed(2);
        const precioBs = this.calcularPrecioBs(p.preciounidad, p.alicuotaiva, p.tasa_actual).toFixed(2);

        respuesta += `🏷️ **PRODUCTO ${i + 1}** 🏷️\n`;
        respuesta += `📌 **${p.nombre}**\n`;
        respuesta += `💵 **USD:** $${precioUSD}\n`;
        respuesta += `🇻🇪 **Bolívares:** Bs ${precioBs}\n`;
        respuesta += `📦 **Stock:** ${p.existenciaunidad} unidades\n\n`;
      }

      if (productos.length > 15) {
        respuesta += `... y ${productos.length - 15} productos más.\n\n`;
      }

      respuesta += `🛒 **¿CÓMO AGREGAR AL CARRITO?** 🛒\n`;
      respuesta += `═══════════════════════════\n`;
      respuesta += `✅ "Agregar [número] al carrito"\n`;
      respuesta += `✅ "Quiero el producto [número]"\n\n`;
      respuesta += `🔍 **¿Desea refinar su lista?** 🔍\n`;
      respuesta += `💬 ¡Escriba una nueva lista o elija productos! 🚀`;

      return respuesta;

    } catch (error) {
      this.logger.error(`Error en búsqueda por lista: ${error.message}`);
      return `❌ **ERROR EN BÚSQUEDA POR LISTA** ❌\n` +
             `═══════════════════════════\n` +
             `🔧 Error procesando su lista\n` +
             `⏰ Intente nuevamente\n` +
             `🆘 ID: ${Date.now().toString(36)} 🆘`;
    }
  }

  /**
   * Manejar selección de banco para pago móvil
   */
  private async handleBankSelection(message: string, session: PersistentSession, chatbotId: string): Promise<string> {
    try {
      const codigoBanco = message.trim();
      
      // Validar que sea un código de banco válido (4 dígitos)
      if (!/^\d{4}$/.test(codigoBanco)) {
        return `❌ **CÓDIGO DE BANCO INVÁLIDO** ❌\n` +
               `═══════════════════════════\n` +
               `🔢 Debe ser exactamente 4 dígitos\n` +
               `💡 Ejemplo: 0102, 0134, 0151\n` +
               `📋 Revise la lista de bancos\n` +
               `🔄 ¡Intente nuevamente! 🔄`;
      }

      // Buscar el banco en la base de datos
      const bancos = await this.valeryDbService.obtenerBancos();
      const bancoSeleccionado = bancos.find(b => b.codigo === codigoBanco);

      if (!bancoSeleccionado) {
        return `❌ **BANCO NO ENCONTRADO** ❌\n` +
               `═══════════════════════════\n` +
               `🏦 Código ${codigoBanco} no válido\n` +
               `📋 Revise la lista de bancos disponibles\n` +
               `🔄 ¡Intente con otro código! 🔄`;
      }

      // Guardar selección en metadata
        session.metadata = {
          ...session.metadata,
        pagoMovil: {
          ...session.metadata?.pagoMovil,
          codigoBanco: codigoBanco,
          nombreBanco: bancoSeleccionado.banco
        }
      };

      // Cambiar contexto para solicitar número de teléfono emisor
      session.context = 'payment_phone_input';
      await this.chatService.saveSession(session);

      return `✅ **BANCO SELECCIONADO** ✅\n` +
             `═══════════════════════════\n` +
             `🏦 **Banco:** ${bancoSeleccionado.banco}\n` +
             `🔢 **Código:** ${codigoBanco}\n\n` +
             `📱 **SIGUIENTE PASO** 📱\n` +
             `═══════════════════════════\n` +
             `📞 Ingrese el número de teléfono\n` +
             `📲 desde el cual realizó el pago\n` +
             `💡 Ejemplo: 04141234567\n\n` +
             `🔄 Escriba "cancelar" para volver`;

    } catch (error) {
      this.logger.error(`Error en selección de banco: ${error.message}`);
      return `❌ **ERROR TÉCNICO** ❌\n` +
             `═══════════════════════════\n` +
             `🔧 Error procesando banco\n` +
             `⏰ Intente más tarde\n` +
             `🆘 ID: ${Date.now().toString(36)} 🆘`;
    }
  }

  /**
   * Manejar entrada de número de teléfono emisor
   */
  private async handlePaymentPhoneInput(message: string, session: PersistentSession, chatbotId: string): Promise<string> {
    try {
      if (message.toLowerCase().includes('cancelar')) {
        session.context = 'menu';
        await this.chatService.saveSession(session);
        return `🔄 **PAGO CANCELADO** 🔄\n` +
               `═══════════════════════════\n` +
               `↩️ Regresando al menú principal\n` +
               `💬 ¿En qué más puedo ayudarle?`;
      }

      const telefono = message.replace(/\D/g, ''); // Solo números

      // Validar formato de teléfono venezolano
      if (!/^(0414|0424|0412|0416|0426)\d{7}$/.test(telefono) && !/^(414|424|412|416|426)\d{7}$/.test(telefono)) {
        return `❌ **NÚMERO DE TELÉFONO INVÁLIDO** ❌\n` +
               `═══════════════════════════\n` +
               `📱 Debe ser un número móvil venezolano\n` +
               `💡 Ejemplos válidos:\n` +
               `   📞 04141234567\n` +
               `   📞 04241234567\n` +
               `   📞 04121234567\n\n` +
               `🔄 ¡Intente nuevamente! 🔄`;
      }

      // Normalizar teléfono
      const telefonoNormalizado = telefono.startsWith('0') ? telefono : `0${telefono}`;

      // Guardar en metadata
      session.metadata = {
        ...session.metadata,
        pagoMovil: {
          ...session.metadata?.pagoMovil,
          telefonoEmisor: telefonoNormalizado
        }
      };

      // Cambiar contexto para solicitar cédula
      session.context = 'payment_cedula_input';
      await this.chatService.saveSession(session);

      return `✅ **TELÉFONO REGISTRADO** ✅\n` +
             `═══════════════════════════\n` +
             `📱 **Teléfono:** ${telefonoNormalizado}\n\n` +
             `🆔 **SIGUIENTE PASO** 🆔\n` +
             `═══════════════════════════\n` +
             `📝 Ingrese la cédula de identidad\n` +
             `👤 de la persona que realizó el pago\n` +
             `💡 Ejemplo: V12345678 o 12345678\n\n` +
             `🔄 Escriba "cancelar" para volver`;

    } catch (error) {
      this.logger.error(`Error en entrada de teléfono: ${error.message}`);
      return `❌ **ERROR TÉCNICO** ❌\n` +
             `═══════════════════════════\n` +
             `🔧 Error procesando teléfono\n` +
             `⏰ Intente más tarde\n` +
             `🆘 ID: ${Date.now().toString(36)} 🆘`;
    }
  }

  /**
   * Manejar entrada de cédula del pagador
   */
  private async handlePaymentCedulaInput(message: string, session: PersistentSession, chatbotId: string): Promise<string> {
    try {
      if (message.toLowerCase().includes('cancelar')) {
        session.context = 'menu';
        await this.chatService.saveSession(session);
        return `🔄 **PAGO CANCELADO** 🔄\n` +
               `═══════════════════════════\n` +
               `↩️ Regresando al menú principal\n` +
               `💬 ¿En qué más puedo ayudarle?`;
      }

      // Normalizar cédula
      let cedula = message.replace(/\D/g, '');
      const prefijo = message.toUpperCase().match(/^[VEJP]/)?.[0] || 'V';
      
      // Validar longitud de cédula
      if (cedula.length < 6 || cedula.length > 9) {
        return `❌ **CÉDULA INVÁLIDA** ❌\n` +
               `═══════════════════════════\n` +
               `🆔 Debe tener entre 6 y 9 dígitos\n` +
               `💡 Ejemplos válidos:\n` +
               `   📝 V12345678\n` +
               `   📝 12345678\n` +
               `   📝 J123456789\n\n` +
               `🔄 ¡Intente nuevamente! 🔄`;
      }

      const cedulaCompleta = `${prefijo}${cedula}`;

      // Validar que el cliente existe en la base de datos
      const clienteValido = await this.valeryDbService.validarCliente(cedula);

      // Guardar en metadata
      session.metadata = {
        ...session.metadata,
        pagoMovil: {
          ...session.metadata?.pagoMovil,
          cedulaPagador: cedulaCompleta,
          clienteValidado: !!clienteValido
        }
      };

      // Cambiar contexto para solicitar referencia
      session.context = 'payment_reference_input';
      await this.chatService.saveSession(session);

      let respuesta = `✅ **CÉDULA REGISTRADA** ✅\n`;
      respuesta += `═══════════════════════════\n`;
      respuesta += `🆔 **Cédula:** ${cedulaCompleta}\n`;
      
      if (clienteValido) {
        respuesta += `👤 **Cliente:** ${clienteValido.nombre}\n`;
        respuesta += `✅ **Cliente verificado en sistema**\n\n`;
      } else {
        respuesta += `⚠️ **Cliente no encontrado en sistema**\n`;
        respuesta += `📝 Se registrará como nuevo cliente\n\n`;
      }

      respuesta += `🔢 **ÚLTIMO PASO** 🔢\n`;
      respuesta += `═══════════════════════════\n`;
      respuesta += `💳 Ingrese los últimos 4 dígitos\n`;
      respuesta += `📋 de la referencia del pago\n`;
      respuesta += `💡 Ejemplo: 1234\n\n`;
      respuesta += `🔄 Escriba "cancelar" para volver`;

      return respuesta;

    } catch (error) {
      this.logger.error(`Error en entrada de cédula: ${error.message}`);
      return `❌ **ERROR TÉCNICO** ❌\n` +
             `═══════════════════════════\n` +
             `🔧 Error procesando cédula\n` +
             `⏰ Intente más tarde\n` +
             `🆘 ID: ${Date.now().toString(36)} 🆘`;
    }
  }

  /**
   * Manejar entrada de referencia de pago
   */
  private async handlePaymentReferenceInput(message: string, session: PersistentSession, chatbotId: string): Promise<string> {
    try {
      if (message.toLowerCase().includes('cancelar')) {
        session.context = 'menu';
        await this.chatService.saveSession(session);
        return `🔄 **PAGO CANCELADO** 🔄\n` +
               `═══════════════════════════\n` +
               `↩️ Regresando al menú principal\n` +
               `💬 ¿En qué más puedo ayudarle?`;
      }

      const referencia = message.replace(/\D/g, ''); // Solo números

      // Validar que sean exactamente 4 dígitos
      if (!/^\d{4}$/.test(referencia)) {
        return `❌ **REFERENCIA INVÁLIDA** ❌\n` +
               `═══════════════════════════\n` +
               `🔢 Debe ingresar exactamente 4 dígitos\n` +
               `💡 Ejemplo: 1234\n` +
               `📋 Revise el comprobante de pago\n` +
               `🔄 ¡Intente nuevamente! 🔄`;
      }

      // Completar datos de pago y crear el pedido
      const pagoMovilData = session.metadata?.pagoMovil;
      
      if (!pagoMovilData?.codigoBanco || !pagoMovilData?.telefonoEmisor || !pagoMovilData?.cedulaPagador) {
        return `❌ **ERROR EN DATOS DE PAGO** ❌\n` +
               `═══════════════════════════\n` +
               `🔧 Faltan datos del proceso\n` +
               `🔄 Debe reiniciar el proceso de pago\n` +
               `💬 Seleccione método de pago nuevamente`;
      }

      // Crear el pedido
      const cartTotals = await this.chatService.getCartTotal(session.phoneNumber);
      const resultadoPedido = await this.createOrderFromCart(session.phoneNumber, 1); // 1 = Pago Móvil

      if (!resultadoPedido.success) {
        return `❌ **ERROR AL CREAR PEDIDO** ❌\n` +
               `═══════════════════════════\n` +
               `🔧 ${resultadoPedido.error}\n` +
               `⏰ Intente nuevamente\n` +
               `🆘 ID: ${Date.now().toString(36)} 🆘`;
      }

      // Registrar información completa del pago
      await this.valeryDbService.registrarInformacionPago({
        idencabedoc: resultadoPedido.idencabedoc,
        idtipo: 1, // Pago Móvil
        monto: cartTotals.totalBs, // En bolívares para pago móvil
        codigobanco: parseInt(pagoMovilData.codigoBanco),
        banco: pagoMovilData.nombreBanco,
        clienteid: pagoMovilData.cedulaPagador,
        telefono: pagoMovilData.telefonoEmisor,
        nroreferencia: referencia
      });

      // Limpiar carrito y resetear contexto
      await this.chatService.clearCart(session.phoneNumber);
      session.context = 'menu';
      session.metadata = {
        ...session.metadata,
        pagoMovil: undefined
      };
      await this.chatService.saveSession(session);

      return `🎉 **¡PEDIDO CREADO CON PAGO MÓVIL!** 🎉\n` +
             `═══════════════════════════\n` +
             `✅ **ID Pedido:** ${resultadoPedido.idencabedoc}\n` +
             `🏦 **Banco:** ${pagoMovilData.nombreBanco} (${pagoMovilData.codigoBanco})\n` +
             `📱 **Teléfono:** ${pagoMovilData.telefonoEmisor}\n` +
             `🆔 **Cédula:** ${pagoMovilData.cedulaPagador}\n` +
             `🔢 **Ref:** ****${referencia}\n` +
             `💰 **Total:** Bs ${cartTotals.totalBs.toFixed(2)}\n\n` +
             `📋 **INFORMACIÓN IMPORTANTE:**\n` +
             `═══════════════════════════\n` +
             `⏳ Su pago será validado en tiempo real\n` +
             `📞 Recibirá confirmación por WhatsApp\n` +
             `🚚 Preparación: 24-48 horas\n` +
             `📦 Se le notificará cuando esté listo\n\n` +
             `🎯 **¿QUÉ DESEA HACER AHORA?**\n` +
             `═══════════════════════════\n` +
             `🔍 Buscar más productos\n` +
             `📄 Ver historial de pedidos\n` +
             `💬 Escriba lo que necesita\n\n` +
             `🚀 ¡Gracias por su compra! 🚀`;

    } catch (error) {
      this.logger.error(`Error en entrada de referencia: ${error.message}`);
      return `❌ **ERROR TÉCNICO** ❌\n` +
             `═══════════════════════════\n` +
             `🔧 Error procesando referencia\n` +
             `⏰ Intente más tarde\n` +
             `🆘 ID: ${Date.now().toString(36)} 🆘`;
    }
  }

  /**
   * Manejar registro de cliente nuevo (restaurando método original)
   */
  private async handleNewClientRegistration(message: string, session: PersistentSession, chatbotId: string): Promise<string> {
    try {
      const nombreCompleto = message.trim();
      
      // Validar que el nombre tenga al menos 2 palabras
      const palabras = nombreCompleto.split(' ').filter(palabra => palabra.length > 0);
      if (palabras.length < 2) {
        return `❌ **NOMBRE INCOMPLETO** ❌\n` +
               `═══════════════════════════\n` +
               `📝 Necesito su nombre Y apellido completo\n` +
               `💡 Ejemplo: "Juan Carlos Pérez González"\n\n` +
               `🔄 **Por favor, intente nuevamente:**\n` +
               `═══════════════════════════\n` +
               `👤 Escriba su nombre completo\n` +
               `✨ ¡Estamos a un paso de terminar! ✨`;
      }
      
      // Validar que no tenga caracteres especiales raros
      if (!/^[a-zA-ZÀ-ÿñÑ\s]+$/.test(nombreCompleto)) {
        return `❌ **FORMATO DE NOMBRE INVÁLIDO** ❌\n` +
               `═══════════════════════════\n` +
               `📝 Solo se permiten letras y espacios\n` +
               `🚫 Sin números ni símbolos especiales\n\n` +
               `💡 **Ejemplo correcto:**\n` +
               `═══════════════════════════\n` +
               `👤 "Juan Carlos Pérez González"\n` +
               `🔄 Intente nuevamente por favor 🔄`;
      }

      // Crear el nuevo cliente en la base de datos externa
      const nuevoCliente = await this.createNewClient(nombreCompleto, session.identificationNumber, session.phoneNumber);

      if (nuevoCliente.success) {
        // Actualizar sesión con información del cliente registrado
        session.clientId = nuevoCliente.codigocliente;
        session.clientName = nombreCompleto;
        session.isAuthenticated = true;
        session.isNewClient = false;
        session.context = 'menu';
        
        await this.chatService.saveSession(session);
        
        return `🎊 **¡REGISTRO EXITOSO!** 🎊\n` +
               `═══════════════════════════\n` +
               `✅ **¡Bienvenido ${nombreCompleto}!** ✅\n` +
               `🆕 Cliente registrado: ${nuevoCliente.codigocliente}\n` +
               `🎁 ¡Cuenta creada exitosamente!\n\n` +
               `🌟 **¡OFERTAS DE BIENVENIDA!** 🌟\n` +
               `═══════════════════════════\n` +
               `🎯 Productos con descuentos especiales\n` +
               `🚀 Servicio personalizado garantizado\n` +
               `💎 Experiencia premium desde el primer día\n\n` +
               `🎯 **¿CÓMO LE PUEDO AYUDAR?** 🎯\n` +
               `═══════════════════════════\n\n` +
               `1️⃣ 🔍 **Consultar productos** → Ver catálogo\n` +
               `2️⃣ 💰 **Ver mi saldo** → Estado cuenta\n` +
               `3️⃣ 📄 **Historial facturas** → Mis compras\n` +
               `4️⃣ 🛒 **Hacer un pedido** → ¡Primera compra!\n\n` +
               `💬 O escriba directamente lo que necesita... 🚀`;
      } else {
        return `❌ **ERROR EN EL REGISTRO** ❌\n` +
               `═══════════════════════════\n` +
               `🔧 No se pudo crear la cuenta\n` +
               `⚠️ Error: ${nuevoCliente.error}\n\n` +
               `🔄 **¿QUÉ PUEDE HACER?**\n` +
               `═══════════════════════════\n` +
               `⏰ Intente nuevamente\n` +
               `📞 Contacte servicio al cliente\n` +
               `🆘 ID: ${Date.now().toString(36)} 🆘`;
      }
      
    } catch (error) {
      this.logger.error(`Error en registro de cliente: ${error.message}`);
      return `❌ **ERROR TÉCNICO** ❌\n` +
             `═══════════════════════════\n` +
             `🔧 Error durante el registro\n` +
             `⏰ Intente más tarde\n` +
             `🆘 ID: ${Date.now().toString(36)} 🆘`;
    }
  }

  private async createNewClient(nombreCompleto: string, cedula: string, telefono: string): Promise<any> {
    try {
      this.logger.log(`🔍 INICIANDO CREACIÓN DE CLIENTE: ${nombreCompleto}`);
      this.logger.log(`📊 Parámetros recibidos: cedula=${cedula}, telefono=${telefono}`);
      
      // Obtener el próximo ID disponible
      const maxIdQuery = `SELECT COALESCE(MAX(idcliente), 0) + 1 as next_id FROM clientes`;
      this.logger.log(`🔍 Ejecutando query para obtener next_id: ${maxIdQuery}`);
      
      const maxIdResult = await this.valeryDbService.ejecutarQuery(maxIdQuery, [], '');
      this.logger.log(`📋 Resultado maxId: ${JSON.stringify(maxIdResult)}`);
      
      const nextId = maxIdResult[0]?.next_id || 1;
      this.logger.log(`🔑 Next ID calculado: ${nextId}`);
      
      // Preparar datos del nuevo cliente
      const codigoCliente = cedula; // Usar la cédula como código de cliente
      const rifFormateado = cedula.startsWith('V') || cedula.startsWith('J') || cedula.startsWith('E') || cedula.startsWith('P') 
        ? cedula 
        : `V${cedula}`;
      
      this.logger.log(`📝 Datos preparados: codigoCliente=${codigoCliente}, rifFormateado=${rifFormateado}`);
      
      const insertQuery = `
        INSERT INTO clientes (
          idcliente, 
          codigocliente, 
          nombre, 
          rif, 
          direccion1, 
          direccion2, 
          idpais, 
          idestado, 
          idciudad, 
          idmunicipio, 
          codigopostal, 
          telefono1, 
          telefono2, 
          email, 
          tienecredito, 
          esexento, 
          diascredito, 
          saldo, 
          pagos, 
          fechaultimaventa, 
          fechacreacion, 
          fechacredito, 
          esagentederetencion, 
          redsocial1, 
          redsocial2, 
          redsocial3, 
          status, 
          coordenadas
        ) VALUES (
          $1, $2, $3, $4, '', '', 1, 1, 1, 1, '', 
          $5, '', '', 0, 0, 0, '0', '0', 
          NULL, NOW(), NOW(), 0, 
          NULL, NULL, NULL, '1', '10.5100, -66.9100'
        )
        RETURNING idcliente, codigocliente
      `;
      
      const params = [
        nextId,
        codigoCliente,
        nombreCompleto.toUpperCase(),
        rifFormateado,
        telefono
      ];
      
      
      const result = await this.valeryDbService.ejecutarQuery(insertQuery, params, '');
      
      if (result && result.length > 0) {
        this.logger.log(`✅ Cliente creado exitosamente: ${codigoCliente} - ${nombreCompleto}`);
        return {
          success: true,
          codigocliente: codigoCliente,
          idcliente: result[0].idcliente
        };
      } else {
        return {
          success: false,
          error: 'No se pudo insertar el registro'
        };
      }
      
    } catch (error) {
      this.logger.error(`Error creando cliente: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Función de diagnóstico para verificar si un número existe en la BD
   */
  async diagnosticarNumeroTelefono(numeroOriginal: string): Promise<any> {
    try {
      this.logger.log(`🔍 DIAGNÓSTICO - Número original: "${numeroOriginal}"`);
      
      // Normalizar el número
      const numeroNormalizado = this.normalizePhoneNumber(numeroOriginal);
      this.logger.log(`🔍 DIAGNÓSTICO - Número normalizado: "${numeroNormalizado}"`);
      
      // Buscar en la BD con diferentes variaciones
      const variaciones = [
        numeroNormalizado,
        numeroOriginal,
        numeroOriginal.replace('@s.whatsapp.net', ''),
        numeroNormalizado.replace('0', '58'),
        numeroNormalizado.replace('0', '+58'),
      ];
      
      for (const variacion of variaciones) {
        this.logger.log(`🔍 DIAGNÓSTICO - Probando variación: "${variacion}"`);
        
        const query = `
          SELECT c.codigocliente, c.nombre, c.telefono1, c.telefono2, c.rif
          FROM clientes c
          WHERE c.telefono1 = $1 OR c.telefono2 = $1
          LIMIT 1
        `;
        
        const result = await this.valeryDbService.ejecutarQuery(query, [variacion], '');
        
        if (result && result.length > 0) {
          this.logger.log(`✅ DIAGNÓSTICO - ¡ENCONTRADO con variación "${variacion}"!`);
          this.logger.log(`✅ DIAGNÓSTICO - Cliente: ${JSON.stringify(result[0], null, 2)}`);
          return { encontrado: true, variacion, cliente: result[0] };
        }
      }
      
      // Si no se encontró, hacer una búsqueda más amplia
      this.logger.log(`🔍 DIAGNÓSTICO - No encontrado con variaciones, buscando todos los teléfonos...`);
      const queryAmplia = `
        SELECT c.codigocliente, c.nombre, c.telefono1, c.telefono2, c.rif
        FROM clientes c
        WHERE c.telefono1 LIKE '%${numeroNormalizado.slice(-8)}%' OR c.telefono2 LIKE '%${numeroNormalizado.slice(-8)}%'
        LIMIT 10
      `;
      
      const resultadosAmplio = await this.valeryDbService.ejecutarQuery(queryAmplia, [], '');
      this.logger.log(`🔍 DIAGNÓSTICO - Búsqueda amplia encontró ${resultadosAmplio?.length || 0} resultados`);
      
      if (resultadosAmplio && resultadosAmplio.length > 0) {
        resultadosAmplio.forEach((cliente, index) => {
          this.logger.log(`🔍 DIAGNÓSTICO - Resultado ${index + 1}: ${cliente.nombre} - Tel1: "${cliente.telefono1}" - Tel2: "${cliente.telefono2}"`);
        });
      }
      
      return { encontrado: false, variaciones, resultadosAmplio };
      
    } catch (error) {
      this.logger.error(`❌ Error en diagnóstico: ${error.message}`);
      return { error: error.message };
    }
  }

  /**
   * Generar mensaje de bienvenida para clientes nuevos
   */
  private async generateNewClientWelcome(session: PersistentSession): Promise<string> {
    const currentHour = new Date().getHours();
    const timeGreeting = this.getTimeBasedGreeting(currentHour);
    
    return `🎊 ${timeGreeting}! 🎊\n` +
           `═══════════════════════════\n` +
           `🌟 **¡BIENVENIDO A GÓMEZMARKET!** 🌟\n` +
           `🤖 Soy **GómezBot**, su asistente personal\n\n` +
           `🎯 **PARA COMENZAR** 🎯\n` +
           `═══════════════════════════\n` +
           `📝 Indíqueme su **cédula o RIF**\n` +
           `✨ Le ofreceré un servicio personalizado\n` +
           `🚀 ¡Descubra nuestras ofertas exclusivas!\n\n` +
           `📌 **Ejemplo:** V12345678 o J408079305\n` +
           `💎 ¡Su experiencia premium comienza aquí! 💎`;
  }

  /**
   * Obtener configuracion del chatbot
   */
  private async getChatbotConfig(chatbotId: string): Promise<any> {
    try {
      const axios = require('axios');
      const response = await axios.get('http://localhost:3000/api/admin/multi-tenant/chatbots/' + chatbotId);
      return response.data.data;
    } catch (error) {
      this.logger.error('Error obteniendo configuracion del chatbot: ' + error.message);
      return null;
    }
  }

  // ==========================================
  // 🆕 FUNCIONALIDADES AVANZADAS (similar a n8n)
  // ==========================================

  /**
   * HERRAMIENTA: run_query (equivalente a n8n)
   * Ejecuta consultas SQL inteligentes en la BD externa
   */
  async runQueryTool(queryType: string, searchTerm: string, marca?: string, session?: PersistentSession): Promise<any> {
    try {
      this.logger.log(`🔍 [TOOL] run_query: ${queryType} para "${searchTerm}"`);
      
      // Obtener configuración de BD externa
      const dbConfig = await this.getExternalDbConfig(session?.activeChatbotId);
      if (!dbConfig) {
        throw new Error('Configuración de BD externa no disponible');
      }

      // Ejecutar consulta usando ValeryToolsService
      const result = await this.valeryToolsService.runQuery(
        queryType,
        searchTerm,
        marca,
        dbConfig
      );

      this.logger.log(`✅ [TOOL] run_query ejecutada: ${result.rowCount || 0} resultados`);
      return result;

    } catch (error) {
      this.logger.error(`❌ [TOOL] Error en run_query: ${error.message}`);
      return {
        respuesta: `😔 No pude procesar la consulta en este momento: ${error.message}`,
        error: true
      };
    }
  }

  /**
   * HERRAMIENTA: crear_cliente (equivalente a n8n)
   * Crea nuevos clientes en la BD externa
   */
  async crearClienteTool(clienteData: any, session: PersistentSession): Promise<any> {
    try {
      this.logger.log(`👤 [TOOL] crear_cliente: ${clienteData.nombre}`);
      
      const dbConfig = await this.getExternalDbConfig(session.activeChatbotId);
      if (!dbConfig) {
        throw new Error('Configuración de BD externa no disponible');
      }

      const result = await this.valeryToolsService.crearCliente(clienteData, dbConfig);
      
      this.logger.log(`✅ [TOOL] crear_cliente: ${result.cliente_existia ? 'Cliente existente' : 'Cliente nuevo'}`);
      return result;

    } catch (error) {
      this.logger.error(`❌ [TOOL] Error en crear_cliente: ${error.message}`);
      return {
        mensaje: `Error creando cliente: ${error.message}`,
        error: true
      };
    }
  }

  /**
   * HERRAMIENTA: crear_pedido (equivalente a n8n)
   * Crea pedidos completos en la BD externa
   */
  async crearPedidoTool(pedidoData: any, session: PersistentSession): Promise<any> {
    try {
      this.logger.log(`📋 [TOOL] crear_pedido para: ${pedidoData.pedido.nombrecliente}`);
      
      const dbConfig = await this.getExternalDbConfig(session.activeChatbotId);
      if (!dbConfig) {
        throw new Error('Configuración de BD externa no disponible');
      }

      const result = await this.valeryToolsService.crearPedido(pedidoData, dbConfig);
      
      this.logger.log(`✅ [TOOL] crear_pedido: ID ${result.id_pedido_creado}`);
      return result;

    } catch (error) {
      this.logger.error(`❌ [TOOL] Error en crear_pedido: ${error.message}`);
      return {
        confirmacion: `❌ Error creando pedido: ${error.message}`,
        error: true
      };
    }
  }

  /**
   * HERRAMIENTA: validar_pago (equivalente a n8n)
   * Valida pagos reportados por clientes
   */
  async validarPagoTool(pagoData: any, session: PersistentSession): Promise<any> {
    try {
      this.logger.log(`💳 [TOOL] validar_pago: ${pagoData.metodo} - $${pagoData.monto_reportado_cliente}`);
      
      // Lógica de validación básica implementada directamente
      const montoReportado = parseFloat(pagoData.monto_reportado_cliente);
      const montoEsperado = pagoData.metodo === 'zelle' ? pagoData.monto_esperado_usd : pagoData.monto_esperado_bs;
      const tolerancia = montoEsperado * 0.05; // 5% de tolerancia

      const montoValido = Math.abs(montoReportado - montoEsperado) <= tolerancia;

      const result = {
        pago_exitoso: montoValido,
        mensaje: montoValido 
          ? '✅ Pago validado correctamente' 
          : `❌ Monto no coincide. Esperado: ${montoEsperado}, Recibido: ${montoReportado}`,
        monto_validado: montoReportado,
        monto_esperado: montoEsperado
      };

      this.logger.log(`✅ [TOOL] validar_pago: ${montoValido ? 'VÁLIDO' : 'INVÁLIDO'}`);
      return result;

    } catch (error) {
      this.logger.error(`❌ [TOOL] Error en validar_pago: ${error.message}`);
      return {
        pago_exitoso: false,
        mensaje: `Error validando pago: ${error.message}`,
        error: true
      };
    }
  }

  /**
   * HERRAMIENTA: leer_ofertas (equivalente a n8n)
   * Lee ofertas especiales disponibles
   */
  async leerOfertasTool(codigocliente?: string): Promise<any> {
    try {
      this.logger.log(`🎉 [TOOL] leer_ofertas para cliente: ${codigocliente || 'general'}`);
      
      // Ofertas dinámicas basadas en la hora y día
      const ahora = new Date();
      const hora = ahora.getHours();
      const diaSemana = ahora.getDay();
      
      const ofertas = [];

      // Ofertas por horario
      if (hora >= 9 && hora <= 11) {
        ofertas.push('🌅 ¡Oferta Mañanera! 15% descuento en productos de desayuno');
      }
      
      if (hora >= 17 && hora <= 19) {
        ofertas.push('🌆 ¡Happy Hour! 10% descuento en bebidas y snacks');
      }

      // Ofertas por día de la semana
      if (diaSemana === 1) { // Lunes
        ofertas.push('💪 ¡Lunes Motivador! Envío gratis en pedidos +$30');
      }
      
      if (diaSemana === 5) { // Viernes
        ofertas.push('🎉 ¡Viernes de Ofertas! 2x1 en productos seleccionados');
      }

      // Ofertas estáticas
      ofertas.push('🛒 Compra 3 productos y llévate el 4to gratis');
      ofertas.push('💰 Envío gratis en compras mayores a $50');

      const result = {
        ofertas: ofertas,
        mensaje: ofertas.length > 0 ? ofertas.join('\n\n') : 'No hay ofertas disponibles en este momento'
      };

      this.logger.log(`✅ [TOOL] leer_ofertas: ${ofertas.length} ofertas disponibles`);
      return result;

    } catch (error) {
      this.logger.error(`❌ [TOOL] Error en leer_ofertas: ${error.message}`);
      return {
        ofertas: [],
        mensaje: 'No hay ofertas disponibles en este momento'
      };
    }
  }

  /**
   * HERRAMIENTA: get_schema (equivalente a n8n)
   * Obtiene esquema de BD para consultas dinámicas
   */
  async getSchemaTool(session: PersistentSession): Promise<any> {
    try {
      this.logger.log(`📊 [TOOL] get_schema para BD externa`);
      
      // Esquema básico de las tablas principales
      const schema = {
        tablas: {
          inventario: {
            descripcion: 'Productos disponibles',
            campos: ['codigo', 'nombre', 'preciounidad', 'existenciaunidad', 'alicuotaiva', 'status']
          },
          clientes: {
            descripcion: 'Información de clientes',
            campos: ['codigocliente', 'nombre', 'rif', 'telefono1', 'direccion1', 'status']
          },
          encabedoc: {
            descripcion: 'Encabezados de pedidos',
            campos: ['idencabedoc', 'codcliente', 'nombrecliente', 'total', 'fechaemision', 'status']
          },
          movimientosdoc: {
            descripcion: 'Detalles de productos en pedidos',
            campos: ['idmovimientosdoc', 'idencabedoc', 'codigo', 'nombre', 'cantidad', 'precio']
          },
          pagos: {
            descripcion: 'Información de pagos',
            campos: ['idencabedoc', 'idtipo', 'monto', 'referencia', 'status']
          }
        },
        consultas_disponibles: [
          'consulta_inventario_termino_simple',
          'consulta_inventario_palabras_multiples',
          'buscar_cliente_por_telefono',
          'buscar_cliente_por_cedula'
        ]
      };

      this.logger.log(`✅ [TOOL] get_schema: ${Object.keys(schema.tablas).length} tablas disponibles`);
      return schema;

    } catch (error) {
      this.logger.error(`❌ [TOOL] Error en get_schema: ${error.message}`);
      return {
        error: `Error obteniendo esquema: ${error.message}`
      };
    }
  }

  /**
   * Obtener configuración de BD externa del chatbot
   * Prioriza la configuración del frontend sobre las variables de entorno
   */
  private async getExternalDbConfig(chatbotId: string): Promise<any> {
    try {
      this.logger.log(`🔍 Obteniendo configuración de BD externa para chatbot: ${chatbotId}`);
      
      const chatbotConfig = await this.getChatbotConfig(chatbotId);
      if (chatbotConfig?.externalDbConfig?.enabled) {
        this.logger.log(`✅ Usando configuración de BD desde frontend para chatbot: ${chatbotId}`);
        return {
          host: chatbotConfig.externalDbConfig.host,
          port: chatbotConfig.externalDbConfig.port,
          database: chatbotConfig.externalDbConfig.database,
          username: chatbotConfig.externalDbConfig.username,
          password: chatbotConfig.externalDbConfig.password,
          ssl: chatbotConfig.externalDbConfig.ssl || false
        };
      }
      
      this.logger.warn(`⚠️ No hay configuración de BD externa habilitada para chatbot: ${chatbotId}`);
      return null;
      
    } catch (error) {
      this.logger.error(`❌ Error obteniendo configuración de BD externa: ${error.message}`);
      return null;
    }
  }

  /**
   * Procesamiento inteligente con herramientas (estilo n8n)
   */
  async processWithAdvancedTools(message: string, session: PersistentSession): Promise<string> {
    try {
      this.logger.log(`🧠 [AI+TOOLS] Procesando mensaje con herramientas avanzadas: "${message}"`);
      
      // Detectar intent del mensaje
      const intent = await this.analyzeMessageIntent(message, session);
      
      switch (intent.type) {
        case 'product_search':
          // Usar herramienta run_query
          const searchResult = await this.runQueryTool(
            'consulta_inventario_termino_simple',
            intent.entities.product,
            intent.entities.brand,
            session
          );
          return searchResult.respuesta;

        case 'client_registration':
          // Usar herramienta crear_cliente
          const clientData = {
            codigocliente_propuesto: intent.entities.identification,
            rif: intent.entities.identification,
            nombre: intent.entities.name || 'Cliente WhatsApp',
            telefono1: session.phoneNumber,
            direccion1: intent.entities.address
          };
          const clientResult = await this.crearClienteTool(clientData, session);
          return clientResult.mensaje;

        case 'order_creation':
          // Usar herramienta crear_pedido
          const orderData = this.buildOrderFromCart(session);
          const orderResult = await this.crearPedidoTool(orderData, session);
          return orderResult.confirmacion;

        case 'payment_validation':
          // Usar herramienta validar_pago
          const paymentData = {
            metodo: intent.entities.payment_method,
            monto_reportado_cliente: intent.entities.amount,
            monto_esperado_usd: session.metadata?.total_usd || 0,
            monto_esperado_bs: session.metadata?.total_bs || 0,
            referencia_reportada_cliente: intent.entities.reference,
            telefono_cliente: session.phoneNumber,
            id_pedido: session.metadata?.order_id
          };
          const paymentResult = await this.validarPagoTool(paymentData, session);
          return paymentResult.mensaje;

        case 'offers_request':
          // Usar herramienta leer_ofertas
          const offersResult = await this.leerOfertasTool(session.metadata?.client_code);
          return offersResult.mensaje;

        default:
          // Proceso normal si no hay herramientas específicas
          return await this.processIntelligentMessage(message, session, session.activeChatbotId);
      }

    } catch (error) {
      this.logger.error(`❌ [AI+TOOLS] Error en procesamiento avanzado: ${error.message}`);
      return '😔 Disculpa, hubo un problema procesando tu solicitud. ¿Podrías intentar de nuevo?';
    }
  }

  /**
   * Construir datos de pedido desde el carrito
   */
  private buildOrderFromCart(session: PersistentSession): any {
    const cart = session.metadata?.cart || [];
    const cliente = session.metadata?.client || {};
    
    const subtotal = cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    return {
      query: {
        pedido: {
          codigocliente: cliente.codigo || session.phoneNumber,
          rif: cliente.rif || session.phoneNumber,
          nombrecliente: cliente.nombre || 'Cliente WhatsApp',
          telefonos: session.phoneNumber,
          monedacodigo: '02',
          moneda: 'DOLARES',
          tasa: 37.5,
          subtotal: subtotal,
          iva: iva,
          total: total,
          fechaemision: new Date().toISOString().split('T')[0],
          hora: new Date().toTimeString().split(' ')[0],
          observaciones: 'Pedido vía WhatsApp',
          idpago: '02'
        },
        productos: cart.map(item => ({
          codigo: item.codigo,
          nombre: item.nombre,
          cantidad: item.cantidad,
          precio: item.precio,
          iva: item.precio * 0.16,
          preciototal: item.precio * item.cantidad * 1.16
        }))
      }
    };
  }

  private analyzeCartAction(message: string): { action: string, data?: any } {
    // Normalizar mensaje (minúsculas, sin acentos)
    const normalizedMessage = message.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // 🔍 PATRONES MEJORADOS PARA DETECTAR ACCIONES DE CARRITO
    
    // Patrones para AGREGAR al carrito
    if (
      /agregar\s+(?:el\s+)?(?:producto\s+)?\d+/i.test(normalizedMessage) ||   // "agregar producto 1"
      /agrega\s+(?:el\s+)?(?:producto\s+)?\d+/i.test(normalizedMessage) ||    // "agrega el 1"
      /agregar\s+\d+\s+(?:del|de|productos?|unidades?)/i.test(normalizedMessage) || // "agregar 2 del producto 3"
      /anadir\s+(?:al\s+)?carrito/i.test(normalizedMessage) ||               // "añadir al carrito"
      /poner\s+(?:en\s+)?(?:el\s+)?carrito/i.test(normalizedMessage) ||      // "poner en el carrito"
      /comprar\s+(?:el\s+)?(?:producto\s+)?\d+/i.test(normalizedMessage)     // "comprar el producto 1"
    ) {
      return { action: 'add' };
    }
    
    // Patrones para VER el carrito
    if (
      /ver\s+(?:mi\s+)?carrito/i.test(normalizedMessage) ||
      /mostrar\s+(?:mi\s+)?carrito/i.test(normalizedMessage) ||
      /(?:mi\s+)?carrito/i.test(normalizedMessage) ||
      /items\s+seleccionados/i.test(normalizedMessage) ||
      /productos\s+seleccionados/i.test(normalizedMessage) ||
      /que\s+llevo/i.test(normalizedMessage)
    ) {
      return { action: 'view' };
    }
    
    // Patrones para QUITAR productos del carrito
    if (
      /quitar\s+(?:el\s+)?(?:producto\s+)?\d+/i.test(normalizedMessage) ||
      /eliminar\s+(?:el\s+)?(?:producto\s+)?\d+/i.test(normalizedMessage) ||
      /remover\s+(?:el\s+)?(?:producto\s+)?\d+/i.test(normalizedMessage) ||
      /sacar\s+(?:el\s+)?(?:producto\s+)?\d+/i.test(normalizedMessage)
    ) {
      return { action: 'remove' };
    }
    
    // Patrones para VACIAR el carrito
    if (
      /vaciar\s+(?:el\s+)?carrito/i.test(normalizedMessage) ||
      /limpiar\s+(?:el\s+)?carrito/i.test(normalizedMessage) ||
      /eliminar\s+(?:todos\s+)?(?:los\s+)?productos/i.test(normalizedMessage) ||
      /quitar\s+todo/i.test(normalizedMessage)
    ) {
      return { action: 'clear' };
    }
    
    // Patrones para PROCEDER A COMPRAR
    if (
      /proceder\s+(?:a\s+)?(?:la\s+)?compra/i.test(normalizedMessage) ||
      /finalizar\s+(?:la\s+)?compra/i.test(normalizedMessage) ||
      /comprar\s+ahora/i.test(normalizedMessage) ||
      /checkout/i.test(normalizedMessage) ||
      /pagar/i.test(normalizedMessage)
    ) {
      return { action: 'checkout' };
    }
    
    // Si no se reconoce ninguna acción específica
    return { action: 'unknown' };
  }
}
