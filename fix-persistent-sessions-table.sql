-- Script para corregir la estructura de la tabla persistent_sessions
-- Asegurar que todas las columnas tengan los nombres correctos en snake_case

-- Verificar si la tabla existe
DO $$
BEGIN
    -- Si la tabla no existe, crearla
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'persistent_sessions') THEN
        CREATE TABLE persistent_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            phone_number VARCHAR UNIQUE NOT NULL,
            client_id VARCHAR,
            client_name VARCHAR,
            identification_number VARCHAR,
            client_pushname VARCHAR,
            is_authenticated BOOLEAN DEFAULT false,
            is_new_client BOOLEAN DEFAULT true,
            context VARCHAR DEFAULT 'initial',
            status VARCHAR DEFAULT 'active',
            last_user_message TEXT,
            last_bot_response TEXT,
            last_activity TIMESTAMP,
            message_count INTEGER DEFAULT 0,
            search_count INTEGER DEFAULT 0,
            active_chatbot_id VARCHAR,
            metadata JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Crear índices
        CREATE UNIQUE INDEX IF NOT EXISTS idx_persistent_sessions_phone_number ON persistent_sessions(phone_number);
        CREATE INDEX IF NOT EXISTS idx_persistent_sessions_active_chatbot ON persistent_sessions(active_chatbot_id);
        CREATE INDEX IF NOT EXISTS idx_persistent_sessions_status ON persistent_sessions(status);
        CREATE INDEX IF NOT EXISTS idx_persistent_sessions_last_activity ON persistent_sessions(last_activity);
        
        RAISE NOTICE 'Tabla persistent_sessions creada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla persistent_sessions ya existe, verificando columnas...';
        
        -- Agregar columnas faltantes si no existen
        BEGIN
            ALTER TABLE persistent_sessions ADD COLUMN IF NOT EXISTS phone_number VARCHAR;
            ALTER TABLE persistent_sessions ADD COLUMN IF NOT EXISTS client_id VARCHAR;
            ALTER TABLE persistent_sessions ADD COLUMN IF NOT EXISTS client_name VARCHAR;
            ALTER TABLE persistent_sessions ADD COLUMN IF NOT EXISTS identification_number VARCHAR;
            ALTER TABLE persistent_sessions ADD COLUMN IF NOT EXISTS client_pushname VARCHAR;
            ALTER TABLE persistent_sessions ADD COLUMN IF NOT EXISTS is_authenticated BOOLEAN DEFAULT false;
            ALTER TABLE persistent_sessions ADD COLUMN IF NOT EXISTS is_new_client BOOLEAN DEFAULT true;
            ALTER TABLE persistent_sessions ADD COLUMN IF NOT EXISTS context VARCHAR DEFAULT 'initial';
            ALTER TABLE persistent_sessions ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'active';
            ALTER TABLE persistent_sessions ADD COLUMN IF NOT EXISTS last_user_message TEXT;
            ALTER TABLE persistent_sessions ADD COLUMN IF NOT EXISTS last_bot_response TEXT;
            ALTER TABLE persistent_sessions ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP;
            ALTER TABLE persistent_sessions ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;
            ALTER TABLE persistent_sessions ADD COLUMN IF NOT EXISTS search_count INTEGER DEFAULT 0;
            ALTER TABLE persistent_sessions ADD COLUMN IF NOT EXISTS active_chatbot_id VARCHAR;
            ALTER TABLE persistent_sessions ADD COLUMN IF NOT EXISTS metadata JSONB;
            ALTER TABLE persistent_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
            ALTER TABLE persistent_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
            
            RAISE NOTICE 'Columnas verificadas/agregadas exitosamente';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error agregando columnas: %', SQLERRM;
        END;
        
        -- Crear índices si no existen
        CREATE UNIQUE INDEX IF NOT EXISTS idx_persistent_sessions_phone_number ON persistent_sessions(phone_number);
        CREATE INDEX IF NOT EXISTS idx_persistent_sessions_active_chatbot ON persistent_sessions(active_chatbot_id);
        CREATE INDEX IF NOT EXISTS idx_persistent_sessions_status ON persistent_sessions(status);
        CREATE INDEX IF NOT EXISTS idx_persistent_sessions_last_activity ON persistent_sessions(last_activity);
        
        RAISE NOTICE 'Índices verificados/creados exitosamente';
    END IF;
END
$$; 