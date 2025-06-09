# Guía de Despliegue en Producción

Este documento proporciona instrucciones detalladas para desplegar el Chatbot SaaS en un entorno de producción.

## Opciones de Despliegue

Hay dos opciones principales para desplegar esta aplicación:

1. **Despliegue en Easypanel** (recomendado para la mayoría de usuarios)
2. **Despliegue manual con Docker**

## 1. Despliegue en Easypanel

### Requisitos Previos

- Una instancia de Easypanel configurada
- Acceso a la interfaz de administración de Easypanel
- Un dominio o subdominio configurado

### Pasos para el Despliegue

1. En Easypanel, crea un nuevo proyecto desde el repositorio Git
2. Usa el archivo `easypanel.yml` incluido en el repositorio
3. Configura las variables de entorno necesarias (ver `.env.easypanel.example`)
4. Asegúrate de que los volúmenes están configurados correctamente
5. Despliega el proyecto

Para instrucciones detalladas, consulta el archivo [EASYPANEL-DEPLOY.md](EASYPANEL-DEPLOY.md).

## 2. Despliegue Manual con Docker

### Requisitos Previos

- Docker y Docker Compose instalados
- Acceso al servidor mediante SSH
- Un dominio o subdominio configurado

### Pasos para el Despliegue

1. Clona el repositorio en tu servidor:
   ```bash
   git clone https://github.com/tuusuario/chatbot-full-stack.git
   cd chatbot-full-stack
   ```

2. Crea un archivo `.env` basado en el ejemplo:
   ```bash
   cp .env.example .env
   ```

3. Edita el archivo `.env` con tus propias configuraciones:
   ```bash
   nano .env
   ```

4. Construye y ejecuta los contenedores:
   ```bash
   docker compose up -d
   ```

5. Verifica que los contenedores están funcionando:
   ```bash
   docker compose ps
   ```

## Configuración de la Base de Datos

### Opción 1: SQLite (recomendado para despliegues simples)

La configuración por defecto usa SQLite, que es más simple de mantener. Asegúrate de que las siguientes variables están configuradas:

```
DB_TYPE=sqlite
DB_DATABASE=/app/database/chatbot.sqlite
```

### Opción 2: PostgreSQL (recomendado para alta disponibilidad)

Si necesitas mayor rendimiento o alta disponibilidad, puedes usar PostgreSQL:

```
DB_TYPE=postgres
DB_HOST=tu_host_postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=tu_contraseña
DB_DATABASE=chatbot
```

## Configuración de WhatsApp (Evolution API)

Para habilitar la integración con WhatsApp, configura:

```
EVOLUTION_API_URL=https://tu-instancia-evolution-api.com
EVOLUTION_API_KEY=tu_clave_api
WHATSAPP_INSTANCE=tu_id_instancia
```

## Configuración de IA

El sistema puede usar diferentes proveedores de IA:

```
OPENAI_API_KEY=tu_clave_openai
OPENAI_MODEL=gpt-3.5-turbo
DEEPSEEK_API_KEY=sk-77fc1e94ddb44cd9adb0fd091effe4fb
```

## Gestión de Archivos y Logs

Los siguientes directorios deben tener permisos de escritura:

- `/app/uploads`: Para archivos subidos por los usuarios
- `/app/logs`: Para los archivos de log
- `/app/database`: Para la base de datos SQLite (si se usa)

## Configuración de HTTPS

Se recomienda configurar HTTPS para tu aplicación. Puedes usar:

1. **Nginx como proxy inverso** con Let's Encrypt
2. **Traefik** para gestionar automáticamente certificados SSL
3. **Cloudflare** como proxy con certificados SSL

## Backups

Es importante realizar backups regulares de:

1. La base de datos
2. Los archivos subidos
3. Los logs (si son necesarios)

Para SQLite, simplemente haz copia del archivo de base de datos.

## Monitorización

Configura monitorización para tu aplicación:

1. Usa el endpoint `/api/health` para verificar el estado
2. Configura alertas si el servicio no responde
3. Monitoriza el uso de CPU, memoria y espacio en disco

## Seguridad

1. Cambia todas las claves y contraseñas por defecto
2. Usa un `JWT_SECRET` fuerte y único
3. Limita el acceso al panel de administración
4. Mantén actualizadas todas las dependencias 