-- 🚀 SCRIPT ESENCIAL - TABLAS MÍNIMAS PARA FUNCIONAMIENTO
-- Crea solo las tablas más importantes para que el sistema funcione

BEGIN;

-- 1. Organizaciones (ESENCIAL)
CREATE TABLE IF NOT EXISTS "organizations" (
    "id" varchar PRIMARY KEY NOT NULL,
    "name" varchar(100) NOT NULL,
    "slug" varchar(50) NOT NULL,
    "description" text,
    "isActive" boolean NOT NULL DEFAULT true,
    "planType" varchar(20) NOT NULL DEFAULT 'trial',
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_organizations_slug" UNIQUE ("slug")
);

-- 2. Planes de Usuario (CON FIX APLICADO)
CREATE TABLE IF NOT EXISTS "user_plans" (
    "id" SERIAL PRIMARY KEY,
    "name" varchar NOT NULL DEFAULT 'Plan Básico',
    "description" varchar NOT NULL DEFAULT 'Plan estándar con funciones básicas',
    "price" decimal(10,2) NOT NULL DEFAULT 0,
    "currency" varchar NOT NULL DEFAULT 'USD',
    "billing_cycle" varchar NOT NULL DEFAULT 'monthly',
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

-- 3. Usuarios (ESENCIAL)
CREATE TABLE IF NOT EXISTS "users" (
    "id" varchar PRIMARY KEY NOT NULL,
    "name" varchar NOT NULL,
    "email" varchar NOT NULL,
    "password" varchar NOT NULL,
    "phone" varchar,
    "isActive" boolean NOT NULL DEFAULT true,
    "role" varchar NOT NULL DEFAULT 'user',
    "status" varchar NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_users_email" UNIQUE ("email")
);

-- 4. Instancias de Chatbot (ESENCIAL)
CREATE TABLE IF NOT EXISTS "chatbot_instances" (
    "id" varchar PRIMARY KEY NOT NULL,
    "name" varchar(100) NOT NULL,
    "slug" varchar(50) NOT NULL,
    "description" text,
    "isActive" boolean NOT NULL DEFAULT true,
    "aiConfig" text NOT NULL DEFAULT '{}',
    "whatsappConfig" text NOT NULL DEFAULT '{}',
    "chatbotConfig" text NOT NULL DEFAULT '{}',
    "notificationConfig" text NOT NULL DEFAULT '{}',
    "status" varchar(20) NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    "organizationId" varchar NOT NULL,
    CONSTRAINT "UQ_chatbot_instances_slug" UNIQUE ("slug")
);

-- 5. Sesiones Persistentes (ESENCIAL PARA CHAT)
CREATE TABLE IF NOT EXISTS "persistent_sessions" (
    "id" varchar PRIMARY KEY NOT NULL,
    "phoneNumber" varchar NOT NULL,
    "clientId" varchar,
    "clientName" varchar,
    "isAuthenticated" boolean NOT NULL DEFAULT false,
    "context" varchar NOT NULL DEFAULT 'initial',
    "status" varchar NOT NULL DEFAULT 'active',
    "lastActivity" TIMESTAMP,
    "messageCount" integer NOT NULL DEFAULT 0,
    "activeChatbotId" varchar,
    "metadata" json,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_persistent_sessions_phoneNumber" UNIQUE ("phoneNumber")
);

-- 6. Configuración de Cron (ESENCIAL PARA SISTEMA)
CREATE TABLE IF NOT EXISTS "cron_config" (
    "id" varchar PRIMARY KEY NOT NULL,
    "enabled" boolean NOT NULL DEFAULT false,
    "maxNotificationsPerHour" integer NOT NULL DEFAULT 50,
    "retryAttempts" integer NOT NULL DEFAULT 3,
    "batchSize" integer NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- 7. Notificaciones (PARA SISTEMA DE MENSAJES)
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" SERIAL PRIMARY KEY,
    "phoneNumber" varchar NOT NULL,
    "message" text NOT NULL,
    "status" varchar(50) NOT NULL DEFAULT 'scheduled',
    "type" varchar(50) NOT NULL DEFAULT 'bulk',
    "scheduleDate" TIMESTAMP,
    "sentAt" TIMESTAMP,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- 8. Plantillas de Notificación (PARA SISTEMA DE MENSAJES)
CREATE TABLE IF NOT EXISTS "notification_templates" (
    "id" varchar PRIMARY KEY NOT NULL,
    "title" varchar NOT NULL,
    "content" text NOT NULL,
    "category" varchar NOT NULL DEFAULT 'promotion',
    "isActive" boolean NOT NULL DEFAULT true,
    "chatbotId" varchar,
    "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
);

-- ===============================
-- ÍNDICES ESENCIALES
-- ===============================

CREATE INDEX IF NOT EXISTS "IDX_persistent_sessions_phoneNumber" ON "persistent_sessions" ("phoneNumber");
CREATE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "IDX_chatbot_instances_organizationId" ON "chatbot_instances" ("organizationId");

-- ===============================
-- FOREIGN KEYS ESENCIALES
-- ===============================

ALTER TABLE "chatbot_instances" 
ADD CONSTRAINT "FK_chatbot_instances_organizationId" 
FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") 
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "notification_templates" 
ADD CONSTRAINT "FK_notification_templates_chatbotId" 
FOREIGN KEY ("chatbotId") REFERENCES "chatbot_instances" ("id") 
ON DELETE SET NULL ON UPDATE CASCADE;

-- ===============================
-- DATOS INICIALES ESENCIALES
-- ===============================

-- Organización por defecto
INSERT INTO "organizations" (id, name, slug, description, planType, isActive) 
VALUES ('default-org', 'Organización por Defecto', 'default', 'Organización principal del sistema', 'premium', true)
ON CONFLICT (slug) DO NOTHING;

-- Planes por defecto (CON FIX DE DESCRIPTION APLICADO)
INSERT INTO "user_plans" (name, description, price, currency, billing_cycle, max_chatbots, max_messages_per_month, whatsapp_integration, ai_responses, analytics, custom_branding) 
VALUES 
    ('Plan Básico', 'Plan básico con funcionalidades limitadas', 0, 'USD', 'monthly', 1, 1000, true, false, false, false),
    ('Plan Premium', 'Plan premium con todas las funcionalidades', 29.99, 'USD', 'monthly', 10, 10000, true, true, true, false),
    ('Plan Enterprise', 'Plan empresarial para grandes organizaciones', 99.99, 'USD', 'monthly', -1, -1, true, true, true, true)
ON CONFLICT (name) DO NOTHING;

-- Usuario administrador
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

-- Chatbot de ejemplo
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

-- Configuración de cron
INSERT INTO "cron_config" (id, enabled, maxNotificationsPerHour, retryAttempts, batchSize) 
VALUES ('default-cron', false, 50, 3, 100)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ===============================
-- VERIFICACIÓN
-- ===============================

-- Verificar que las tablas esenciales se crearon
SELECT 
    tablename,
    schemaname
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'organizations', 
    'user_plans', 
    'users', 
    'chatbot_instances', 
    'persistent_sessions', 
    'cron_config', 
    'notifications', 
    'notification_templates'
  )
ORDER BY tablename;

-- Verificar que user_plans tiene datos y sin errores de NULL
SELECT 
    id, 
    name, 
    description, 
    price, 
    is_active,
    created_at
FROM "user_plans" 
ORDER BY id; 