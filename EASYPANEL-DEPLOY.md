# Guía de Despliegue en Easypanel

Esta guía proporciona instrucciones detalladas para desplegar el proyecto Chatbot Full Stack en Easypanel.

## Requisitos Previos

1. Una instancia de Easypanel configurada y funcionando
2. Acceso a la interfaz de administración de Easypanel
3. Un dominio o subdominio configurado para apuntar a tu servidor Easypanel

## Pasos para el Despliegue

### 1. Preparar el Proyecto

Asegúrate de tener los siguientes archivos en tu repositorio:

- `Dockerfile` completo y funcional
- `easypanel.yml` con la configuración correcta
- `.env` con los valores por defecto (no incluir claves sensibles)

### 2. Configurar el Proyecto en Easypanel

1. Inicia sesión en tu panel de Easypanel
2. Ve a "Projects" y haz clic en "New Project"
3. Asigna un nombre al proyecto (por ejemplo, "chatbot-saas")
4. Selecciona "Import from Git repository"
5. Ingresa la URL de tu repositorio Git
6. Configura las credenciales de acceso si el repositorio es privado
7. Haz clic en "Create Project"

### 3. Configurar Variables de Entorno

En la sección "Environment Variables" del proyecto, configura las siguientes variables:

```
NODE_ENV=production
PORT=3000
DB_TYPE=sqlite
DB_DATABASE=/app/database/chatbot.sqlite
JWT_SECRET=[genera_un_secreto_seguro]
CORS_ORIGIN=*
OPENAI_API_KEY=[tu_clave_de_openai]
EVOLUTION_API_URL=[url_de_tu_api_evolution]
EVOLUTION_API_KEY=[tu_clave_de_evolution_api]
WHATSAPP_INSTANCE=[tu_instancia_de_whatsapp]
DEEPSEEK_API_KEY=sk-77fc1e94ddb44cd9adb0fd091effe4fb
```

### 4. Configurar Almacenamiento Persistente

Asegúrate de que los volúmenes estén configurados correctamente en la sección "Volumes":

- `/app/uploads`: Para archivos subidos por los usuarios
- `/app/logs`: Para archivos de registro
- `/app/database`: Para la base de datos SQLite

### 5. Configurar Red y Dominio

1. En la sección "Network", configura el puerto 3000 para exponer el servicio
2. En "Domains", agrega tu dominio o subdominio
3. Configura el certificado SSL para tu dominio

### 6. Iniciar el Despliegue

1. Haz clic en "Deploy" para iniciar el proceso de construcción y despliegue
2. Espera a que el proceso de construcción y despliegue se complete
3. Verifica los logs para asegurarte de que todo funciona correctamente

## Verificación del Despliegue

Una vez completado el despliegue, verifica que:

1. La aplicación está accesible en tu dominio configurado
2. El panel de administración está disponible en `/admin`
3. La documentación de la API está disponible en `/api`
4. Los logs no muestran errores críticos

## Solución de Problemas Comunes

### Error de conexión a la base de datos

Si tienes problemas con la base de datos:

1. Verifica que el volumen `/app/database` está correctamente montado
2. Asegúrate de que los permisos son correctos (777 para el directorio)
3. Confirma que la variable `DB_DATABASE` apunta a `/app/database/chatbot.sqlite`

### Problemas con los archivos de subida

Si los archivos no se pueden subir:

1. Verifica que el volumen `/app/uploads` está correctamente montado
2. Asegúrate de que los permisos son correctos (777 para el directorio)

### Problemas con la integración de WhatsApp

Si la integración con WhatsApp no funciona:

1. Verifica las variables de entorno `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` y `WHATSAPP_INSTANCE`
2. Revisa los logs para ver errores específicos de la conexión

## Mantenimiento

### Actualizaciones

Para actualizar la aplicación:

1. Haz cambios en tu repositorio Git
2. Haz commit y push de los cambios
3. En Easypanel, ve a tu proyecto y haz clic en "Redeploy"

### Backups

Para hacer backup de tus datos:

1. Accede al servidor vía SSH
2. Haz copia de los directorios:
   - `/data/easypanel/projects/[nombre-proyecto]/volumes/data/app/database`
   - `/data/easypanel/projects/[nombre-proyecto]/volumes/data/app/uploads`

## Consideraciones de Seguridad

1. Genera un `JWT_SECRET` fuerte y único
2. No expongas claves de API en repositorios públicos
3. Limita el acceso al panel de administración mediante autenticación
4. Revisa regularmente los logs en busca de actividad sospechosa