/**
 * Valery Chatbot Service - Mejorado con IA
 * 
 * Servicio para chatbots de tipo Valery y eCommerce con integración de IA
 * para mejorar la búsqueda de productos y gestión del carrito.
 */

// Importar dependencias existentes
const { BaseChatbotService } = require('../chatbot/base-chatbot.service');
const { ValeryDbService } = require('./valery-db.service');

// Importar nuevas dependencias para IA
const valeryAIIntegration = require('../chatbot/services/valery-ai-integration');
const DatabaseCompatibility = require('../external-db/database-compatibility');

class ValeryChatbotService extends BaseChatbotService {
  constructor() {
    super();
    this.dbService = new ValeryDbService();
    this.useAI = true; // Habilitar IA por defecto
  }

  /**
   * Inicializa el servicio con la instancia del chatbot
   * @param {object} chatbotInstance - Instancia del chatbot
   */
  initialize(chatbotInstance) {
    super.initialize(chatbotInstance);
    
    // Determinar si este chatbot debe usar IA
    if (chatbotInstance && chatbotInstance.chatbotConfig) {
      const config = chatbotInstance.chatbotConfig;
      this.useAI = config.chatbotType === 'valery' || 
                  config.chatbotType === 'ecommerce' ||
                  config.processor === 'valery';
    }
    
    console.log(`🤖 Inicializando ValeryChatbotService para ${chatbotInstance?.name} (ID: ${chatbotInstance?.id})`);
    console.log(`🧠 Integración con IA: ${this.useAI ? 'ACTIVADA' : 'DESACTIVADA'}`);
  }

  /**
   * Procesa un mensaje de usuario
   * @param {object} message - Mensaje del usuario
   * @returns {Promise<object>} - Respuesta procesada
   */
  async processMessage(message) {
    if (!message || !message.text) {
      return { text: 'Lo siento, no pude entender tu mensaje.' };
    }

    // Analizar el tipo de mensaje
    const messageType = this.analyzeMessageType(message.text);
    
    switch (messageType.type) {
      case 'product_search':
        return await this.handleProductSearch(message.text, messageType.entities);
      
      case 'cart_action':
        return await this.handleCartAction(message.text, messageType.entities);
      
      default:
        return await super.processMessage(message);
    }
  }

  /**
   * Analiza el tipo de mensaje
   * @param {string} text - Texto del mensaje
   * @returns {object} - Tipo de mensaje e información adicional
   */
  analyzeMessageType(text) {
    const normalizedText = text.toLowerCase().trim();
    
    // Detectar búsqueda de productos
    if (normalizedText.includes('buscar') || 
        normalizedText.includes('encontrar') || 
        normalizedText.includes('quiero') ||
        normalizedText.includes('necesito')) {
      return { type: 'product_search', entities: { searchTerm: normalizedText } };
    }
    
    // Detectar acción de carrito
    if (normalizedText.includes('agregar') || 
        normalizedText.includes('añadir') || 
        normalizedText.includes('comprar') ||
        normalizedText.includes('quitar') ||
        normalizedText.includes('eliminar') ||
        normalizedText.includes('carrito')) {
      return { type: 'cart_action', entities: { action: normalizedText } };
    }
    
    // Mensaje genérico
    return { type: 'general', entities: {} };
  }

  /**
   * Maneja una búsqueda de productos
   * @param {string} text - Texto de búsqueda
   * @param {object} entities - Entidades detectadas
   * @returns {Promise<object>} - Resultados de la búsqueda
   */
  async handleProductSearch(text, entities) {
    console.log(`🔍 Procesando búsqueda: "${text}"`);
    
    try {
      let searchResults = [];
      
      // Si la IA está habilitada, usar procesamiento avanzado
      if (this.useAI && this.chatbotInstance) {
        const aiProcessing = await valeryAIIntegration.processSearchQuery(
          text, 
          this.chatbotInstance, 
          this.dbService
        );
        
        if (aiProcessing.useAI && aiProcessing.enhancedQuery) {
          // Usar la consulta mejorada por IA
          const { query, params } = aiProcessing.enhancedQuery;
          searchResults = await this.dbService.ejecutarQuery(query, params);
          
          // Actualizar contexto de productos para referencias futuras
          if (aiProcessing.updateContext) {
            aiProcessing.updateContext(searchResults);
          }
        } else {
          // Fallback a búsqueda tradicional
          searchResults = await this.traditionalProductSearch(text);
        }
      } else {
        // Búsqueda tradicional sin IA
        searchResults = await this.traditionalProductSearch(text);
      }
      
      // Formatear resultados para mostrar al usuario
      return this.formatProductSearchResults(searchResults, text);
    } catch (error) {
      console.error('❌ Error en búsqueda de productos:', error);
      return { 
        text: 'Lo siento, ocurrió un error al buscar productos. Por favor intenta de nuevo.' 
      };
    }
  }

  /**
   * Realiza una búsqueda de productos tradicional (sin IA)
   * @param {string} searchTerm - Término de búsqueda
   * @returns {Promise<Array>} - Resultados de la búsqueda
   */
  async traditionalProductSearch(searchTerm) {
    // Detectar tipo de base de datos
    const dbType = DatabaseCompatibility.detectDbType(
      this.chatbotInstance?.externalDbConfig || 'sqlite'
    );
    
    // Procesar términos múltiples
    const searchInfo = DatabaseCompatibility.processSearchTerms(searchTerm);
    
    // Generar consulta SQL
    let query, params;
    
    if (searchInfo.isMultiTerm && searchInfo.terms.length > 0) {
      // Consulta para múltiples términos
      const conditions = searchInfo.terms.map(() => {
        return dbType === 'sqlite' ? 
          'LOWER(nombre) LIKE ? COLLATE NOCASE' : 
          'LOWER(nombre) ILIKE ?';
      });
      
      params = searchInfo.terms.map(term => `%${term}%`);
      
      query = `
        SELECT
          codigo,
          nombre,
          preciounidad,
          alicuotaiva,
          existenciaunidad,
          (SELECT factorcambio FROM monedas WHERE codmoneda = '02' LIMIT 1) AS tasa_actual
        FROM inventario
        WHERE ${conditions.join(' AND ')}
          AND existenciaunidad > 0
        ORDER BY
          nombre ASC
        LIMIT 10
      `;
    } else {
      // Consulta para un solo término
      query = `
        SELECT
          codigo,
          nombre,
          preciounidad,
          alicuotaiva,
          existenciaunidad,
          (SELECT factorcambio FROM monedas WHERE codmoneda = '02' LIMIT 1) AS tasa_actual
        FROM inventario
        WHERE ${dbType === 'sqlite' ? 'LOWER(nombre) LIKE ? COLLATE NOCASE' : 'LOWER(nombre) ILIKE ?'}
          AND existenciaunidad > 0
        ORDER BY
          nombre ASC
        LIMIT 10
      `;
      params = [`%${searchTerm}%`];
    }
    
    // Adaptar la consulta al tipo de base de datos
    if (dbType === 'sqlite') {
      query = DatabaseCompatibility.adaptQuery(query, 'sqlite');
    }
    
    // Ejecutar la consulta
    return await this.dbService.ejecutarQuery(query, params);
  }

  /**
   * Formatea los resultados de búsqueda para mostrar al usuario
   * @param {Array} results - Resultados de la búsqueda
   * @param {string} searchTerm - Término de búsqueda original
   * @returns {object} - Respuesta formateada
   */
  formatProductSearchResults(results, searchTerm) {
    if (!results || results.length === 0) {
      return {
        text: `😔 No encontramos productos para "${searchTerm}". Por favor intenta con otros términos.`
      };
    }
    
    // Construir mensaje con resultados
    let responseText = `✅ Encontramos ${results.length} productos para "${searchTerm}":\n\n`;
    
    results.forEach((product, index) => {
      const price = product.preciounidad.toFixed(2);
      responseText += `${index + 1}. ${product.nombre} - $${price}\n`;
    });
    
    responseText += '\nPara agregar al carrito, escribe "agregar" seguido del número del producto.';
    
    return { text: responseText };
  }

  /**
   * Maneja una acción de carrito
   * @param {string} text - Texto de la acción
   * @param {object} entities - Entidades detectadas
   * @returns {Promise<object>} - Resultado de la acción
   */
  async handleCartAction(text, entities) {
    console.log(`🛒 Procesando acción de carrito: "${text}"`);
    
    try {
      // Si la IA está habilitada, usar procesamiento avanzado
      if (this.useAI && this.chatbotInstance) {
        const aiProcessing = await valeryAIIntegration.processCartAction(
          text, 
          this.chatbotInstance, 
          this.dbService
        );
        
        if (aiProcessing.useAI && aiProcessing.actionAnalysis) {
          const analysis = aiProcessing.actionAnalysis;
          
          // Si la IA resolvió correctamente la acción
          if (analysis.success) {
            return this.executeCartAction(
              analysis.action, 
              analysis.product, 
              analysis.quantity
            );
          } else {
            // La IA no pudo resolver la referencia al producto
            return {
              text: `Lo siento, no pude identificar qué producto deseas ${analysis.action}. ` +
                    'Por favor, especifica el número o nombre del producto.'
            };
          }
        }
      }
      
      // Procesamiento tradicional sin IA
      return this.traditionalCartAction(text);
    } catch (error) {
      console.error('❌ Error en acción de carrito:', error);
      return { 
        text: 'Lo siento, ocurrió un error al procesar tu acción en el carrito. Por favor intenta de nuevo.' 
      };
    }
  }

  /**
   * Procesa una acción de carrito de forma tradicional (sin IA)
   * @param {string} text - Texto de la acción
   * @returns {object} - Resultado de la acción
   */
  traditionalCartAction(text) {
    // Implementación básica - en un sistema real esto sería más complejo
    return {
      text: 'Para agregar productos al carrito, primero busca productos y luego indica el número del producto que deseas agregar.'
    };
  }

  /**
   * Ejecuta una acción en el carrito
   * @param {string} action - Tipo de acción (agregar, eliminar, actualizar)
   * @param {object} product - Producto a modificar
   * @param {number} quantity - Cantidad
   * @returns {object} - Resultado de la acción
   */
  executeCartAction(action, product, quantity) {
    // Aquí implementarías la lógica real de carrito
    // Este es un ejemplo simplificado
    
    switch (action) {
      case 'agregar':
        return {
          text: `✅ Agregado al carrito: ${quantity}x ${product.nombre}`
        };
      
      case 'eliminar':
        return {
          text: `✅ Eliminado del carrito: ${product.nombre}`
        };
      
      case 'actualizar':
        return {
          text: `✅ Actualizado en el carrito: ${quantity}x ${product.nombre}`
        };
      
      default:
        return {
          text: 'No pude entender la acción que deseas realizar con el carrito.'
        };
    }
  }
}

module.exports = { ValeryChatbotService }; 