-- 🔧 Setup Local Database (SQLite)
-- Script para crear todas las tablas necesarias en SQLite para desarrollo local

-- 1. Tabla organizations
CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    plan VARCHAR(50) DEFAULT 'basic',
    status VARCHAR(50) DEFAULT 'active',
    config TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla chatbot_instances
CREATE TABLE IF NOT EXISTS chatbot_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    organization_id INTEGER,
    status VARCHAR(50) DEFAULT 'active',
    config TEXT DEFAULT '{}',
    whatsapp_config TEXT DEFAULT '{}',
    database_config TEXT DEFAULT '{}',
    ai_config TEXT DEFAULT '{}',
    rag_config TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- 3. Tabla users
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    organization_id INTEGER,
    is_active BOOLEAN DEFAULT 1,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- 4. Tabla conversations
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chatbot_id INTEGER,
    user_phone VARCHAR(50),
    user_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    message_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chatbot_id) REFERENCES chatbot_instances(id)
);

-- 5. Tabla messages
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER,
    content TEXT NOT NULL,
    sender VARCHAR(50) NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    metadata TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- 6. Tabla cron_config
CREATE TABLE IF NOT EXISTS cron_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    cron_expression VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla knowledge_bases (para RAG)
CREATE TABLE IF NOT EXISTS knowledge_bases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chatbot_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'document',
    content TEXT,
    embeddings TEXT,
    metadata TEXT DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chatbot_id) REFERENCES chatbot_instances(id)
);

-- 8. Tabla notification_templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    template TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    config TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 9. Insertar datos iniciales
INSERT OR IGNORE INTO organizations (name, slug, plan, status) 
VALUES ('Default Organization', 'default', 'premium', 'active');

INSERT OR IGNORE INTO chatbot_instances (name, slug, organization_id, status)
VALUES (
    'Demo Chatbot', 
    'demo-chatbot', 
    (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1),
    'active'
);

INSERT OR IGNORE INTO users (email, password, name, role, organization_id)
VALUES (
    'admin@admin.com', 
    '$2b$10$8qK0t2G5x1QvJ4k9N2h1Q.8tqKJ7G5x1QvJ4k9N2h1Q.8tqKJ7G5x', 
    'Administrator', 
    'admin',
    (SELECT id FROM organizations WHERE slug = 'default' LIMIT 1)
);

INSERT OR IGNORE INTO cron_config (name, cron_expression, description)
VALUES 
    ('notifications_check', '*/5 * * * *', 'Verificar notificaciones cada 5 minutos'),
    ('cleanup_sessions', '0 2 * * *', 'Limpiar sesiones expiradas diariamente');

-- 10. Crear índices
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_chatbot_instances_slug ON chatbot_instances(slug);
CREATE INDEX IF NOT EXISTS idx_chatbot_instances_org ON chatbot_instances(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_chatbot ON conversations(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_chatbot ON knowledge_bases(chatbot_id); 