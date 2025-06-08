-- 🔧 Fix para Migraciones Faltantes - ChatBot SaaS
-- Ejecutar en PostgreSQL para crear tablas faltantes

-- 1. Tabla cron_config (la que está fallando)
CREATE TABLE IF NOT EXISTS cron_config (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    cron_expression VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla organizations (para guardar organizaciones)
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    website VARCHAR(255),
    logo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla chatbots (para guardar chatbots)
CREATE TABLE IF NOT EXISTS chatbots (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    organization_id INTEGER REFERENCES organizations(id),
    type VARCHAR(100) DEFAULT 'basic',
    config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    whatsapp_instance VARCHAR(255),
    ai_model VARCHAR(100) DEFAULT 'gpt-3.5-turbo',
    system_prompt TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla chatbot_instances (para instancias de chatbots)
CREATE TABLE IF NOT EXISTS chatbot_instances (
    id SERIAL PRIMARY KEY,
    chatbot_id INTEGER REFERENCES chatbots(id),
    instance_name VARCHAR(255) NOT NULL,
    whatsapp_number VARCHAR(50),
    status VARCHAR(50) DEFAULT 'inactive',
    config JSONB DEFAULT '{}',
    last_activity TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla users (usuarios del sistema)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    organization_id INTEGER REFERENCES organizations(id),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla conversations (conversaciones)
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    chatbot_id INTEGER REFERENCES chatbots(id),
    user_phone VARCHAR(50),
    user_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla messages (mensajes)
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id),
    content TEXT NOT NULL,
    sender VARCHAR(50) NOT NULL, -- 'user' o 'bot'
    message_type VARCHAR(50) DEFAULT 'text',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Insertar datos iniciales
INSERT INTO organizations (name, description, email) 
VALUES ('Organización Demo', 'Organización de demostración', 'demo@saas.com')
ON CONFLICT (name) DO NOTHING;

INSERT INTO cron_config (name, cron_expression, description)
VALUES 
    ('notifications_check', '*/5 * * * *', 'Verificar notificaciones cada 5 minutos'),
    ('cleanup_sessions', '0 2 * * *', 'Limpiar sesiones expiradas diariamente')
ON CONFLICT (name) DO NOTHING;

-- 9. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_chatbots_organization ON chatbots(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_chatbot ON conversations(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);

-- 10. Verificar que las tablas se crearon
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename; 

-- 🚨 FIX CRÍTICO PARA CHATBOT_INSTANCES
-- Actualiza la estructura para que coincida con lo que espera la aplicación

DROP TABLE IF EXISTS chatbot_instances CASCADE;
CREATE TABLE chatbot_instances (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    organization_id INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    config JSONB DEFAULT '{}',
    whatsapp_config JSONB DEFAULT '{}',
    database_config JSONB DEFAULT '{}',
    ai_config JSONB DEFAULT '{}',
    rag_config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar chatbot de ejemplo
INSERT INTO chatbot_instances (name, slug, organization_id, status)
VALUES (
    'Chatbot Demo', 
    'demo-bot', 
    (SELECT id FROM organizations WHERE name = 'Organización Demo' LIMIT 1),
    'active'
)
ON CONFLICT (slug) DO NOTHING;

-- Crear índices para chatbot_instances
CREATE INDEX IF NOT EXISTS idx_chatbot_instances_slug ON chatbot_instances(slug);
CREATE INDEX IF NOT EXISTS idx_chatbot_instances_org ON chatbot_instances(organization_id);

-- 🚨 FIX CRÍTICO PARA CHATBOT_INSTANCES
-- Actualiza la estructura para que coincida con lo que espera la aplicación

DROP TABLE IF EXISTS chatbot_instances CASCADE;
CREATE TABLE chatbot_instances (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    organization_id INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    config JSONB DEFAULT '{}',
    whatsapp_config JSONB DEFAULT '{}',
    database_config JSONB DEFAULT '{}',
    ai_config JSONB DEFAULT '{}',
    rag_config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar chatbot de ejemplo
INSERT INTO chatbot_instances (name, slug, organization_id, status)
VALUES (
    'Chatbot Demo', 
    'demo-bot', 
    (SELECT id FROM organizations WHERE name = 'Organización Demo' LIMIT 1),
    'active'
)
ON CONFLICT (slug) DO NOTHING;

-- Crear índices para chatbot_instances
CREATE INDEX IF NOT EXISTS idx_chatbot_instances_slug ON chatbot_instances(slug);
CREATE INDEX IF NOT EXISTS idx_chatbot_instances_org ON chatbot_instances(organization_id); 
