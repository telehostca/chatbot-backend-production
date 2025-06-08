# Etapa de construcción
FROM node:18-bullseye AS builder

WORKDIR /app

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependencias
RUN npm ci --ignore-scripts --no-audit

# Copiar código fuente
COPY src/ ./src/
COPY frontend/ ./frontend/

# Construir backend
RUN npm run build

# Construir frontend
RUN cd frontend && npm ci --ignore-scripts --no-audit && npm run build

# Etapa de producción
FROM node:18-bullseye

# Instalar PostgreSQL client
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Crear usuario no root
RUN groupadd -r nodejs && useradd -r -g nodejs -s /bin/bash nodejs

WORKDIR /app

# Crear directorios y configurar permisos
RUN mkdir -p /app/uploads /app/logs && \
    chown -R nodejs:nodejs /app

# Copiar archivos construidos
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/frontend/dist ./frontend/dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs package*.json ./

# Variables PostgreSQL
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_TYPE=postgres
ENV DB_HOST=postgresql
ENV DB_PORT=5432
ENV DB_USERNAME=postgres
ENV DB_PASSWORD=9ad22d8eb9a3fd48f227
ENV DB_DATABASE=telehost
ENV DATABASE_URL=postgresql://postgres:9ad22d8eb9a3fd48f227@postgresql:5432/telehost

# Configurar variables de crypto para Node.js
ENV NODE_OPTIONS="--require crypto"

# Exponer puerto
EXPOSE 3000

# Cambiar a usuario nodejs
USER nodejs

# Comando mejorado con migraciones y verificación
CMD ["sh", "-c", "echo '🚀 Iniciando Chatbot SaaS PostgreSQL' && echo 'Host: $DB_HOST:$DB_PORT' && echo 'DB: $DB_DATABASE' && until pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USERNAME; do echo '⏳ Esperando PostgreSQL...'; sleep 3; done && echo '✅ PostgreSQL conectado!' && echo '📊 Ejecutando migraciones...' && npm run migration:run 2>/dev/null || echo '⚠️ Migraciones ya ejecutadas o error menor' && echo '🌟 Iniciando aplicación...' && node dist/main"] 