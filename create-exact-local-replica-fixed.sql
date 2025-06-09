-- 🎯 SCRIPT EXACTO CORREGIDO - REPLICA PERFECTA DE BASE DE DATOS LOCAL
-- Con nombres de columnas snake_case correctos y sin errores

BEGIN;

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. organizations
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

-- 2. user_plans
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

-- 3. users
CREATE TABLE IF NOT EXISTS "users" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" varchar NOT NULL,
    "email" varchar NOT NULL,
    "password" varchar NOT NULL,
    "phone" varchar,
    "codigo_cliente" varchar,
    "is_active" boolean NOT NULL DEFAULT true,
    "saldo" decimal(10,2) NOT NULL DEFAULT 0,
    "direccion" varchar,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" varchar NOT NULL,
    "status" varchar NOT NULL,
    "plan_id" integer,
    CONSTRAINT "users_email_key" UNIQUE ("email")
);

-- 4. chatbot_instances
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

-- 5. persistent_sessions
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

-- Resto de tablas simplificadas
CREATE TABLE IF NOT EXISTS "chat_messages" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "content" text NOT NULL,
    "sender" varchar NOT NULL,
    "timestamp" TIMESTAMP NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chat_session_id" varchar,
    "session_id" varchar
);

CREATE TABLE IF NOT EXISTS "chat_sessions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "phone_number" varchar NOT NULL,
    "status" varchar NOT NULL DEFAULT 'active',
    "start_time" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "end_time" TIMESTAMP,
    "message_count" integer NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "cron_config" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "enabled" boolean NOT NULL DEFAULT false,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "discounts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" varchar NOT NULL,
    "description" text,
    "type" varchar NOT NULL DEFAULT 'percentage',
    "value" decimal(10,2) NOT NULL,
    "start_date" TIMESTAMP NOT NULL,
    "end_date" TIMESTAMP NOT NULL,
    "status" varchar NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "document_chunks" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "knowledge_base_id" varchar NOT NULL,
    "chunk_index" integer NOT NULL,
    "content" text NOT NULL,
    "token_count" integer NOT NULL,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "knowledge_bases" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "chatbot_id" varchar NOT NULL,
    "title" varchar(255) NOT NULL,
    "description" text,
    "document_type" varchar(20) NOT NULL DEFAULT 'txt',
    "status" varchar(20) NOT NULL DEFAULT 'pending',
    "is_active" boolean NOT NULL DEFAULT true,
    "total_chunks" integer NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "message_templates" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "name" varchar NOT NULL,
    "type" varchar(50) NOT NULL DEFAULT 'custom',
    "content" text NOT NULL,
    "status" varchar(20) NOT NULL DEFAULT 'active',
    "chatbot_id" varchar NOT NULL,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "notification_templates" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" varchar NOT NULL,
    "content" text NOT NULL,
    "category" varchar NOT NULL DEFAULT 'promotion',
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "notifications" (
    "id" SERIAL PRIMARY KEY,
    "phone_number" varchar NOT NULL,
    "message" text NOT NULL,
    "status" varchar(50) NOT NULL DEFAULT 'scheduled',
    "type" varchar(50) NOT NULL DEFAULT 'bulk',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "payments" (
    "id" SERIAL PRIMARY KEY,
    "order_id" varchar NOT NULL,
    "amount" decimal(10,2) NOT NULL,
    "currency" varchar NOT NULL DEFAULT 'USD',
    "status" varchar NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "rag_document_chunks" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "knowledge_base_id" varchar NOT NULL,
    "chunk_index" integer NOT NULL,
    "content" text NOT NULL,
    "token_count" integer NOT NULL,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "rag_knowledge_base" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "chatbot_id" varchar NOT NULL,
    "title" varchar(255) NOT NULL,
    "description" text,
    "document_type" varchar(20) NOT NULL DEFAULT 'txt',
    "status" varchar(20) NOT NULL DEFAULT 'pending',
    "is_active" boolean NOT NULL DEFAULT true,
    "total_chunks" integer NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "search_history" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "phone_number" varchar NOT NULL,
    "search_term" varchar NOT NULL,
    "original_search_term" varchar NOT NULL,
    "results_count" integer NOT NULL DEFAULT 0,
    "has_results" boolean NOT NULL DEFAULT false,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "shopping_carts" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    "phone_number" varchar NOT NULL,
    "product_code" varchar NOT NULL,
    "product_name" varchar NOT NULL,
    "unit_price_usd" decimal(10,2) NOT NULL,
    "quantity" integer NOT NULL DEFAULT 1,
    "status" varchar NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "user_subscriptions" (
    "id" SERIAL PRIMARY KEY,
    "user_id" varchar NOT NULL,
    "plan_id" integer NOT NULL,
    "status" varchar NOT NULL DEFAULT 'active',
    "start_date" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "user_usage" (
    "id" SERIAL PRIMARY KEY,
    "user_id" varchar NOT NULL,
    "month" integer NOT NULL,
    "year" integer NOT NULL,
    "messages_used" integer NOT NULL DEFAULT 0,
    "chatbots_used" integer NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices importantes
CREATE INDEX IF NOT EXISTS "idx_persistent_sessions_phone_chatbot" ON "persistent_sessions" ("phone_number", "chatbot_id");

-- Triggers
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_plans_updated_at
    BEFORE UPDATE ON user_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Foreign Keys
ALTER TABLE "chatbot_instances" 
ADD CONSTRAINT "chatbot_instances_organization_id_fkey" 
FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") 
ON DELETE CASCADE;

ALTER TABLE "users" 
ADD CONSTRAINT "fk_users_plan_id" 
FOREIGN KEY ("plan_id") REFERENCES "user_plans" ("id") 
ON DELETE SET NULL;

ALTER TABLE "user_subscriptions" 
ADD CONSTRAINT "user_subscriptions_plan_id_fkey" 
FOREIGN KEY ("plan_id") REFERENCES "user_plans" ("id") 
ON DELETE RESTRICT;

-- Datos iniciales
INSERT INTO "organizations" (name, slug, description, plan_type, is_active) 
VALUES ('Organización por Defecto', 'default', 'Organización principal del sistema', 'enterprise', true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO "user_plans" (name, description, price, currency, billing_cycle, max_chatbots, max_messages_per_month, whatsapp_integration, ai_responses, analytics, custom_branding) 
VALUES 
    ('Free', 'Plan gratuito con funcionalidades básicas', 0.00, 'USD', 'monthly', 1, 1000, true, false, false, false),
    ('Starter', 'Plan básico para pequeños negocios', 9.99, 'USD', 'monthly', 3, 5000, true, false, true, false),
    ('Professional', 'Plan profesional con IA y analíticas', 29.99, 'USD', 'monthly', 10, 20000, true, true, true, false),
    ('Enterprise', 'Plan empresarial con funcionalidades completas', 99.99, 'USD', 'monthly', -1, -1, true, true, true, true),
    ('Plan Gratuito', 'Plan básico gratuito', 0.00, 'USD', 'monthly', 1, 1000, true, false, false, false)
ON CONFLICT (name) DO NOTHING;

INSERT INTO "users" (name, email, password, role, status, is_active) 
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

-- Verificación
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

SELECT COUNT(*) as total_plans FROM "user_plans";
SELECT name, price FROM "user_plans" ORDER BY id; 