-- =====================================================
-- FIX PERSISTENT SESSIONS TABLE - FINAL MIGRATION
-- =====================================================
-- Este script agrega todas las columnas faltantes a la tabla persistent_sessions
-- para que coincida con la entidad PersistentSession de NestJS

-- Agregar todas las columnas faltantes
ALTER TABLE "public"."persistent_sessions" 
ADD COLUMN IF NOT EXISTS "client_id" VARCHAR(100),
ADD COLUMN IF NOT EXISTS "client_name" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "identification_number" VARCHAR(50),
ADD COLUMN IF NOT EXISTS "client_pushname" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "is_authenticated" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "is_new_client" BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS "context" TEXT,
ADD COLUMN IF NOT EXISTS "status" VARCHAR(50) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS "last_user_message" TEXT,
ADD COLUMN IF NOT EXISTS "last_bot_response" TEXT,
ADD COLUMN IF NOT EXISTS "message_count" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "search_count" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "active_chatbot_id" UUID,
ADD COLUMN IF NOT EXISTS "metadata" JSONB;

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS "idx_persistent_sessions_client_id" ON "public"."persistent_sessions" ("client_id");
CREATE INDEX IF NOT EXISTS "idx_persistent_sessions_phone_chatbot" ON "public"."persistent_sessions" ("phone_number", "chatbot_id");
CREATE INDEX IF NOT EXISTS "idx_persistent_sessions_last_activity" ON "public"."persistent_sessions" ("last_activity");
CREATE INDEX IF NOT EXISTS "idx_persistent_sessions_active_chatbot" ON "public"."persistent_sessions" ("active_chatbot_id");

-- Agregar foreign key constraint para active_chatbot_id
ALTER TABLE "public"."persistent_sessions" 
ADD CONSTRAINT "fk_persistent_sessions_active_chatbot" 
FOREIGN KEY ("active_chatbot_id") REFERENCES "public"."chatbot_instances" ("id") 
ON DELETE SET NULL ON UPDATE NO ACTION;

-- Verificar la estructura final
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'persistent_sessions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Mostrar mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ MIGRACIÓN COMPLETADA: Todas las columnas faltantes han sido agregadas a persistent_sessions';
    RAISE NOTICE '📊 Estructura actualizada para coincidir con PersistentSession entity';
    RAISE NOTICE '🔗 Foreign keys y índices creados correctamente';
END $$; 