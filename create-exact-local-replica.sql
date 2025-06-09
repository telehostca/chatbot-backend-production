-- 🎯 SCRIPT EXACTO - REPLICA PERFECTA DE BASE DE DATOS LOCAL
-- Basado en inspección directa de PostgreSQL local chatbot_backend

BEGIN;

-- 1. chat_messages
CREATE TABLE IF NOT EXISTS "chat_messages" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "content" text NOT NULL,
    "sender" varchar NOT NULL,
    "timestamp" TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "chat_session_id" varchar,
    "session_id" varchar
);

-- 2. chat_sessions
CREATE TABLE IF NOT EXISTS "chat_sessions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "phoneNumber" varchar NOT NULL,
    "status" varchar NOT NULL DEFAULT 'active',
    "startTime" TIMESTAMP NOT NULL DEFAULT now(),
    "endTime" TIMESTAMP,
    "lastMessageTime" TIMESTAMP,
    "messageCount" integer NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- 3. chatbot_instances (ESTRUCTURA CORREGIDA)
CREATE TABLE IF NOT EXISTS "chatbot_instances" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" varchar(100) NOT NULL,
    "slug" varchar(50) NOT NULL,
    "description" text,
    "avatar" varchar(255),
    "is_active" boolean DEFAULT true,
    "ai_config" text NOT NULL,
    "whatsapp_config" text NOT NULL,
    "external_db_config" text,
    "db_mapping_config" text,
    "chatbot_config" text NOT NULL,
    "notification_config" text NOT NULL,
    "status" varchar(20) DEFAULT 'active',
    "total_conversations" integer DEFAULT 0,
    "total_messages" integer DEFAULT 0,
    "total_revenue" decimal(10,2) DEFAULT 0,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "organization_id" uuid,
    CONSTRAINT "chatbot_instances_slug_key" UNIQUE ("slug")
);

-- 4. cron_config
CREATE TABLE IF NOT EXISTS "cron_config" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 5. discounts
CREATE TABLE IF NOT EXISTS "discounts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
    CONSTRAINT "discounts_type_check" CHECK ("type" IN ('percentage','fixed_amount','free_shipping','buy_x_get_y')),
    CONSTRAINT "discounts_status_check" CHECK ("status" IN ('active','inactive','expired','scheduled'))
);

-- 6. document_chunks
CREATE TABLE IF NOT EXISTS "document_chunks" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 7. knowledge_bases
CREATE TABLE IF NOT EXISTS "knowledge_bases" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 8. message_templates
CREATE TABLE IF NOT EXISTS "message_templates" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 9. notification_templates
CREATE TABLE IF NOT EXISTS "notification_templates" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 10. notifications
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

-- 11. organizations
CREATE TABLE IF NOT EXISTS "organizations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" varchar(100) NOT NULL,
    "slug" varchar(50) NOT NULL,
    "description" text,
    "logo" varchar(255),
    "contact_email" varchar(100),
    "contact_phone" varchar(20),
    "settings" text,
    "is_active" boolean DEFAULT true,
    "max_chatbots" integer DEFAULT 5,
    "plan_type" varchar(20) DEFAULT 'trial',
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "organizations_slug_key" UNIQUE ("slug"),
    CONSTRAINT "organizations_plan_type_check" CHECK ("plan_type" IN ('trial','basic','pro','enterprise'))
);

-- 12. payments
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

-- 13. persistent_sessions (ESTRUCTURA CORREGIDA SEGÚN LOCAL)
CREATE TABLE IF NOT EXISTS "persistent_sessions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "phone_number" varchar(20) NOT NULL,
    "session_data" text,
    "last_activity" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "chatbot_id" uuid,
    CONSTRAINT "persistent_sessions_phone_number_chatbot_id_key" UNIQUE ("phone_number", "chatbot_id")
);

-- 14. rag_document_chunks
CREATE TABLE IF NOT EXISTS "rag_document_chunks" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 15. rag_knowledge_base
CREATE TABLE IF NOT EXISTS "rag_knowledge_base" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 16. search_history
CREATE TABLE IF NOT EXISTS "search_history" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 17. shopping_carts
CREATE TABLE IF NOT EXISTS "shopping_carts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 18. user_plans (ESTRUCTURA EXACTA DE LOCAL)
CREATE TABLE IF NOT EXISTS "user_plans" (
    "id" SERIAL PRIMARY KEY,
    "name" varchar(100) NOT NULL,
    "description" text NOT NULL,
    "price" decimal(10,2) NOT NULL,
    "currency" varchar(3) DEFAULT 'USD',
    "billing_cycle" varchar(20) DEFAULT 'monthly',
    "features" jsonb,
    "max_chatbots" integer DEFAULT 0,
    "max_messages_per_month" integer DEFAULT 1000,
    "whatsapp_integration" boolean DEFAULT true,
    "ai_responses" boolean DEFAULT false,
    "analytics" boolean DEFAULT false,
    "custom_branding" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" TIMESTAMP DEFAULT now(),
    "updated_at" TIMESTAMP DEFAULT now(),
    CONSTRAINT "user_plans_name_key" UNIQUE ("name"),
    CONSTRAINT "user_plans_billing_cycle_check" CHECK ("billing_cycle" IN ('monthly','yearly','lifetime'))
);

-- 19. user_subscriptions
CREATE TABLE IF NOT EXISTS "user_subscriptions" (
    "id" SERIAL PRIMARY KEY,
    "userId" varchar NOT NULL,
    "planId" integer NOT NULL,
    "status" varchar NOT NULL DEFAULT 'active',
    "startDate" TIMESTAMP NOT NULL DEFAULT now(),
    "endDate" TIMESTAMP,
    "isActive" boolean NOT NULL DEFAULT true,
    "plan_id" integer,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now()
);

-- 20. user_usage
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

-- 21. users
CREATE TABLE IF NOT EXISTS "users" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
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
    "plan_id" integer,
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
    CONSTRAINT "users_email_key" UNIQUE ("email")
);

-- ===============================
-- ÍNDICES OPTIMIZADOS
-- ===============================

-- Índices para persistent_sessions
CREATE INDEX IF NOT EXISTS "idx_persistent_sessions_phone_chatbot" ON "persistent_sessions" ("phone_number", "chatbot_id");

-- Índices para search_history
CREATE INDEX IF NOT EXISTS "idx_search_history_phoneNumber_createdAt" ON "search_history" ("phoneNumber", "createdAt");

-- Índices para shopping_carts
CREATE INDEX IF NOT EXISTS "idx_shopping_carts_phoneNumber_status" ON "shopping_carts" ("phoneNumber", "status");

-- Índices para knowledge_bases
CREATE INDEX IF NOT EXISTS "idx_knowledge_bases_chatbotId_isActive" ON "knowledge_bases" ("chatbotId", "isActive");

-- Índices para rag_knowledge_base
CREATE INDEX IF NOT EXISTS "idx_rag_knowledge_base_chatbotId_isActive" ON "rag_knowledge_base" ("chatbotId", "isActive");

-- ===============================
-- FUNCIÓN PARA UPDATED_AT
-- ===============================

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a user_plans
DO $$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_plans_updated_at') THEN
        CREATE TRIGGER update_user_plans_updated_at
            BEFORE UPDATE ON user_plans
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ===============================
-- DATOS INICIALES (EXACTOS A LOCAL)
-- ===============================

-- Organización por defecto
INSERT INTO "organizations" (name, slug, description, plan_type, is_active) 
VALUES ('Organización por Defecto', 'default', 'Organización principal del sistema', 'enterprise', true)
ON CONFLICT (slug) DO NOTHING;

-- Planes exactos de local
INSERT INTO "user_plans" (name, description, price, currency, billing_cycle, max_chatbots, max_messages_per_month, whatsapp_integration, ai_responses, analytics, custom_branding) 
VALUES 
    ('Free', 'Plan gratuito con funcionalidades básicas', 0.00, 'USD', 'monthly', 1, 1000, true, false, false, false),
    ('Starter', 'Plan básico para pequeños negocios', 9.99, 'USD', 'monthly', 3, 5000, true, false, true, false),
    ('Professional', 'Plan profesional con IA y analíticas', 29.99, 'USD', 'monthly', 10, 20000, true, true, true, false),
    ('Enterprise', 'Plan empresarial con funcionalidades completas', 99.99, 'USD', 'monthly', -1, -1, true, true, true, true),
    ('Plan Gratuito', 'Plan básico gratuito', 0.00, 'USD', 'monthly', 1, 1000, true, false, false, false)
ON CONFLICT (name) DO NOTHING;

-- Usuario administrador
INSERT INTO "users" (name, email, password, role, status, isActive) 
VALUES (
    'Administrador', 
    'admin@admin.com', 
    '$2b$10$8qK0t2G5x1QvJ4k9N2h1Q.8tqKJ7G5x1QvJ4k9N2h1Q.8tqKJ7G5x', 
    'admin',
    'active',
    true
)
ON CONFLICT (email) DO NOTHING;

COMMIT;

-- ===============================
-- VERIFICACIÓN FINAL
-- ===============================

-- Contar todas las tablas creadas (debe ser 21)
SELECT COUNT(*) as total_tables 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'chat_messages', 'chat_sessions', 'chatbot_instances', 'cron_config', 'discounts',
    'document_chunks', 'knowledge_bases', 'message_templates', 'notification_templates',
    'notifications', 'organizations', 'payments', 'persistent_sessions',
    'rag_document_chunks', 'rag_knowledge_base', 'search_history', 'shopping_carts',
    'user_plans', 'user_subscriptions', 'user_usage', 'users'
  );

-- Verificar user_plans tiene los 5 planes exactos
SELECT COUNT(*) as total_plans FROM "user_plans";
SELECT name, price, description FROM "user_plans" ORDER BY id; 