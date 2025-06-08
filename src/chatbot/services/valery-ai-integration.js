/**
 * Integración de IA para chatbots Valery y eCommerce
 * 
 * Este módulo integra el asistente de compras con IA específicamente
 * para los chatbots de tipo Valery y eCommerce.
 */

const AIShoppingAssistant = require('../../ai/ai-shopping-assistant');
const DatabaseCompatibility = require('../../external-db/database-compatibility');

class ValeryAIIntegration {
  constructor() {
    this.aiAssistants = new Map(); // Mapa de asistentes por chatbotId
    console.log('🤖 ValeryAIIntegration inicializado');
  }

  /**
   * Obtiene o crea un asistente de IA para un chatbot específico
   */
  getAssistant(chatbotId, dbService) {
    if (!this.aiAssistants.has(chatbotId)) {
      console.log(`🤖 Creando nuevo asistente de IA para chatbot: ${chatbotId}`);
      this.aiAssistants.set(chatbotId, new AIShoppingAssistant(dbService));
    }
    return this.aiAssistants.get(chatbotId);
  }

  /**
   * Determina si un chatbot debe usar la integración con IA
   */
  shouldUseAI(chatbotInstance) {
    if (!chatbotInstance || !chatbotInstance.chatbotConfig) {
      console.log('⚠️ Chatbot sin configuración válida');
      return false;
    }
    
    const config = chatbotInstance.chatbotConfig;
    
    // Verificar si es un chatbot de tipo Valery o eCommerce
    const isCompatible = (
      config.chatbotType === 'valery' || 
      config.chatbotType === 'ecommerce' ||
      config.processor === 'valery'
    );
    
    console.log(`🔍 Chatbot ${chatbotInstance.name} tipo ${config.chatbotType}: ${isCompatible ? 'Compatible' : 'No compatible'} con AI`);
    
    return isCompatible;
  }

  /**
   * Procesa una consulta de búsqueda usando IA
   */
  async processSearchQuery(query, chatbotInstance, dbService) {
    if (!this.shouldUseAI(chatbotInstance)) {
      console.log('⚠️ Este chatbot no utiliza la integración con IA');
      return { useAI: false, query };
    }
    
    try {
      console.log(`🧠 Procesando consulta con IA: "${query}"`);
      
      // Obtener el asistente de IA para este chatbot
      const assistant = this.getAssistant(chatbotInstance.id, dbService);
      
      // 1. Analizar la consulta con IA
      const queryAnalysis = await assistant.analyzeSearchQuery(query);
      
      // 2. Detectar tipo de base de datos
      const dbConfig = chatbotInstance.externalDbConfig || 'sqlite';
      const dbType = DatabaseCompatibility.detectDbType(dbConfig);
      
      // 3. Generar consulta SQL mejorada
      const enhancedQuery = assistant.generateEnhancedQuery(queryAnalysis, dbType);
      
      console.log('✅ Consulta mejorada generada');
      
      return {
        useAI: true,
        originalQuery: query,
        analysis: queryAnalysis,
        enhancedQuery: enhancedQuery,
        updateContext: (results) => assistant.updateProductContext(results, query)
      };
    } catch (error) {
      console.error('❌ Error en procesamiento IA:', error);
      // En caso de error, devolver la consulta original sin AI
      return { useAI: false, query };
    }
  }

  /**
   * Procesa una acción de carrito usando IA
   */
  async processCartAction(action, chatbotInstance, dbService) {
    if (!this.shouldUseAI(chatbotInstance)) {
      console.log('⚠️ Este chatbot no utiliza la integración con IA');
      return { useAI: false, action };
    }
    
    try {
      console.log(`🧠 Procesando acción de carrito con IA: "${action}"`);
      
      // Obtener el asistente de IA para este chatbot
      const assistant = this.getAssistant(chatbotInstance.id, dbService);
      
      // Analizar la acción con IA
      const actionAnalysis = await assistant.analyzeCartAction(action);
      
      console.log('✅ Acción de carrito analizada');
      
      return {
        useAI: true,
        originalAction: action,
        actionAnalysis
      };
    } catch (error) {
      console.error('❌ Error en procesamiento IA de carrito:', error);
      // En caso de error, devolver la acción original sin AI
      return { useAI: false, action };
    }
  }
}

// Instancia singleton para uso en toda la aplicación
const valeryAIIntegration = new ValeryAIIntegration();

module.exports = valeryAIIntegration;
