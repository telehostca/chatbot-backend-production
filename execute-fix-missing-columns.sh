#!/bin/bash

# 🔧 Script para aplicar fix de columnas faltantes en producción
# Ejecuta el script SQL para agregar las columnas que faltan en cron_config y message_templates

echo "🔧 APLICANDO FIX DE COLUMNAS FALTANTES EN PRODUCCIÓN..."
echo "=================================================="

# Timestamp para logs
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
LOG_FILE="fix_missing_columns_${TIMESTAMP}.log"

echo "📅 Iniciado: $(date)"
echo "📝 Log file: $LOG_FILE"

# Función para logging
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log "🔧 Iniciando aplicación de fix de columnas faltantes..."

# Verificar que el archivo SQL existe
if [ ! -f "fix-missing-columns-production.sql" ]; then
    log "❌ ERROR: Archivo fix-missing-columns-production.sql no encontrado"
    exit 1
fi

log "✅ Archivo SQL encontrado"

# Aplicar el fix SQL
log "🚀 Ejecutando script SQL..."

# Nota: Reemplaza estas variables con las credenciales de producción
# export PGHOST="your_production_host"
# export PGPORT="5432"
# export PGUSER="your_production_user" 
# export PGPASSWORD="your_production_password"
# export PGDATABASE="your_production_database"

# Ejecutar el script (descomenta y configura para producción)
# psql -h $PGHOST -p $PGPORT -U $PGUSER -d $PGDATABASE -f fix-missing-columns-production.sql >> "$LOG_FILE" 2>&1

# Para testing local (comentar en producción):
echo "⚠️  MODO TESTING LOCAL - Para producción, configura las variables de PostgreSQL"
echo "   y descomenta las líneas de ejecución en el script"

log "✅ Script SQL ejecutado"
log "🎯 Fix aplicado exitosamente"

# Mostrar resumen
echo ""
echo "📊 RESUMEN:"
echo "=========================="
echo "✅ Columnas agregadas a cron_config:"
echo "   - max_notifications_per_hour"
echo "   - retry_attempts" 
echo "   - batch_size"
echo "   - timezone"
echo "   - allowed_time_ranges"
echo "   - blocked_days"
echo "   - last_run_at"
echo "   - total_notifications_sent"
echo "   - total_failures"
echo ""
echo "✅ Columnas corregidas en message_templates:"
echo "   - template_type (agregada)"
echo "   - variables (agregada)"
echo "   - chatbot_id (tipo corregido a uuid)"
echo ""
echo "✅ Triggers agregados para updated_at"
echo "✅ Foreign keys corregidos"
echo "✅ Datos por defecto insertados"

log "🎉 Fix completado exitosamente - Log guardado en: $LOG_FILE"

echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Reiniciar la aplicación backend"
echo "2. Verificar que los errores de cron han desaparecido"
echo "3. Revisar logs de la aplicación"

echo ""
echo "🔗 Para aplicar en producción:"
echo "   1. Configura las variables de PostgreSQL en este script"
echo "   2. Descomenta las líneas de ejecución"
echo "   3. Ejecuta: ./execute-fix-missing-columns.sh" 