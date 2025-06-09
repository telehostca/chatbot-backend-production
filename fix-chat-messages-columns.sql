-- Fix para la tabla chat_messages en producción (PostgreSQL)
-- 1. Crear una tabla temporal con los datos actuales
CREATE TABLE IF NOT EXISTS chat_messages_backup AS SELECT * FROM chat_messages;

-- 2. Verificar si existe la columna session_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' AND column_name = 'session_id'
  ) THEN
    RAISE NOTICE 'La columna session_id NO existe';
    -- Añadir la columna si no existe
    ALTER TABLE chat_messages ADD COLUMN session_id VARCHAR;
  ELSE
    RAISE NOTICE 'La columna session_id ya existe';
  END IF;
END $$;

-- 3. Si la tabla ya tiene datos, actualizar las relaciones
UPDATE chat_messages 
SET session_id = ps.id
FROM persistent_sessions ps
INNER JOIN chat_sessions cs ON ps.phone_number = cs.phone_number
WHERE chat_messages.chat_session_id = cs.id
  AND chat_messages.session_id IS NULL;

-- 4. Asegurar que las foreign keys estén correctamente configuradas
-- Primero eliminamos las constraints si existen
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_chat_messages_session_id' 
    AND table_name = 'chat_messages'
  ) THEN
    ALTER TABLE chat_messages DROP CONSTRAINT fk_chat_messages_session_id;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_chat_messages_chat_session_id' 
    AND table_name = 'chat_messages'
  ) THEN
    ALTER TABLE chat_messages DROP CONSTRAINT fk_chat_messages_chat_session_id;
  END IF;
END $$;

-- 5. Agregar las foreign keys correctas
ALTER TABLE chat_messages 
  ADD CONSTRAINT fk_chat_messages_session_id 
  FOREIGN KEY (session_id) 
  REFERENCES persistent_sessions(id) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE chat_messages 
  ADD CONSTRAINT fk_chat_messages_chat_session_id 
  FOREIGN KEY (chat_session_id) 
  REFERENCES chat_sessions(id) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- 6. Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_session_id ON chat_messages(chat_session_id);

-- 7. Verificar el resultado
SELECT 
  'Total de mensajes: ' || COUNT(*)::TEXT AS total_mensajes,
  'Mensajes con session_id: ' || SUM(CASE WHEN session_id IS NOT NULL THEN 1 ELSE 0 END)::TEXT AS mensajes_con_session_id,
  'Mensajes con chat_session_id: ' || SUM(CASE WHEN chat_session_id IS NOT NULL THEN 1 ELSE 0 END)::TEXT AS mensajes_con_chat_session_id
FROM chat_messages;
