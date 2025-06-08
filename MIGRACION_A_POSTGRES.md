# Migración de SQLite a PostgreSQL

Este documento explica el proceso para migrar los datos existentes de una base de datos SQLite a PostgreSQL.

## Requisitos previos

1. Tener instalado PostgreSQL en el servidor o localmente
2. Tener acceso al archivo de base de datos SQLite
3. Tener configurado el entorno para usar PostgreSQL

## Pasos para la migración

### 1. Configuración del archivo .env

Asegúrate de que tu archivo `.env` o `env.local` tenga la configuración correcta para PostgreSQL:

```
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=tu_usuario
DB_PASSWORD=tu_password
DB_DATABASE=chatbot_db
```

### 2. Ejecutar el script de migración

Hemos creado un script especial para migrar todos los datos de SQLite a PostgreSQL. Ejecuta:

```bash
npm run migrate:sqlite-to-postgres
```

El script te pedirá:
- La ruta completa al archivo SQLite de origen
- Confirmación para limpiar la base de datos PostgreSQL antes de migrar (opcional)

### 3. Seguimiento de la migración

El proceso mostrará información detallada sobre:
- Conexión a ambas bases de datos
- Limpieza de tablas en PostgreSQL (si se elige esta opción)
- Progreso de migración de cada entidad
- Resumen final con estadísticas

### 4. Verificación

Una vez completada la migración:

1. Verifica que los datos se hayan migrado correctamente
2. Asegúrate de que todas las relaciones estén intactas
3. Prueba las funcionalidades clave de la aplicación

### 5. Cambio permanente a PostgreSQL

Para usar PostgreSQL permanentemente:

1. Asegúrate de que el archivo `.env` esté configurado correctamente
2. Verifica que `docker-compose.yml` esté configurado para PostgreSQL
3. Reinicia tu aplicación

## Solución de problemas

### Error de conexión a SQLite
- Verifica que la ruta al archivo SQLite sea correcta
- Asegúrate de que el archivo tenga permisos de lectura

### Error de conexión a PostgreSQL
- Verifica las credenciales en el archivo `.env`
- Asegúrate de que el servidor PostgreSQL esté en ejecución
- Verifica que la base de datos exista

### Errores durante la migración
- Los errores específicos se mostrarán en la consola
- Verifica las restricciones de clave foránea
- Asegúrate de que las estructuras de tabla sean compatibles

## Notas importantes

- La migración puede tomar tiempo dependiendo del volumen de datos
- Es recomendable hacer una copia de seguridad antes de iniciar
- El script está diseñado para manejar fallos y mostrar información detallada
- Si encuentras problemas específicos, revisa los logs para diagnóstico

## Entidades migradas

El script migra las siguientes entidades:

- Usuarios y organizaciones
- Chatbots y configuraciones
- Mensajes y sesiones de chat
- Plantillas de mensajes
- Promociones y descuentos
- Bases de conocimiento RAG
- Y todas las demás entidades del sistema 