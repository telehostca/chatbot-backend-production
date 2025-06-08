/**
 * Configuración global de la aplicación - Sistema SaaS PostgreSQL
 * Configuración simplificada para el sistema SaaS con PostgreSQL únicamente
 * 
 * @module Configuration
 */
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  
  // 🐘 Configuración PostgreSQL única para sistema SaaS
  database: {
    users: {
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '0024',
      database: 'chatbot_backend',
      ssl: false,
      retryAttempts: 3,
      retryDelay: 3000,
    },
    // Todas las conexiones apuntan a la misma base de datos PostgreSQL
    admin: {
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '0024',
      database: 'chatbot_backend',
      retryAttempts: 3,
      retryDelay: 3000,
      ssl: false,
    },
    externa: {
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: '0024',
      database: 'chatbot_backend',
      retryAttempts: 3,
      retryDelay: 3000,
      ssl: false,
    },
  },

  // 🔐 Configuración JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'saas-chatbot-secret-key-2025',
    expiresIn: '24h',
  },

  // 🤖 Configuración AI (solo las necesarias)
  ai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-3.5-turbo',
    systemPrompt: `Eres un asistente virtual para un sistema SaaS de chatbots. 
Ayuda a los usuarios de manera profesional y amigable.`,
  },

  // 📱 WhatsApp (configuración básica)
  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || '',
    instance: process.env.WHATSAPP_INSTANCE || '',
  },
}); 