-- 🚨 SCRIPT CRÍTICO PARA CREAR TODAS LAS TABLAS FALTANTES
-- Ejecutar directamente en PostgreSQL

-- 1. Tabla organizations (CRÍTICA)
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    plan VARCHAR(50) DEFAULT 'basic',
    status VARCHAR(50) DEFAULT 'active',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla chatbot_instances (CRÍTICA)
CREATE TABLE IF NOT EXISTS chatbot_instances (
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

-- 3. Tabla users (usuarios del sistema)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    organization_id INTEGER,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla conversations (conversaciones)
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    chatbot_id INTEGER,
    user_phone VARCHAR(50),
    user_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla messages (mensajes)
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER,
    content TEXT NOT NULL,
    sender VARCHAR(50) NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla cron_config (configuración de cron)
CREATE TABLE IF NOT EXISTS cron_config (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    cron_expression VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Insertar datos iniciales
INSERT INTO organizations (name, slug, plan, status) 
VALUES ('Default Organization', 'default', 'premium', 'active')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO chatbot_instances (name, slug, organization_id, status)
VALUES (
    'Demo Chatbot', 
    'demo-chatbot', 
    (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1),
    'active'
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO users (email, password, name, role, organization_id)
VALUES (
    'admin@admin.com', 
    '$2b$10$8qK0t2G5x1QvJ4k9N2h1Q.8tqKJ7G5x1QvJ4k9N2h1Q.8tqKJ7G5x', 
    'Administrator', 
    'admin',
    (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1)
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO cron_config (name, cron_expression, description)
VALUES 
    ('notifications_check', '*/5 * * * *', 'Verificar notificaciones cada 5 minutos'),
    ('cleanup_sessions', '0 2 * * *', 'Limpiar sesiones expiradas diariamente')
ON CONFLICT (name) DO NOTHING;

-- 8. Crear índices
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_chatbot_instances_slug ON chatbot_instances(slug);
CREATE INDEX IF NOT EXISTS idx_chatbot_instances_org ON chatbot_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_chatbot ON conversations(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);

-- 9. Verificar tablas creadas
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename; 