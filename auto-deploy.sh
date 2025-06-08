#!/bin/bash

# 🚀 Script de Deploy Automático - ChatBot SaaS
# Automatiza: build frontend + commit + push a GitHub

echo "🔄 Iniciando deploy automático..."

# Verificar si hay cambios
if [ -z "$(git status --porcelain)" ]; then
    echo "✅ No hay cambios para commitear"
    exit 0
fi

# Mostrar cambios
echo "📁 Cambios detectados:"
git status --short

# Construir frontend si hay cambios en el directorio frontend
if git status --porcelain | grep -q "frontend/"; then
    echo "🏗️ Construyendo frontend..."
    cd frontend
    npm run build
    if [ $? -eq 0 ]; then
        echo "✅ Build del frontend exitoso"
        cd ..
        # Copiar archivos al directorio público
        mkdir -p src/public/admin
        cp -r frontend/dist/* src/public/admin/
        echo "📦 Archivos copiados a src/public/admin/"
    else
        echo "❌ Error en el build del frontend"
        exit 1
    fi
fi

# Agregar todos los cambios
git add .

# Verificar si hay algo para commitear después del git add
if [ -z "$(git diff --cached --name-only)" ]; then
    echo "✅ No hay cambios nuevos para commitear después del build"
    exit 0
fi

# Generar mensaje de commit automático
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
CHANGED_FILES=$(git diff --cached --name-only | wc -l | tr -d ' ')

COMMIT_MSG="🚀 AUTO-DEPLOY [$TIMESTAMP] - $CHANGED_FILES archivos actualizados"

# Hacer commit
echo "📝 Creando commit: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

if [ $? -eq 0 ]; then
    echo "✅ Commit creado exitosamente"
    
    # Push al repositorio remoto
    echo "📤 Subiendo cambios a GitHub..."
    git push origin main
    
    if [ $? -eq 0 ]; then
        echo "🎉 Deploy completado exitosamente!"
        echo "🌐 URL: https://mybot.zemog.info/admin/"
        echo "🔗 Repositorio: https://github.com/telehostca/chatbot-backend-production"
        
        # Mostrar hash del commit
        COMMIT_HASH=$(git rev-parse --short HEAD)
        echo "📋 Commit: $COMMIT_HASH"
        
    else
        echo "❌ Error al subir a GitHub"
        exit 1
    fi
else
    echo "❌ Error al crear commit"
    exit 1
fi 