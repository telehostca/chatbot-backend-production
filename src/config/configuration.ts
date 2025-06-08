/**
 * Configuración global de la aplicación - Sistema SaaS PostgreSQL
 * Configuración para usar variables de entorno de Easypanel
 */
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  
  // 🐘 Configuración PostgreSQL usando variables de entorno
  database: {
    users: {
      type: 'postgres',
      host: process.env.DB_HOST || process.env.TYPEORM_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || process.env.TYPEORM_PORT, 10) || 5432,
      username: process.env.DB_USERNAME || process.env.TYPEORM_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || process.env.TYPEORM_PASSWORD || '0024',
      database: process.env.DB_DATABASE || process.env.TYPEORM_DATABASE || 'chatbot_backend',
      ssl: process.env.DB_SSL_MODE === 'require' ? { rejectUnauthorized: false } : false,
      retryAttempts: 3,
      retryDelay: 3000,
    },
    admin: {
      type: 'postgres',
      host: process.env.DB_HOST || process.env.TYPEORM_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || process.env.TYPEORM_PORT, 10) || 5432,
      username: process.env.DB_USERNAME || process.env.TYPEORM_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || process.env.TYPEORM_PASSWORD || '0024',
      database: process.env.DB_DATABASE || process.env.TYPEORM_DATABASE || 'chatbot_backend',
      retryAttempts: 3,
      retryDelay: 3000,
      ssl: process.env.DB_SSL_MODE === 'require' ? { rejectUnauthorized: false } : false,
    },
    externa: {
      type: 'postgres',
      host: process.env.DB_HOST || process.env.TYPEORM_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || process.env.TYPEORM_PORT, 10) || 5432,
      username: process.env.DB_USERNAME || process.env.TYPEORM_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || process.env.TYPEORM_PASSWORD || '0024',
      database: process.env.DB_DATABASE || process.env.TYPEORM_DATABASE || 'chatbot_backend',
      retryAttempts: 3,
      retryDelay: 3000,
      ssl: process.env.DB_SSL_MODE === 'require' ? { rejectUnauthorized: false } : false,
    },
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'saas-chatbot-secret-key-2025',
    expiresIn: '24h',
  },

  ai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: 'gpt-3.5-turbo',
    systemPrompt: 'Eres un asistente virtual para un sistema SaaS de chatbots.',
  },

  whatsapp: {
    apiUrl: process.env.WHATSAPP_API_URL || '',
    instance: process.env.WHATSAPP_INSTANCE || '',
  },
}); 