-- =====================================================
-- ACTUALIZAR ESTRUCTURA DE PERSISTENT_SESSIONS
-- =====================================================

-- Agregar columnas faltantes
ALTER TABLE persistent_sessions 
ADD COLUMN IF NOT EXISTS client_id VARCHAR,
ADD COLUMN IF NOT EXISTS client_name VARCHAR,
ADD COLUMN IF NOT EXISTS identification_number VARCHAR,
ADD COLUMN IF NOT EXISTS client_pushname VARCHAR,
ADD COLUMN IF NOT EXISTS is_authenticated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_new_client BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS context VARCHAR DEFAULT 'initial',
ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_user_message TEXT,
ADD COLUMN IF NOT EXISTS last_bot_response TEXT,
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS search_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_chatbot_id VARCHAR,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Actualizar columnas existentes si es necesario
ALTER TABLE persistent_sessions 
ALTER COLUMN phone_number TYPE VARCHAR USING phone_number::VARCHAR;

-- Renombrar chatbot_id a active_chatbot_id si existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'persistent_sessions' 
               AND column_name = 'chatbot_id' 
               AND column_name != 'active_chatbot_id') THEN
        -- Copiar datos de chatbot_id a active_chatbot_id
        UPDATE persistent_sessions 
        SET active_chatbot_id = chatbot_id::VARCHAR 
        WHERE chatbot_id IS NOT NULL;
        
        -- Eliminar la columna antigua
        ALTER TABLE persistent_sessions DROP COLUMN chatbot_id;
    END IF;
END $$;

-- Crear índices adicionales
CREATE INDEX IF NOT EXISTS idx_persistent_sessions_status ON persistent_sessions(status);
CREATE INDEX IF NOT EXISTS idx_persistent_sessions_active_chatbot ON persistent_sessions(active_chatbot_id);
CREATE INDEX IF NOT EXISTS idx_persistent_sessions_last_activity ON persistent_sessions(last_activity);
CREATE INDEX IF NOT EXISTS idx_persistent_sessions_is_authenticated ON persistent_sessions(is_authenticated);

-- Insertar datos de prueba si la tabla está vacía
INSERT INTO persistent_sessions (
    phone_number, 
    client_name, 
    status, 
    is_authenticated, 
    is_new_client,
    context,
    last_activity, 
    message_count, 
    search_count,
    active_chatbot_id
) 
SELECT 
    '584241234567', 
    'Cliente de Prueba 1', 
    'active', 
    true,
    false,
    'authenticated',
    NOW(), 
    15, 
    3,
    (SELECT id FROM chatbot_instances LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM persistent_sessions WHERE phone_number = '584241234567')

UNION ALL

SELECT 
    '584161234567', 
    'Cliente de Prueba 2', 
    'active', 
    false,
    true,
    'initial',
    NOW() - INTERVAL '2 hours', 
    5, 
    1,
    (SELECT id FROM chatbot_instances LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM persistent_sessions WHERE phone_number = '584161234567')

UNION ALL

SELECT 
    '573001234567', 
    'Cliente VIP', 
    'active', 
    true,
    false,
    'vip_client',
    NOW() - INTERVAL '1 day', 
    25, 
    8,
    (SELECT id FROM chatbot_instances LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM persistent_sessions WHERE phone_number = '573001234567')

UNION ALL

SELECT 
    '584127654321', 
    'Usuario Nuevo', 
    'active', 
    false,
    true,
    'new_user',
    NOW() - INTERVAL '30 minutes', 
    2, 
    0,
    (SELECT id FROM chatbot_instances LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM persistent_sessions WHERE phone_number = '584127654321')

UNION ALL

SELECT 
    '584159876543', 
    'Cliente Inactivo', 
    'inactive', 
    true,
    false,
    'inactive',
    NOW() - INTERVAL '30 days', 
    45, 
    12,
    (SELECT id FROM chatbot_instances LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM persistent_sessions WHERE phone_number = '584159876543');

-- Verificar la estructura actualizada
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'persistent_sessions' 
ORDER BY ordinal_position;

-- Verificar datos insertados
SELECT 
    phone_number,
    client_name,
    status,
    is_authenticated,
    is_new_client,
    message_count,
    last_activity
FROM persistent_sessions 
ORDER BY last_activity DESC; 