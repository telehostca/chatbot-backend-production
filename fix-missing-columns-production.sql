-- 🔧 FIX COLUMNAS FALTANTES EN PRODUCCIÓN
-- Script para agregar columnas que faltan en cron_config y otras tablas

BEGIN;

-- Función para actualizar updated_at (si no existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ===============================
-- FIX CRON_CONFIG - AGREGAR COLUMNAS FALTANTES
-- ===============================

-- Agregar columnas que faltan en cron_config
ALTER TABLE "cron_config" 
ADD COLUMN IF NOT EXISTS "max_notifications_per_hour" integer DEFAULT 50;

ALTER TABLE "cron_config" 
ADD COLUMN IF NOT EXISTS "retry_attempts" integer DEFAULT 3;

ALTER TABLE "cron_config" 
ADD COLUMN IF NOT EXISTS "batch_size" integer DEFAULT 100;

ALTER TABLE "cron_config" 
ADD COLUMN IF NOT EXISTS "timezone" varchar(50);

ALTER TABLE "cron_config" 
ADD COLUMN IF NOT EXISTS "allowed_time_ranges" json;

ALTER TABLE "cron_config" 
ADD COLUMN IF NOT EXISTS "blocked_days" text;

ALTER TABLE "cron_config" 
ADD COLUMN IF NOT EXISTS "last_run_at" TIMESTAMP;

ALTER TABLE "cron_config" 
ADD COLUMN IF NOT EXISTS "total_notifications_sent" integer DEFAULT 0;

ALTER TABLE "cron_config" 
ADD COLUMN IF NOT EXISTS "total_failures" integer DEFAULT 0;

-- Trigger para cron_config (si no existe)
DO $$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'update_cron_config_updated_at') THEN
        CREATE TRIGGER update_cron_config_updated_at
            BEFORE UPDATE ON cron_config
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ===============================
-- FIX MESSAGE_TEMPLATES - CORREGIR ESTRUCTURA
-- ===============================

-- Corregir name a varchar(100) si es diferente
ALTER TABLE "message_templates" 
ALTER COLUMN "name" TYPE varchar(100);

-- Agregar template_type si no existe
ALTER TABLE "message_templates" 
ADD COLUMN IF NOT EXISTS "template_type" varchar(50);

-- Agregar variables si no existe
ALTER TABLE "message_templates" 
ADD COLUMN IF NOT EXISTS "variables" text;

-- Cambiar tipo de chatbot_id a uuid si es varchar
ALTER TABLE "message_templates" 
ALTER COLUMN "chatbot_id" TYPE uuid USING "chatbot_id"::uuid;

-- Trigger para message_templates (si no existe)
DO $$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'update_message_templates_updated_at') THEN
        CREATE TRIGGER update_message_templates_updated_at
            BEFORE UPDATE ON message_templates
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Foreign key para message_templates (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'message_templates_chatbot_id_fkey'
    ) THEN
        ALTER TABLE "message_templates" 
        ADD CONSTRAINT "message_templates_chatbot_id_fkey" 
        FOREIGN KEY ("chatbot_id") REFERENCES "chatbot_instances" ("id") 
        ON DELETE CASCADE;
    END IF;
END $$;

-- ===============================
-- INSERTAR CONFIGURACIÓN DE CRON POR DEFECTO
-- ===============================

-- Insertar configuración de cron por defecto si no existe
INSERT INTO "cron_config" (
    enabled, 
    max_notifications_per_hour, 
    retry_attempts, 
    batch_size, 
    timezone, 
    total_notifications_sent, 
    total_failures
) 
SELECT false, 50, 3, 100, 'UTC', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM "cron_config" LIMIT 1);

-- ===============================
-- ACTUALIZAR REGISTROS EXISTENTES CON VALORES POR DEFECTO
-- ===============================

-- Actualizar registros existentes en cron_config que tengan NULLs
UPDATE "cron_config" 
SET 
    max_notifications_per_hour = COALESCE(max_notifications_per_hour, 50),
    retry_attempts = COALESCE(retry_attempts, 3),
    batch_size = COALESCE(batch_size, 100),
    timezone = COALESCE(timezone, 'UTC'),
    total_notifications_sent = COALESCE(total_notifications_sent, 0),
    total_failures = COALESCE(total_failures, 0)
WHERE 
    max_notifications_per_hour IS NULL 
    OR retry_attempts IS NULL 
    OR batch_size IS NULL 
    OR total_notifications_sent IS NULL 
    OR total_failures IS NULL;

COMMIT;

-- ===============================
-- VERIFICACIÓN
-- ===============================

-- Verificar que cron_config tiene todas las columnas
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'cron_config' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar que message_templates tiene todas las columnas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'message_templates' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verificar si hay datos en cron_config
SELECT COUNT(*) as cron_records FROM "cron_config"; 