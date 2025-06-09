#!/bin/bash

# 🔑 Script para actualizar la API Key de DeepSeek
# Configura la clave por defecto en el archivo .env local

echo "🔑 CONFIGURANDO API KEY DE DEEPSEEK..."
echo "======================================="

# Tu API Key de DeepSeek
DEEPSEEK_KEY="sk-77fc1e94ddb44cd9adb0fd091effe4fb"

# Verificar si existe .env
if [ ! -f ".env" ]; then
    echo "❌ Archivo .env no encontrado"
    echo "📝 Copiando desde env.example..."
    cp env.example .env
fi

# Actualizar o agregar la clave de DeepSeek
if grep -q "DEEPSEEK_API_KEY=" .env; then
    # Si existe, reemplazar
    echo "🔄 Actualizando DEEPSEEK_API_KEY existente..."
    sed -i.bak "s/DEEPSEEK_API_KEY=.*/DEEPSEEK_API_KEY=$DEEPSEEK_KEY/" .env
    rm .env.bak 2>/dev/null || true
else
    # Si no existe, agregar
    echo "➕ Agregando DEEPSEEK_API_KEY..."
    echo "DEEPSEEK_API_KEY=$DEEPSEEK_KEY" >> .env
fi

echo "✅ API Key de DeepSeek configurada exitosamente"
echo "🔑 Clave configurada: $DEEPSEEK_KEY"

# Verificar la configuración
echo ""
echo "📊 VERIFICACIÓN:"
echo "=================="
grep "DEEPSEEK_API_KEY=" .env

echo ""
echo "💡 DeepSeek configurado como IA por defecto (gratuito y recomendado)"
echo "🚀 Ya puedes usar DeepSeek en tus chatbots"

echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Reinicia la aplicación: npm run start:dev"
echo "2. Configura DeepSeek en tus chatbots desde el panel admin"
echo "3. ¡Disfruta de IA gratuita y potente!" 