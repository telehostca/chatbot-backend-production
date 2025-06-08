#!/bin/bash

# 🔧 Script para Ejecutar Fix de Base de Datos Manualmente
# Útil para troubleshooting o ejecución manual

echo "🔧 Ejecutando fix de base de datos en producción..."
echo "🎯 Objetivo: Crear tablas faltantes y resolver problema de guardado"
echo ""

# Verificar que Node.js esté disponible
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está disponible"
    exit 1
fi

# Verificar que el script de fix exista
if [ ! -f "fix-production-db.js" ]; then
    echo "❌ Script fix-production-db.js no encontrado"
    exit 1
fi

# Ejecutar el fix
echo "🚀 Ejecutando script de fix..."
node fix-production-db.js

# Verificar el resultado
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Fix ejecutado exitosamente"
    echo "🔗 Las organizaciones y chatbots ahora deberían guardarse"
    echo "🌐 Verifica en: https://mybot.zemog.info/admin/organizations"
else
    echo ""
    echo "❌ Error ejecutando el fix"
    echo "📋 Revisa los logs para más detalles"
fi

echo ""
echo "📋 Próximos pasos:"
echo "  1. Probar crear una organización en el frontend"
echo "  2. Verificar que se guarde correctamente"
echo "  3. Probar crear un chatbot"
echo "  4. Verificar la persistencia de datos" 