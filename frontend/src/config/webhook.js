// 🔧 CONFIGURACIÓN DE WEBHOOK URLS
// Este archivo centraliza la lógica para generar URLs de webhook correctas

// Función para obtener variables de entorno de forma segura
function getEnvVar(key) {
  // Vite style
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[`VITE_${key}`];
  }
  
  // Create React App style (fallback)
  if (typeof process !== 'undefined' && process?.env) {
    return process.env[`REACT_APP_${key}`];
  }
  
  return null;
}

/**
 * Detecta la URL base correcta para webhooks según el entorno
 * @returns {string} URL base para webhooks
 */
export function getWebhookBaseUrl() {
  const currentHost = window.location.hostname;
  
  // Si estamos en desarrollo local
  if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
    // Verificar si hay una variable de entorno para ngrok
    const ngrokUrl = getEnvVar('NGROK_URL');
    if (ngrokUrl) {
      console.log('🌐 Usando ngrok URL desde variable de entorno:', ngrokUrl);
      return ngrokUrl;
    }
    
    // En desarrollo, usar la URL de producción para webhooks (más estable)
    console.log('🌐 Usando URL de producción para webhooks en desarrollo');
    return WEBHOOK_CONFIG.PRODUCTION_URL;
  }
  
  // En producción, usar la URL actual
  const productionUrl = `${window.location.protocol}//${window.location.host}`;
  console.log('🌍 Usando URL de producción:', productionUrl);
  return productionUrl;
}

/**
 * Genera una URL de webhook para un chatbot
 * @param {string} chatbotId - ID del chatbot (UUID real)
 * @param {string} fallbackName - Nombre para casos especiales (no se usa para nuevos chatbots)
 * @returns {string} URL completa del webhook
 */
export function generateWebhookUrl(chatbotId, fallbackName = 'nuevo-chatbot') {
  const baseUrl = getWebhookBaseUrl();
  
  // Si ya tiene ID real (UUID), usarlo directamente
  if (chatbotId && isValidChatbotId(chatbotId)) {
    console.log(`✅ Generando webhook con ID real: ${chatbotId}`);
    return `${baseUrl}/api/whatsapp/webhook/${chatbotId}`;
  }
  
  // Casos especiales para chatbots existentes conocidos
  const knownChatbots = getKnownChatbots();
  const normalizedName = fallbackName?.toLowerCase().trim();
  
  for (const [name, realId] of Object.entries(knownChatbots)) {
    if (normalizedName?.includes(name.toLowerCase())) {
      console.log(`🎯 Chatbot conocido detectado: ${name} -> ${realId}`);
      return `${baseUrl}/api/whatsapp/webhook/${realId}`;
    }
  }
  
  // Para chatbots nuevos SIN ID real, usar un ID temporal pero válido
  console.log(`⚠️ Generando URL temporal para chatbot nuevo sin ID`);
  const tempId = `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  return `${baseUrl}/api/whatsapp/webhook/${tempId}`;
}

/**
 * Verifica si un ID es un ID real de chatbot (UUID) o temporal
 * @param {string} id - ID a verificar
 * @returns {boolean} true si es un ID real
 */
export function isValidChatbotId(id) {
  if (!id) return false;
  
  // Formato UUID: 8-4-4-4-12 caracteres
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  return uuidRegex.test(id) && !id.includes('nuevo-chatbot');
}

/**
 * Verifica si una URL de webhook necesita ser actualizada
 * @param {string} webhookUrl - URL actual del webhook
 * @returns {boolean} true si necesita actualización
 */
export function needsWebhookUpdate(webhookUrl) {
  if (!webhookUrl) return true;
  
  const lastSegment = webhookUrl.split('/').pop();
  
  return webhookUrl.includes('localhost') ||
         webhookUrl.includes('ngrok') ||
         webhookUrl.includes('TEMP-ID') || 
         webhookUrl.includes('paciente') ||
         webhookUrl.includes('nuevo-chatbot') ||
         webhookUrl.includes('WILL-BE-UPDATED') ||
         lastSegment.startsWith('new-') ||
         /\-\d{6}$/.test(lastSegment) ||
         !isValidChatbotId(lastSegment);
}

/**
 * Obtiene la lista de chatbots conocidos con sus IDs reales
 * @returns {Object} Mapa de nombres a IDs reales
 */
function getKnownChatbots() {
  return {
    'gomez': '3b239c8f-c1ab-4917-9bc9-a4c4edfe1c83',
    'gomez bot': '3b239c8f-c1ab-4917-9bc9-a4c4edfe1c83',
    'gomezmarket': '3b239c8f-c1ab-4917-9bc9-a4c4edfe1c83',
    'gómez': '3b239c8f-c1ab-4917-9bc9-a4c4edfe1c83',
    'farmabien': '37cf871e-322f-4113-9c4c-482a0f61c882',
    'farmabienbot': '37cf871e-322f-4113-9c4c-482a0f61c882',
    // Agregar más chatbots conocidos aquí cuando sea necesario
  };
}

/**
 * Función auxiliar para crear slugs seguros
 * @param {string} str - Texto a convertir en slug
 * @returns {string} Slug seguro
 */
function slugifyForUrl(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .substring(0, 40);
}

// Configuración por defecto
export const WEBHOOK_CONFIG = {
  PRODUCTION_URL: 'https://mybot.zemog.info',
  LOCALHOST_FALLBACK: 'http://localhost:3000',
  WEBHOOK_PATH: '/api/whatsapp/webhook',
  UPDATE_WEBHOOK_ON_CREATE: true
};

 