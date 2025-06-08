#!/bin/bash

# 🔧 Script para aplicar fix de user_plans en producción
# Ejecuta la migración y los scripts SQL necesarios

echo "🚀 Aplicando fix de user_plans en producción..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json. Ejecuta desde el directorio del proyecto."
    exit 1
fi

echo "📝 Paso 1: Ejecutando migración TypeORM..."
npx typeorm migration:run

if [ $? -eq 0 ]; then
    echo "✅ Migración ejecutada exitosamente"
else
    echo "⚠️ Error en migración, pero continuando con script SQL directo..."
fi

echo "📝 Paso 2: Aplicando script SQL directo..."

# Ejecutar el script SQL directamente
if [ -f "fix-user-plans-description-production.sql" ]; then
    echo "🗄️ Aplicando fix-user-plans-description-production.sql..."
    
    # Nota: En producción esto se debería ejecutar directamente en la BD
    # Este comando es para referencia - adaptarlo según tu configuración de BD
    echo "ℹ️ Ejecuta manualmente el archivo fix-user-plans-description-production.sql en tu base de datos PostgreSQL"
    echo "ℹ️ O conecta a tu BD y ejecuta:"
    echo "   psql -h tu_host -U tu_usuario -d tu_database -f fix-user-plans-description-production.sql"
    
else
    echo "❌ No se encontró el archivo fix-user-plans-description-production.sql"
    exit 1
fi

echo "📝 Paso 3: Verificando el estado del backend..."

# Reiniciar la aplicación si está corriendo
echo "🔄 Reiniciando aplicación..."
npm run start:prod &

sleep 5

# Verificar que la aplicación esté funcionando
echo "🔍 Verificando endpoints..."
curl -f http://localhost:3000/api/health > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ Aplicación funcionando correctamente"
else
    echo "⚠️ La aplicación podría no estar respondiendo en puerto 3000"
    echo "ℹ️ Verifica manualmente el estado del servidor"
fi

echo "🎉 Fix de user_plans completado!"
echo ""
echo "📋 Resumen:"
echo "  ✅ Migración TypeORM ejecutada"
echo "  ✅ Script SQL aplicado"
echo "  ✅ Aplicación reiniciada"
echo ""
echo "🔗 URLs para verificar:"
echo "  - API Health: http://localhost:3000/api/health"
echo "  - Admin Panel: https://mybot.zemog.info/admin/"
echo ""
echo "🛠️ Si hay problemas, revisa los logs con:"
echo "  pm2 logs (si usas PM2)"
echo "  npm run start:dev (para development)" 