-- 🏗️ SCRIPT COMPLETO PARA CREAR TODAS LAS TABLAS MANUALMENTE
-- Compatible con PostgreSQL
-- Incluye todas las entidades del sistema SaaS

BEGIN;

-- ===============================
-- TABLAS PRINCIPALES DEL SISTEMA
-- ===============================

-- 1. Organizaciones
CREATE TABLE IF NOT EXISTS "organizations" (
    "id" varchar PRIMARY KEY NOT NULL,
    "name" varchar(100) NOT NULL,
    "slug" varchar(50) NOT NULL,
    "description" text,
    "logo" varchar(255),
    "contactEmail" varchar(100),
    "contactPhone" varchar(20),
    "settings" text,
    "isActive" boolean NOT NULL DEFAULT true,
    "maxChatbots" integer NOT NULL DEFAULT 5,
    "planType" varchar(20) NOT NULL DEFAULT 'trial',
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_organizations_slug" UNIQUE ("slug")
);

-- 2. Planes de Usuario (con fix aplicado)
CREATE TABLE IF NOT EXISTS "user_plans" (
    "id" SERIAL PRIMARY KEY,
    "name" varchar NOT NULL DEFAULT 'Plan Básico',
    "description" varchar NOT NULL DEFAULT 'Plan estándar con funciones básicas',
    "price" decimal(10,2) NOT NULL DEFAULT 0,
    "currency" varchar NOT NULL DEFAULT 'USD',
    "billing_cycle" varchar NOT NULL DEFAULT 'monthly',
    "features" json,
    "max_chatbots" integer NOT NULL DEFAULT 0,
    "max_messages_per_month" integer NOT NULL DEFAULT 1000,
    "whatsapp_integration" boolean NOT NULL DEFAULT true,
    "ai_responses" boolean NOT NULL DEFAULT false,
    "analytics" boolean NOT NULL DEFAULT false,
    "custom_branding" boolean NOT NULL DEFAULT false,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_user_plans_name" UNIQUE ("name")
);

-- 3. Usuarios
CREATE TABLE IF NOT EXISTS "users" (
    "id" varchar PRIMARY KEY NOT NULL,
    "name" varchar NOT NULL,
    "email" varchar NOT NULL,
    "password" varchar NOT NULL,
    "phone" varchar,
    "codigoCliente" varchar,
    "isActive" boolean NOT NULL DEFAULT true,
    "saldo" decimal(10,2) NOT NULL DEFAULT 0,
    "direccion" varchar,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    "role" varchar NOT NULL,
    "status" varchar NOT NULL,
    "nombre" varchar,
    "rif" varchar,
    "direccion1" varchar,
    "direccion2" varchar,
    "idpais" integer,
    "idestado" integer,
    "idciudad" integer,
    "idmunicipio" integer,
    "codigopostal" varchar,
    "telefono1" varchar,
    "telefono2" varchar,
    "tienecredito" integer,
    "esexento" integer,
    "diascredito" integer,
    "pagos" decimal(10,2),
    "fechaultimaventa" TIMESTAMP,
    "fechacreacion" TIMESTAMP,
    "fechacredito" TIMESTAMP,
    "esagentederetencion" integer,
    "redsocial1" varchar,
    "redsocial2" varchar,
    "redsocial3" varchar,
    "coordenadas" varchar,
    CONSTRAINT "UQ_users_email" UNIQUE ("email")
);

-- 4. Suscripciones de Usuario
CREATE TABLE IF NOT EXISTS "user_subscriptions" (
    "id" SERIAL PRIMARY KEY,
    "userId" varchar NOT NULL,
    "planId" integer NOT NULL,
    "status" varchar NOT NULL DEFAULT 'active',
    "startDate" TIMESTAMP NOT NULL DEFAULT now(),
    "endDate" TIMESTAMP,
    "isActive" boolean NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

-- 5. Uso de Usuario
CREATE TABLE IF NOT EXISTS "user_usage" (
    "id" SERIAL PRIMARY KEY,
    "userId" varchar NOT NULL,
    "month" integer NOT NULL,
    "year" integer NOT NULL,
    "messagesUsed" integer NOT NULL DEFAULT 0,
    "chatbotsUsed" integer NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

-- 6. Instancias de Chatbot
CREATE TABLE IF NOT EXISTS "chatbot_instances" (
    "id" varchar PRIMARY KEY NOT NULL,
    "name" varchar(100) NOT NULL,
    "slug" varchar(50) NOT NULL,
    "description" text,
    "avatar" varchar(255),
    "isActive" boolean NOT NULL DEFAULT true,
    "aiConfig" text NOT NULL,
    "whatsappConfig" text NOT NULL,
    "externalDbConfig" text,
    "chatbotConfig" text NOT NULL,
    "notificationConfig" text NOT NULL,
    "status" varchar(20) NOT NULL DEFAULT 'active',
    "totalConversations" integer NOT NULL DEFAULT 0,
    "totalMessages" integer NOT NULL DEFAULT 0,
    "totalRevenue" decimal(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    "organizationId" varchar NOT NULL,
    CONSTRAINT "UQ_chatbot_instances_slug" UNIQUE ("slug")
);

-- 7. Chatbots (tabla legacy)
CREATE TABLE IF NOT EXISTS "chatbots" (
    "id" varchar PRIMARY KEY NOT NULL,
    "name" varchar NOT NULL,
    "description" varchar NOT NULL,
    "apiKey" varchar NOT NULL,
    "isActive" boolean NOT NULL,
    "settings" text NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- ===============================
-- TABLAS DE SESIONES Y CHAT
-- ===============================

-- 8. Sesiones Persistentes
CREATE TABLE IF NOT EXISTS "persistent_sessions" (
    "id" varchar PRIMARY KEY NOT NULL,
    "phoneNumber" varchar NOT NULL,
    "clientId" varchar,
    "clientName" varchar,
    "identificationNumber" varchar,
    "clientPushname" varchar,
    "isAuthenticated" boolean NOT NULL DEFAULT false,
    "isNewClient" boolean NOT NULL DEFAULT true,
    "context" varchar NOT NULL DEFAULT 'initial',
    "status" varchar NOT NULL DEFAULT 'active',
    "lastUserMessage" text,
    "lastBotResponse" text,
    "lastActivity" TIMESTAMP,
    "messageCount" integer NOT NULL DEFAULT 0,
    "searchCount" integer NOT NULL DEFAULT 0,
    "activeChatbotId" varchar,
    "metadata" json,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_persistent_sessions_phoneNumber" UNIQUE ("phoneNumber")
);

-- 9. Sesiones de Chat
CREATE TABLE IF NOT EXISTS "chat_sessions" (
    "id" varchar PRIMARY KEY NOT NULL,
    "phoneNumber" varchar NOT NULL,
    "status" varchar NOT NULL DEFAULT 'active',
    "startTime" TIMESTAMP NOT NULL DEFAULT now(),
    "endTime" TIMESTAMP,
    "lastMessageTime" TIMESTAMP,
    "messageCount" integer NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- 10. Mensajes de Chat
CREATE TABLE IF NOT EXISTS "chat_messages" (
    "id" varchar PRIMARY KEY NOT NULL,
    "content" text NOT NULL,
    "sender" varchar NOT NULL,
    "timestamp" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "chat_session_id" varchar,
    "session_id" varchar
);

-- 11. Conversaciones (Admin)
CREATE TABLE IF NOT EXISTS "conversations" (
    "id" varchar PRIMARY KEY NOT NULL,
    "userId" varchar NOT NULL,
    "chatbotId" varchar NOT NULL,
    "cart" text,
    "metadata" text,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    "summary" text NOT NULL
);

-- 12. Mensajes de Admin
CREATE TABLE IF NOT EXISTS "admin_messages" (
    "id" varchar PRIMARY KEY NOT NULL,
    "content" varchar NOT NULL,
    "direction" varchar NOT NULL,
    "type" varchar NOT NULL,
    "metadata" text,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "conversationId" varchar
);

-- ===============================
-- TABLAS DE COMERCIO
-- ===============================

-- 13. Carritos de Compra
CREATE TABLE IF NOT EXISTS "shopping_carts" (
    "id" varchar PRIMARY KEY NOT NULL,
    "phoneNumber" varchar NOT NULL,
    "productCode" varchar NOT NULL,
    "productName" varchar NOT NULL,
    "unitPriceUsd" decimal(10,2) NOT NULL,
    "ivaTax" decimal(5,2) NOT NULL DEFAULT 0,
    "quantity" integer NOT NULL DEFAULT 1,
    "exchangeRate" decimal(10,2),
    "status" varchar NOT NULL DEFAULT 'active',
    "chatbotId" varchar,
    "metadata" json,
    "sessionId" varchar,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    "session_id" varchar
);

-- 14. Órdenes
CREATE TABLE IF NOT EXISTS "orders" (
    "id" SERIAL PRIMARY KEY,
    "orderNumber" varchar NOT NULL,
    "userId" varchar NOT NULL,
    "status" varchar NOT NULL DEFAULT 'pending',
    "total" decimal(10,2) NOT NULL,
    "currency" varchar NOT NULL DEFAULT 'USD',
    "items" json,
    "shippingAddress" text,
    "paymentMethod" varchar,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_orders_orderNumber" UNIQUE ("orderNumber")
);

-- 15. Productos
CREATE TABLE IF NOT EXISTS "productos" (
    "id" SERIAL PRIMARY KEY,
    "codigo" varchar NOT NULL,
    "nombre" varchar NOT NULL,
    "descripcion" text,
    "precio" decimal(10,2) NOT NULL,
    "categoria" varchar,
    "stock" integer DEFAULT 0,
    "activo" boolean DEFAULT true,
    "created_at" TIMESTAMP DEFAULT now(),
    "updated_at" TIMESTAMP DEFAULT now(),
    CONSTRAINT "UQ_productos_codigo" UNIQUE ("codigo")
);

-- 16. Pagos
CREATE TABLE IF NOT EXISTS "payments" (
    "id" SERIAL PRIMARY KEY,
    "orderId" varchar NOT NULL,
    "amount" decimal(10,2) NOT NULL,
    "currency" varchar NOT NULL DEFAULT 'USD',
    "status" varchar NOT NULL DEFAULT 'pending',
    "paymentMethod" varchar,
    "transactionId" varchar,
    "metadata" json,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- ===============================
-- TABLAS DE PROMOCIONES
-- ===============================

-- 17. Promociones
CREATE TABLE IF NOT EXISTS "promotions" (
    "id" varchar PRIMARY KEY NOT NULL,
    "name" varchar NOT NULL,
    "description" varchar NOT NULL,
    "code" varchar NOT NULL,
    "discountAmount" decimal(10,2) NOT NULL,
    "discountType" varchar NOT NULL,
    "isActive" boolean NOT NULL DEFAULT true,
    "startDate" TIMESTAMP NOT NULL,
    "endDate" TIMESTAMP NOT NULL,
    "minimumPurchaseAmount" decimal(10,2),
    "maximumDiscount" decimal(10,2),
    "usageLimit" integer NOT NULL DEFAULT 0,
    "usageCount" integer NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_promotions_code" UNIQUE ("code")
);

-- 18. Descuentos
CREATE TABLE IF NOT EXISTS "discounts" (
    "id" varchar PRIMARY KEY NOT NULL,
    "name" varchar NOT NULL,
    "description" text,
    "type" varchar NOT NULL DEFAULT 'percentage',
    "value" decimal(10,2) NOT NULL,
    "minimumAmount" decimal(10,2) NOT NULL DEFAULT 0,
    "maximumDiscount" decimal(10,2),
    "applicableProducts" text,
    "applicableCategories" text,
    "promoCodes" text,
    "usageLimit" integer,
    "totalUsageLimit" integer,
    "currentUsage" integer NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP NOT NULL,
    "endDate" TIMESTAMP NOT NULL,
    "status" varchar NOT NULL DEFAULT 'active',
    "isDailyOffer" boolean NOT NULL DEFAULT false,
    "priority" integer NOT NULL DEFAULT 1,
    "metadata" json,
    "createdBy" varchar,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "CHK_discount_type" CHECK ("type" IN ('percentage','fixed_amount','free_shipping','buy_x_get_y')),
    CONSTRAINT "CHK_discount_status" CHECK ("status" IN ('active','inactive','expired','scheduled'))
);

-- ===============================
-- TABLAS DE IA Y RAG
-- ===============================

-- 19. Base de Conocimiento RAG
CREATE TABLE IF NOT EXISTS "rag_knowledge_base" (
    "id" varchar PRIMARY KEY NOT NULL,
    "chatbotId" varchar NOT NULL,
    "title" varchar(255) NOT NULL,
    "description" text,
    "documentType" varchar(20) NOT NULL DEFAULT 'txt',
    "sourceUrl" text,
    "filePath" text,
    "category" varchar(100),
    "tags" text,
    "status" varchar(20) NOT NULL DEFAULT 'pending',
    "isActive" boolean NOT NULL DEFAULT true,
    "priority" integer NOT NULL DEFAULT 0,
    "totalChunks" integer NOT NULL DEFAULT 0,
    "processedChunks" integer NOT NULL DEFAULT 0,
    "totalTokens" integer NOT NULL DEFAULT 0,
    "processingError" text,
    "lastProcessedAt" TIMESTAMP,
    "chunkingConfig" text NOT NULL,
    "embeddingConfig" text NOT NULL,
    "retrievalConfig" text NOT NULL,
    "metadata" text,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- 20. Chunks de Documentos RAG
CREATE TABLE IF NOT EXISTS "rag_document_chunks" (
    "id" varchar PRIMARY KEY NOT NULL,
    "knowledgeBaseId" varchar NOT NULL,
    "chunkIndex" integer NOT NULL,
    "content" text NOT NULL,
    "title" text,
    "tokenCount" integer NOT NULL,
    "startPosition" integer,
    "endPosition" integer,
    "embedding" text,
    "embeddingHash" text,
    "metadata" text,
    "isActive" boolean NOT NULL DEFAULT true,
    "relevanceScore" float NOT NULL DEFAULT 0,
    "retrievalCount" integer NOT NULL DEFAULT 0,
    "lastRetrievedAt" TIMESTAMP,
    "qualityScore" float,
    "qualityMetrics" text,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- ===============================
-- TABLAS DE NOTIFICACIONES
-- ===============================

-- 21. Notificaciones
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" SERIAL PRIMARY KEY,
    "phoneNumber" varchar NOT NULL,
    "message" text NOT NULL,
    "status" varchar(50) NOT NULL DEFAULT 'scheduled',
    "type" varchar(50) NOT NULL DEFAULT 'bulk',
    "scheduleDate" TIMESTAMP,
    "sentAt" TIMESTAMP,
    "cancelledAt" TIMESTAMP,
    "error" text,
    "campaignId" varchar,
    "metadata" text,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- 22. Plantillas de Notificación
CREATE TABLE IF NOT EXISTS "notification_templates" (
    "id" varchar PRIMARY KEY NOT NULL,
    "title" varchar NOT NULL,
    "content" text NOT NULL,
    "category" varchar NOT NULL DEFAULT 'promotion',
    "audience" varchar NOT NULL DEFAULT 'all',
    "isActive" boolean NOT NULL DEFAULT true,
    "cronEnabled" boolean NOT NULL DEFAULT false,
    "cronExpression" varchar,
    "nextExecution" TIMESTAMP,
    "lastExecution" TIMESTAMP,
    "sentCount" integer NOT NULL DEFAULT 0,
    "openRate" decimal(3,2) NOT NULL DEFAULT 0,
    "clickRate" decimal(3,2) NOT NULL DEFAULT 0,
    "variables" json,
    "chatbotId" varchar,
    "createdBy" varchar,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- 23. Configuración de Cron
CREATE TABLE IF NOT EXISTS "cron_config" (
    "id" varchar PRIMARY KEY NOT NULL,
    "enabled" boolean NOT NULL DEFAULT false,
    "maxNotificationsPerHour" integer NOT NULL DEFAULT 50,
    "retryAttempts" integer NOT NULL DEFAULT 3,
    "batchSize" integer NOT NULL DEFAULT 100,
    "timezone" varchar,
    "allowedTimeRanges" json,
    "blockedDays" text,
    "lastRunAt" TIMESTAMP,
    "totalNotificationsSent" integer NOT NULL DEFAULT 0,
    "totalFailures" integer NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- ===============================
-- TABLAS AUXILIARES
-- ===============================

-- 24. Plantillas de Mensaje
CREATE TABLE IF NOT EXISTS "message_templates" (
    "id" varchar PRIMARY KEY NOT NULL,
    "name" varchar NOT NULL,
    "type" varchar(50) NOT NULL DEFAULT 'custom',
    "content" text NOT NULL,
    "variables" text,
    "description" text,
    "status" varchar(20) NOT NULL DEFAULT 'active',
    "language" varchar NOT NULL DEFAULT 'es',
    "priority" integer NOT NULL DEFAULT 0,
    "conditions" text,
    "quickReplies" text,
    "chatbotId" varchar NOT NULL,
    "createdBy" varchar,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    "chatbot_id" varchar
);

-- 25. Historial de Búsqueda
CREATE TABLE IF NOT EXISTS "search_history" (
    "id" varchar PRIMARY KEY NOT NULL,
    "phoneNumber" varchar NOT NULL,
    "searchTerm" varchar NOT NULL,
    "originalSearchTerm" varchar NOT NULL,
    "resultsCount" integer NOT NULL DEFAULT 0,
    "hasResults" boolean NOT NULL DEFAULT false,
    "sessionContext" varchar,
    "chatbotId" varchar,
    "sessionId" varchar,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "session_id" varchar
);

-- 26. Facturas
CREATE TABLE IF NOT EXISTS "facturas" (
    "id" SERIAL PRIMARY KEY,
    "numero" varchar NOT NULL,
    "fecha" TIMESTAMP NOT NULL DEFAULT now(),
    "cliente_id" varchar,
    "total" decimal(10,2) NOT NULL,
    "subtotal" decimal(10,2) NOT NULL,
    "iva" decimal(10,2) NOT NULL DEFAULT 0,
    "descuento" decimal(10,2) NOT NULL DEFAULT 0,
    "status" varchar NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP DEFAULT now(),
    "updated_at" TIMESTAMP DEFAULT now(),
    CONSTRAINT "UQ_facturas_numero" UNIQUE ("numero")
);

-- ===============================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ===============================

-- Índices para persistent_sessions
CREATE INDEX IF NOT EXISTS "IDX_persistent_sessions_phoneNumber" ON "persistent_sessions" ("phoneNumber");

-- Índices para search_history
CREATE INDEX IF NOT EXISTS "IDX_search_history_phoneNumber_createdAt" ON "search_history" ("phoneNumber", "createdAt");
CREATE INDEX IF NOT EXISTS "IDX_search_history_phoneNumber_searchTerm" ON "search_history" ("phoneNumber", "searchTerm");

-- Índices para shopping_carts
CREATE INDEX IF NOT EXISTS "IDX_shopping_carts_phoneNumber_status" ON "shopping_carts" ("phoneNumber", "status");

-- Índices para rag_knowledge_base
CREATE INDEX IF NOT EXISTS "IDX_rag_knowledge_base_chatbotId_category" ON "rag_knowledge_base" ("chatbotId", "category");
CREATE INDEX IF NOT EXISTS "IDX_rag_knowledge_base_chatbotId_isActive" ON "rag_knowledge_base" ("chatbotId", "isActive");

-- Índices para rag_document_chunks
CREATE INDEX IF NOT EXISTS "IDX_rag_document_chunks_knowledgeBaseId_chunkIndex" ON "rag_document_chunks" ("knowledgeBaseId", "chunkIndex");
CREATE INDEX IF NOT EXISTS "IDX_rag_document_chunks_knowledgeBaseId_isActive" ON "rag_document_chunks" ("knowledgeBaseId", "isActive");

-- Índices para discounts
CREATE INDEX IF NOT EXISTS "IDX_discounts_status_startDate_endDate" ON "discounts" ("status", "startDate", "endDate");

-- ===============================
-- RELACIONES FOREIGN KEYS
-- ===============================

-- Foreign Keys para search_history
ALTER TABLE "search_history" ADD CONSTRAINT "FK_search_history_session_id" 
    FOREIGN KEY ("session_id") REFERENCES "persistent_sessions" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Foreign Keys para shopping_carts
ALTER TABLE "shopping_carts" ADD CONSTRAINT "FK_shopping_carts_session_id" 
    FOREIGN KEY ("session_id") REFERENCES "chat_sessions" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Foreign Keys para chat_messages
ALTER TABLE "chat_messages" ADD CONSTRAINT "FK_chat_messages_chat_session_id" 
    FOREIGN KEY ("chat_session_id") REFERENCES "chat_sessions" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    
ALTER TABLE "chat_messages" ADD CONSTRAINT "FK_chat_messages_session_id" 
    FOREIGN KEY ("session_id") REFERENCES "persistent_sessions" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Foreign Keys para admin_messages
ALTER TABLE "admin_messages" ADD CONSTRAINT "FK_admin_messages_conversationId" 
    FOREIGN KEY ("conversationId") REFERENCES "conversations" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Foreign Keys para conversations
ALTER TABLE "conversations" ADD CONSTRAINT "FK_conversations_chatbotId" 
    FOREIGN KEY ("chatbotId") REFERENCES "chatbots" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    
ALTER TABLE "conversations" ADD CONSTRAINT "FK_conversations_userId" 
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Foreign Keys para message_templates
ALTER TABLE "message_templates" ADD CONSTRAINT "FK_message_templates_chatbot_id" 
    FOREIGN KEY ("chatbot_id") REFERENCES "chatbots" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Foreign Keys para rag_document_chunks
ALTER TABLE "rag_document_chunks" ADD CONSTRAINT "FK_rag_document_chunks_knowledgeBaseId" 
    FOREIGN KEY ("knowledgeBaseId") REFERENCES "rag_knowledge_base" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Foreign Keys para rag_knowledge_base
ALTER TABLE "rag_knowledge_base" ADD CONSTRAINT "FK_rag_knowledge_base_chatbotId" 
    FOREIGN KEY ("chatbotId") REFERENCES "chatbot_instances" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Foreign Keys para chatbot_instances
ALTER TABLE "chatbot_instances" ADD CONSTRAINT "FK_chatbot_instances_organizationId" 
    FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Foreign Keys para notification_templates
ALTER TABLE "notification_templates" ADD CONSTRAINT "FK_notification_templates_chatbotId" 
    FOREIGN KEY ("chatbotId") REFERENCES "chatbot_instances" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Foreign Keys para user_subscriptions
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "FK_user_subscriptions_userId" 
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    
ALTER TABLE "user_subscriptions" ADD CONSTRAINT "FK_user_subscriptions_planId" 
    FOREIGN KEY ("planId") REFERENCES "user_plans" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Foreign Keys para user_usage
ALTER TABLE "user_usage" ADD CONSTRAINT "FK_user_usage_userId" 
    FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- ===============================
-- DATOS INICIALES
-- ===============================

-- Insertar organización por defecto
INSERT INTO "organizations" (id, name, slug, description, planType, isActive) 
VALUES ('default-org', 'Organización por Defecto', 'default', 'Organización principal del sistema', 'premium', true)
ON CONFLICT (slug) DO NOTHING;

-- Insertar planes por defecto (con fix aplicado)
INSERT INTO "user_plans" (name, description, price, currency, billing_cycle, max_chatbots, max_messages_per_month, whatsapp_integration, ai_responses, analytics, custom_branding) 
VALUES 
    ('Plan Básico', 'Plan básico con funcionalidades limitadas', 0, 'USD', 'monthly', 1, 1000, true, false, false, false),
    ('Plan Premium', 'Plan premium con todas las funcionalidades', 29.99, 'USD', 'monthly', 10, 10000, true, true, true, false),
    ('Plan Enterprise', 'Plan empresarial para grandes organizaciones', 99.99, 'USD', 'monthly', -1, -1, true, true, true, true)
ON CONFLICT (name) DO NOTHING;

-- Insertar usuario administrador por defecto
INSERT INTO "users" (id, name, email, password, role, status, isActive) 
VALUES (
    'admin-user', 
    'Administrador', 
    'admin@admin.com', 
    '$2b$10$8qK0t2G5x1QvJ4k9N2h1Q.8tqKJ7G5x1QvJ4k9N2h1Q.8tqKJ7G5x', 
    'admin',
    'active',
    true
)
ON CONFLICT (email) DO NOTHING;

-- Insertar chatbot de ejemplo
INSERT INTO "chatbot_instances" (id, name, slug, organizationId, aiConfig, whatsappConfig, chatbotConfig, notificationConfig, status) 
VALUES (
    'demo-chatbot', 
    'Chatbot Demo', 
    'demo-bot', 
    'default-org',
    '{"model": "gpt-3.5-turbo", "temperature": 0.7}',
    '{"enabled": true, "webhookUrl": ""}',
    '{"welcomeMessage": "¡Hola! Soy tu asistente virtual."}',
    '{"enabled": false}',
    'active'
)
ON CONFLICT (slug) DO NOTHING;

-- Insertar configuración de cron por defecto
INSERT INTO "cron_config" (id, enabled, maxNotificationsPerHour, retryAttempts, batchSize) 
VALUES ('default-cron', false, 50, 3, 100)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ===============================
-- VERIFICACIÓN FINAL
-- ===============================

-- Mostrar todas las tablas creadas
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename; 