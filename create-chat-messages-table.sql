-- Script para crear la tabla chat_messages si no existe
-- Basado en la entidad ChatMessage

-- Crear la tabla chat_messages si no existe
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    sender VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    chat_session_id UUID,
    session_id UUID,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_session_id ON chat_messages(chat_session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);

-- Opcional: Agregar foreign keys si las tablas existen
-- ALTER TABLE chat_messages ADD CONSTRAINT fk_chat_messages_session 
--     FOREIGN KEY (session_id) REFERENCES persistent_sessions(id) ON DELETE CASCADE;

-- Verificar la estructura de la tabla
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
ORDER BY ordinal_position; 