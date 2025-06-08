# 🤖 Chatbot SaaS Backend - Sistema Integral

**Sistema completo de chatbots SaaS con IA, RAG, notificaciones y base de datos externa**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10+-red.svg)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue.svg)](https://www.typescriptlang.org/)

---

## 🚀 **Características Principales**

### ✅ **Sistema SaaS Completo**
- 🏢 **Gestión de organizaciones** multi-tenant
- 🤖 **Múltiples chatbots** por organización
- 📊 **Dashboard administrativo** completo
- 💰 **Modelos de suscripción** flexibles

### 🧠 **IA Flexible y Potente**
- 🎁 **DeepSeek gratuito** por defecto
- 🔥 **OpenAI, Anthropic, Google** como opciones premium
- ⚡ **Configuración dinámica** de modelos
- 🎛️ **Control de temperatura** ajustable

### 📚 **Sistema RAG Avanzado**
- 📄 **Procesamiento de documentos** automático (PDF, TXT, DOCX)
- 🔍 **Búsqueda semántica** con embeddings
- 💡 **Respuestas contextuales** inteligentes
- 📊 **Estadísticas detalladas** de uso

### 🔗 **Integración Base de Datos Externa**
- 🗄️ **MySQL, PostgreSQL, SQLite** compatibles
- 🔄 **Conexiones dinámicas** por chatbot
- 🎯 **Mapeo automático** de esquemas
- 🛠️ **Consultas personalizadas** por tabla

### 📱 **Sistema de Notificaciones**
- ✉️ **Plantillas personalizables** con variables
- ⏰ **Programación con cron** automática
- 📞 **WhatsApp integration** completa
- 📈 **Métricas de engagement** detalladas

### 🎯 **Tipos de Chatbot Especializados**
- 💬 **Básico**: Atención al cliente general
- 🛒 **E-commerce**: Ventas y carrito de compras
- 📅 **Citas**: Gestión de reservas y horarios
- 🎯 **Consultoría**: Asesoramiento profesional
- 🍽️ **Restaurante**: Pedidos y reservas de mesa
- 🏥 **Salud**: Consultas médicas y seguimiento

---

## 🏗️ **Arquitectura del Sistema**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   React+Vite    │◄──►│   NestJS        │◄──►│   PostgreSQL    │
│   TailwindCSS   │    │   TypeORM       │    │   Multi-tenant  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   WhatsApp      │    │   IA Services   │    │   External DB   │
│   Evolution API │    │   Multi-provider│    │   Dynamic Conn  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🛠️ **Instalación y Configuración**

### **Prerrequisitos**
- Node.js 18+
- PostgreSQL 15+
- npm o yarn

### **1. Clonar el repositorio**
```bash
git clone <repository-url>
cd backend
```

### **2. Instalar dependencias**
```bash
npm install
cd frontend && npm install && cd ..
```

### **3. Configurar variables de entorno**
```bash
cp env.example .env
```

**Editar `.env` con tu configuración:**
```env
# Base de datos principal
DATABASE_URL=postgresql://username:password@localhost:5432/chatbot_backend

# Configuración PostgreSQL
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USERNAME=tu_usuario
POSTGRES_PASSWORD=tu_password
POSTGRES_DATABASE=chatbot_backend

# WhatsApp (Opcional)
WHATSAPP_API_URL=https://api.zemog.info
WHATSAPP_DEFAULT_INSTANCE=tu_instancia

# IA (Opcionales - se configuran por chatbot)
DEEPSEEK_API_KEY=sk-deepseek-key-opcional
OPENAI_API_KEY=sk-openai-key-opcional
ANTHROPIC_API_KEY=sk-ant-key-opcional
```

### **4. Configurar base de datos**
```bash
# Crear base de datos
createdb chatbot_backend

# Ejecutar migraciones
npm run migration:run

# (Opcional) Crear tablas SaaS
psql -d chatbot_backend -f create_saas_tables.sql
```

### **5. Iniciar el sistema**
```bash
# Backend
npm run start:dev

# Frontend (en otra terminal)
cd frontend && npm run dev
```

---

## 📋 **Uso del Sistema**

### **🏢 Crear Organización**
1. Accede al dashboard administrativo
2. Crea una nueva organización
3. Configura plan y límites

### **🤖 Configurar Chatbot**
1. Selecciona tipo de chatbot (básico, e-commerce, etc.)
2. Elige proveedor de IA:
   - **DeepSeek**: Gratuito, preconfigurado
   - **OpenAI**: Premium, requiere API key
   - **Otros**: Anthropic, Google disponibles
3. Configura prompts y contexto
4. Conecta base de datos externa (opcional)

### **📚 Gestionar Base de Conocimiento (RAG)**
```bash
# Subir documentos vía API
curl -X POST http://localhost:3000/api/rag/process-document \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Manual de Usuario",
    "content": "Contenido del documento...",
    "chatbotId": "tu-chatbot-id",
    "category": "manual"
  }'

# Realizar consultas
curl -X POST http://localhost:3000/api/rag/simple-query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "¿Cómo resetear contraseña?",
    "chatbotId": "tu-chatbot-id"
  }'
```

### **📱 Configurar Notificaciones**
```bash
# Crear plantilla
curl -X POST http://localhost:3000/api/notification-templates \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Bienvenida",
    "content": "¡Hola {{customer_name}}! Bienvenido.",
    "category": "WELCOME",
    "variables": [{"name": "customer_name", "required": true}]
  }'

# Enviar notificación
curl -X POST http://localhost:3000/api/notifications/instant-send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "title": "Test",
    "message": "Mensaje de prueba"
  }'
```

---

## 📊 **API Endpoints Principales**

### **🏢 Organizaciones**
- `GET /api/organizations` - Listar organizaciones
- `POST /api/organizations` - Crear organización
- `PUT /api/organizations/:id` - Actualizar organización

### **🤖 Chatbots**
- `GET /api/chatbots` - Listar chatbots
- `POST /api/chatbots` - Crear chatbot
- `PUT /api/chatbots/:id` - Actualizar chatbot
- `GET /api/chatbots/:id/stats` - Estadísticas del chatbot

### **📚 RAG (Knowledge Base)**
- `POST /api/rag/process-document` - Procesar documento
- `POST /api/rag/simple-query` - Consulta semántica
- `GET /api/rag/knowledge-bases/:chatbotId` - Listar documentos
- `GET /api/rag/stats/:chatbotId` - Estadísticas RAG

### **📱 Notificaciones**
- `GET /api/notification-templates` - Listar plantillas
- `POST /api/notification-templates` - Crear plantilla
- `POST /api/notifications/instant-send` - Enviar notificación
- `GET /api/notification-templates/cron-config` - Configuración cron

### **🗄️ Base de Datos Externa**
- `GET /api/external-db/status/:chatbotId` - Estado de conexión
- `POST /api/external-db/test-query/:chatbotId` - Consulta de prueba
- `GET /api/database-config/diagnostic/:chatbotId` - Diagnóstico

---

## 🧪 **Testing del Sistema**

### **Prueba Integral Completa**
```bash
# Ejecutar test de todas las funcionalidades
node test-saas-funciones-disponibles.js
```

Este test verifica:
- ✅ Sistema SaaS core
- ✅ Funcionalidad RAG
- ✅ Sistema de notificaciones
- ✅ Base de datos externa
- ✅ Health checks

### **Health Check Manual**
```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/saas/test
```

---

## 🔧 **Configuración Avanzada**

### **🔗 Base de Datos Externa**
```javascript
// Configuración via API
const dbConfig = {
  name: "Mi Base de Datos",
  type: "mysql", // mysql, postgresql, sqlite
  host: "localhost",
  port: 3306,
  username: "user",
  password: "pass",
  database: "mi_db",
  tables: {
    products: {
      columns: {
        id: { type: "int", primaryKey: true },
        name: { type: "varchar" },
        price: { type: "decimal" }
      }
    }
  }
};
```

### **🧠 Modelos de IA Soportados**
- **DeepSeek**: `deepseek-chat`, `deepseek-coder`, `deepseek-v2`
- **OpenAI**: `gpt-3.5-turbo`, `gpt-4`, `gpt-4-turbo`, `gpt-4o`
- **Anthropic**: `claude-3-opus`, `claude-3-sonnet`, `claude-3-haiku`
- **Google**: `gemini-pro`, `gemini-1.5-pro`, `gemini-1.5-flash`

---

## 📈 **Monitoreo y Métricas**

### **Logs del Sistema**
```bash
# Ver logs en tiempo real
npm run start:dev | tail -f

# Logs específicos
grep "ERROR" logs/application.log
grep "RAG" logs/application.log
```

### **Métricas Disponibles**
- 📊 **Conversaciones totales** por chatbot
- 💬 **Mensajes procesados** por día
- 🔍 **Consultas RAG** y tiempo de respuesta
- 📱 **Notificaciones enviadas** y tasa de apertura
- 🗄️ **Consultas BD externa** y rendimiento

---

## 🚀 **Despliegue en Producción**

### **Docker**
```bash
# Construir imagen
docker build -t chatbot-saas .

# Ejecutar con docker-compose
docker-compose up -d
```

### **Variables de Entorno Producción**
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-host:5432/db
REDIS_URL=redis://redis-host:6379
WHATSAPP_API_URL=https://your-whatsapp-api.com
```

### **Nginx Configuración**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location / {
        proxy_pass http://localhost:5173;
        proxy_set_header Host $host;
    }
}
```

---

## 🤝 **Contribuir**

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📝 **Documentación Técnica**

- 📋 [Migración a PostgreSQL](./MIGRACION_A_POSTGRES.md)
- 🤖 [Configuración IA Flexible](./MODELO_IA_FLEXIBLE_SAAS.md)
- 🧪 [Reporte de Pruebas](./REPORTE_PRUEBA_INTEGRAL_SAAS.md)
- 📚 [Documentación Swagger](./SWAGGER_DOCUMENTATION_IMPROVEMENTS.md)

---

## ⚠️ **Troubleshooting**

### **Problemas Comunes**

**Error de conexión PostgreSQL:**
```bash
# Verificar servicio PostgreSQL
systemctl status postgresql

# Verificar conexión
psql -h localhost -U username -d chatbot_backend
```

**Error en RAG:**
```bash
# Verificar documentos procesados
curl http://localhost:3000/api/rag/stats/your-chatbot-id
```

**WhatsApp no envía:**
```bash
# Verificar configuración
curl http://localhost:3000/api/health
# Revisar variables WHATSAPP_* en .env
```

---

## 📄 **Licencia**

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

---

## 📞 **Soporte**

Para soporte técnico o preguntas:
- 📧 Email: soporte@tu-empresa.com
- 🐛 Issues: [GitHub Issues](https://github.com/tu-usuario/repo/issues)
- 📖 Documentación: [Wiki del proyecto](https://github.com/tu-usuario/repo/wiki)

---

**🎉 ¡Sistema SaaS de Chatbots listo para producción!**

*Desarrollado con ❤️ usando NestJS, PostgreSQL y las mejores prácticas de desarrollo* 