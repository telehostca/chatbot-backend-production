#!/bin/bash

echo "🗑️ Eliminando SQLite completamente..."

# Eliminar archivo SQLite si existe
if [ -f "./local_database.sqlite" ]; then
    rm ./local_database.sqlite
    echo "✅ Archivo SQLite eliminado"
fi

# Crear nuevo .env con PostgreSQL
echo "📝 Configurando .env para PostgreSQL..."
cat > .env << 'EOF'
NODE_ENV=development
PORT=3000

# PostgreSQL Local
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=chatbot_saas_local

# JWT
JWT_SECRET=clave-jwt-local-para-testing-32-caracteres
JWT_EXPIRATION=24h

# APIs (opcional)
OPENAI_API_KEY=
DEEPSEEK_API_KEY=sk-77fc1e94ddb44cd9adb0fd091effe4fb
ANTHROPIC_API_KEY=

# WhatsApp (opcional)
WHATSAPP_API_URL=
WHATSAPP_API_KEY=
EOF

echo "🐘 Configurando PostgreSQL local..."

# Verificar si PostgreSQL está instalado
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL no está instalado. Instalando con Homebrew..."
    if command -v brew &> /dev/null; then
        brew install postgresql
        brew services start postgresql
    else
        echo "❌ Homebrew no está instalado. Por favor instala PostgreSQL manualmente."
        exit 1
    fi
fi

# Crear base de datos
echo "📊 Creando base de datos chatbot_saas_local..."
createdb chatbot_saas_local 2>/dev/null || echo "Base de datos ya existe"

# Crear tablas esenciales
echo "🏗️ Creando tablas esenciales..."
psql -d chatbot_saas_local << 'SQL'
-- Crear tabla organizations
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla chatbot_instances
CREATE TABLE IF NOT EXISTS chatbot_instances (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    organization_id INTEGER REFERENCES organizations(id),
    whatsapp_config JSONB DEFAULT '{}',
    database_config JSONB DEFAULT '{}',
    ai_config JSONB DEFAULT '{}',
    rag_config JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    organization_id INTEGER REFERENCES organizations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla conversations
CREATE TABLE IF NOT EXISTS conversations (
    id SERIAL PRIMARY KEY,
    chatbot_id INTEGER REFERENCES chatbot_instances(id),
    user_phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla messages
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id),
    content TEXT,
    sender VARCHAR(50),
    message_type VARCHAR(50) DEFAULT 'text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear tabla cron_config
CREATE TABLE IF NOT EXISTS cron_config (
    id SERIAL PRIMARY KEY,
    chatbot_id INTEGER REFERENCES chatbot_instances(id),
    cron_expression VARCHAR(255),
    action VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar datos de prueba
INSERT INTO organizations (name, slug) VALUES 
('Organización Demo', 'demo-org') 
ON CONFLICT (slug) DO NOTHING;

INSERT INTO users (username, email, password, role, organization_id) VALUES 
('admin', 'admin@demo.com', '$2b$10$hash', 'admin', 1)
ON CONFLICT (username) DO NOTHING;

INSERT INTO chatbot_instances (name, slug, organization_id, whatsapp_config, ai_config) VALUES 
('Chatbot Demo', 'demo-bot', 1, '{"phone": "+1234567890"}', '{"model": "gpt-3.5-turbo"}')
ON CONFLICT (slug) DO NOTHING;

SQL

echo "✅ PostgreSQL configurado completamente"
echo "🚀 Ahora puedes ejecutar: npm run start:dev"
echo ""
echo "📊 Configuración:"
echo "   - Base de datos: chatbot_saas_local"
echo "   - Usuario: postgres"
echo "   - Puerto: 5432"
echo "   - Host: localhost" 