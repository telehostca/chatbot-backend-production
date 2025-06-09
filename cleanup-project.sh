#!/bin/bash

echo "🧹 LIMPIEZA DEL PROYECTO - Eliminando archivos innecesarios"
echo "================================================="

# Crear backup de archivos importantes
echo "📦 Creando backup de archivos importantes..."
mkdir -p backup
cp package.json backup/ 2>/dev/null
cp README.md backup/ 2>/dev/null
cp env.example backup/ 2>/dev/null
cp docker-compose.yml backup/ 2>/dev/null
cp Dockerfile backup/ 2>/dev/null

echo "🗑️  Eliminando archivos innecesarios..."

# 1. Eliminar archivos de documentación innecesaria (excepto README.md principal)
echo "• Eliminando documentación innecesaria..."
find . -maxdepth 1 -name "*.md" -not -name "README.md" -delete

# 2. Eliminar archivos de logs
echo "• Eliminando logs..."
find . -maxdepth 1 -name "*.log" -delete

# 3. Eliminar scripts SQL de desarrollo/testing
echo "• Eliminando scripts SQL de desarrollo..."
find . -maxdepth 1 -name "*.sql" -delete

# 4. Eliminar scripts de testing y desarrollo
echo "• Eliminando scripts de testing..."
find . -maxdepth 1 -name "test-*.js" -delete
find . -maxdepth 1 -name "fix-*.js" -delete
find . -maxdepth 1 -name "create-*.js" -delete
find . -maxdepth 1 -name "verify-*.js" -delete
find . -maxdepth 1 -name "add-*.js" -delete

# 5. Eliminar archivos de configuración duplicados
echo "• Eliminando configuraciones duplicadas..."
find . -maxdepth 1 -name "Dockerfile.*" -delete
find . -maxdepth 1 -name "dockerfile-*" -delete
find . -maxdepth 1 -name "easypanel*.yml" -delete
find . -maxdepth 1 -name "docker-compose.prod.yml" -delete

# 6. Eliminar scripts de deployment obsoletos
echo "• Eliminando scripts obsoletos..."
find . -maxdepth 1 -name "*.sh" -not -name "cleanup-project.sh" -delete

# 7. Eliminar archivos temporales y de sistema
echo "• Eliminando archivos temporales..."
find . -name ".DS_Store" -delete
rm -rf dist/ temp/ uploads/ assets/ backup-*/ fixes/

# 8. Eliminar archivos de configuración innecesarios
echo "• Limpiando configuraciones..."
rm -f env.production.example jest-e2e.json

echo "✅ Limpieza completada!"
echo ""
echo "📋 ARCHIVOS CONSERVADOS:"
echo "• src/ - Código fuente principal"
echo "• frontend/ - Frontend de la aplicación"  
echo "• package.json - Dependencias"
echo "• README.md - Documentación principal"
echo "• env.example - Configuración de ejemplo"
echo "• docker-compose.yml - Docker compose"
echo "• Dockerfile - Imagen Docker"
echo "• .git/ - Control de versiones"
echo "• node_modules/ - Dependencias (si existe)"
echo "• public/ - Archivos públicos (si existe)"
echo ""
echo "🎯 Proyecto limpio y organizado!" 