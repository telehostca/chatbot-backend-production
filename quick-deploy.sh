#!/bin/bash

# 🚀 Quick Deploy - Versión simplificada
# Uso: ./quick-deploy.sh "mensaje opcional"

MESSAGE="$1"

if [ -z "$MESSAGE" ]; then
    MESSAGE="🔄 Actualización automática - $(date '+%Y-%m-%d %H:%M:%S')"
fi

echo "🚀 Quick Deploy iniciado..."

# Build frontend si existe
if [ -d "frontend" ]; then
    echo "🏗️ Building frontend..."
    cd frontend && npm run build && cd ..
    mkdir -p src/public/admin
    cp -r frontend/dist/* src/public/admin/
fi

# Git add, commit y push
git add .
git commit -m "$MESSAGE"
git push origin main

echo "✅ Deploy completado!"
echo "🌐 https://mybot.zemog.info/admin/" 