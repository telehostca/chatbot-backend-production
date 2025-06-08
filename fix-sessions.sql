-- Crear tabla persistent_sessions con estructura correcta
CREATE TABLE IF NOT EXISTS persistent_sessions (
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
