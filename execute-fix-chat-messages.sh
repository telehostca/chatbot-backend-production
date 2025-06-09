#!/bin/bash
# Script para ejecutar el fix de chat_messages en producción
# Este script debe ejecutarse en el servidor de producción

echo "🔧 Iniciando fix para la tabla chat_messages..."
echo "📋 Creando respaldo de la tabla actual..."

# Variables de conexión (ajustar según configuración de producción)
DB_NAME="tu_base_de_datos"
DB_USER="tu_usuario"
DB_HOST="localhost"
DB_PORT="5432"

# Solicitar password (más seguro que hardcodearlo)
echo "Por favor ingresa la contraseña de PostgreSQL para el usuario $DB_USER:"
read -s DB_PASSWORD

# Ejecutar la query de fix
echo "⚙️ Aplicando fixes a la tabla chat_messages..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f fix-chat-messages-columns.sql

if [ $? -eq 0 ]; then
  echo "✅ Fix aplicado exitosamente a la tabla chat_messages!"
  echo "🔍 Verifica los resultados en la última parte del output SQL."
else
  echo "❌ Error al aplicar el fix. Revisa los mensajes de error."
  exit 1
fi

echo "📊 Estadísticas post-fix:"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT COUNT(*) AS total_mensajes FROM chat_messages;"

echo "🏁 Proceso completado."
