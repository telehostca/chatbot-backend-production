# 🚀 Despliegue en Easypanel con PostgreSQL

**Configuración actualizada para PostgreSQL en lugar de SQLite**

---

## 📋 **Configuración Actualizada**

### **🗄️ Base de Datos PostgreSQL**
El sistema ahora está configurado para usar PostgreSQL con los siguientes parámetros:

```env
# Configuración PostgreSQL (Easypanel)
DB_TYPE=postgres
DB_HOST=telehost_chatwaba
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=9ad22d8eb9a3fd48f227
DB_DATABASE=telehost
DB_SSL_MODE=disable
POSTGRES_PASSWORD=9ad22d8eb9a3fd48f227
DATABASE_URL=postgresql://postgres:9ad22d8eb9a3fd48f227@telehost_chatwaba:5432/telehost
```

---

## 🛠️ **Archivos Actualizados**

### **1. Dockerfile**
- ✅ Eliminadas dependencias SQLite
- ✅ Agregadas dependencias PostgreSQL (`postgresql-client`, `libpq-dev`)
- ✅ Script de inicio actualizado para verificar conexión PostgreSQL
- ✅ Variables de entorno configuradas para PostgreSQL

### **2. easypanel.yml**
- ✅ Configuración completa PostgreSQL
- ✅ Variables de entorno TypeORM actualizadas
- ✅ Eliminados volúmenes de base de datos local
- ✅ Health checks optimizados

### **3. entrypoint.sh**
- ✅ Verificación de conexión PostgreSQL con `pg_isready`
- ✅ Eliminadas referencias a SQLite
- ✅ Logs mejorados para PostgreSQL

### **4. env.example y env.production.example**
- ✅ Configuración PostgreSQL completa
- ✅ Variables TypeORM actualizadas
- ✅ Configuración de producción optimizada

---

## 🚀 **Pasos de Despliegue**

### **1. Preparar el Repositorio**
```bash
# El repositorio ya está actualizado con PostgreSQL
git clone https://github.com/telehostca/chatbot-backend-production.git
cd chatbot-backend-production
```

### **2. Verificar Configuración**
Los archivos ya contienen la configuración correcta:
- **Host**: `telehost_chatwaba`
- **Puerto**: `5432`
- **Usuario**: `postgres`
- **Contraseña**: `9ad22d8eb9a3fd48f227`
- **Base de datos**: `telehost`

### **3. Desplegar en Easypanel**
1. Subir el proyecto a Easypanel
2. Usar el archivo `easypanel.yml` incluido
3. El sistema se conectará automáticamente a PostgreSQL

---

## 🔧 **Configuración PostgreSQL**

### **Conexión Automática**
El sistema está configurado para conectarse automáticamente a:
```
postgresql://postgres:9ad22d8eb9a3fd48f227@telehost_chatwaba:5432/telehost
```

### **Verificación de Conexión**
El entrypoint incluye verificación automática:
```bash
until pg_isready -h telehost_chatwaba -p 5432 -U postgres; do
  echo "Esperando a que PostgreSQL esté disponible..."
  sleep 2
done
```

### **Migraciones Automáticas**
TypeORM está configurado con:
- `TYPEORM_SYNCHRONIZE=true` (para desarrollo)
- `TYPEORM_LOGGING=true` (para debug)
- Creación automática de tablas

---

## 📊 **Tablas del Sistema**

El sistema creará automáticamente las siguientes tablas:

### **🏢 SaaS Core**
- `organizations` - Organizaciones multi-tenant
- `users` - Usuarios del sistema
- `user_subscriptions` - Suscripciones de usuarios
- `user_plans` - Planes de suscripción
- `user_usage` - Uso de recursos

### **🤖 Chatbots**
- `chatbot_instances` - Instancias de chatbots
- `chat_sessions` - Sesiones de chat
- `chat_messages` - Mensajes de chat
- `persistent_sessions` - Sesiones persistentes

### **📚 RAG System**
- `rag_knowledge_base` - Base de conocimiento
- `rag_document_chunks` - Fragmentos de documentos

### **📱 Notificaciones**
- `notification_templates` - Plantillas de notificación
- `notifications` - Notificaciones enviadas
- `cron_config` - Configuración de tareas programadas

### **🛒 E-commerce**
- `products` - Productos
- `orders` - Órdenes
- `invoices` - Facturas
- `payments` - Pagos
- `promotions` - Promociones
- `discounts` - Descuentos

---

## ⚡ **Optimizaciones Incluidas**

### **🔄 Health Checks**
```yaml
healthcheck:
  test: ["CMD", "wget", "-q", "--spider", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

### **📁 Volúmenes Persistentes**
```yaml
volumes:
  - uploads_data:/app/uploads
  - logs_data:/app/logs
```

### **🛡️ Seguridad**
- Usuario no-root (`nodejs`)
- Variables de entorno seguras
- Conexión SSL deshabilitada para red interna

---

## 🧪 **Testing Post-Despliegue**

### **1. Verificar Conexión**
```bash
curl http://your-domain.com/api/health
```

### **2. Verificar Base de Datos**
```bash
curl http://your-domain.com/api/saas/test
```

### **3. Verificar Funcionalidades**
- ✅ Sistema SaaS
- ✅ RAG System
- ✅ Notificaciones
- ✅ Base de datos externa
- ✅ Frontend

---

## 🔍 **Troubleshooting**

### **Error de Conexión PostgreSQL**
```bash
# Verificar que PostgreSQL esté disponible
pg_isready -h telehost_chatwaba -p 5432 -U postgres
```

### **Error de Autenticación**
Verificar que las credenciales en `easypanel.yml` coincidan con la base de datos.

### **Error de Tablas**
Las tablas se crean automáticamente con `TYPEORM_SYNCHRONIZE=true`.

---

## 📞 **Soporte**

**Configuración**: PostgreSQL configurado y listo  
**Estado**: ✅ Preparado para despliegue  
**Repositorio**: https://github.com/telehostca/chatbot-backend-production

---

**🎉 ¡Sistema listo para despliegue en Easypanel con PostgreSQL!** 