# 🤖 Chatbot WhatsApp SaaS Platform

Plataforma SaaS completa para chatbots de WhatsApp con IA, gestión multi-tenant y interfaz de administración.

## 🚀 Características Principales

- ✅ **Multi-tenant**: Soporte para múltiples organizaciones y chatbots
- ✅ **WhatsApp Integration**: Integración completa con Evolution API
- ✅ **AI Powered**: Respuestas inteligentes con Deepseek AI
- ✅ **RAG System**: Sistema de búsqueda y recuperación de documentos
- ✅ **Admin Interface**: Panel de administración completo
- ✅ **Session Management**: Gestión avanzada de conversaciones
- ✅ **Human Intervention**: Control manual de conversaciones
- ✅ **Database Config**: Configuración dinámica de bases de datos externas

## 🏗️ Estructura del Proyecto

```
backend/
├── src/                    # Código fuente principal (NestJS)
│   ├── admin/             # Panel de administración
│   ├── ai/                # Servicios de IA
│   ├── auth/              # Autenticación
│   ├── chat/              # Gestión de chat y sesiones
│   ├── chatbot/           # Lógica de chatbots
│   ├── notifications/     # Sistema de notificaciones
│   ├── rag/               # Sistema RAG
│   ├── whatsapp/          # Integración WhatsApp
│   └── database/          # Migraciones y configuración DB
├── frontend/              # Frontend (React)
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── pages/         # Páginas principales
│   │   └── services/      # Servicios API
│   └── dist/              # Build de producción
├── public/                # Archivos estáticos
├── package.json           # Dependencias del proyecto
├── docker-compose.yml     # Configuración Docker
├── Dockerfile             # Imagen Docker
└── README.md              # Este archivo
```

## ⚙️ Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/chatbot-backend-production.git
cd chatbot-backend-production
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
```bash
cp env.example .env
# Editar .env con tus configuraciones
```

### 4. Ejecutar con Docker
```bash
docker-compose up -d
```

### 5. Ejecutar en desarrollo
```bash
npm run start:dev
```

## 🌐 URLs de Acceso

- **API**: `http://localhost:3000/api`
- **Admin Panel**: `http://localhost:3000/admin`
- **Documentación**: `http://localhost:3000/api-docs`

## 🔧 Configuración

### Variables de Entorno Principales

```env
# Base de datos
DATABASE_URL=postgresql://usuario:password@host:5432/database

# Configuración IA
DEEPSEEK_API_KEY=tu_api_key_deepseek

# WhatsApp
EVOLUTION_API_URL=https://tu-evolution-api.com
EVOLUTION_API_KEY=tu_api_key

# JWT
JWT_SECRET=tu_jwt_secret
```

## 🚀 Deployment

### Producción con Docker
```bash
# Build de la imagen
docker build -t chatbot-saas .

# Ejecutar contenedor
docker run -d -p 3000:3000 --env-file .env chatbot-saas
```

### Con Docker Compose
```bash
docker-compose -f docker-compose.yml up -d
```

## 📋 API Endpoints Principales

### Chat Management
- `GET /api/chat/sessions` - Listar sesiones
- `GET /api/chat/sessions/:id/messages` - Mensajes de sesión
- `POST /api/chat/sessions/:id/pause-bot` - Pausar bot
- `POST /api/chat/sessions/:id/resume-bot` - Reanudar bot
- `POST /api/chat/sessions/:id/send-manual-message` - Enviar mensaje manual

### Admin Panel
- `GET /api/admin/multi-tenant/chatbots` - Gestión de chatbots
- `GET /api/admin/multi-tenant/organizations` - Gestión de organizaciones
- `GET /api/admin/multi-tenant/notifications` - Plantillas de notificaciones

### RAG System
- `POST /api/rag/upload-document/:chatbotId` - Subir documentos
- `POST /api/rag/simple-query` - Búsqueda en documentos

## 🔒 Seguridad

- Autenticación JWT
- Validación de datos con class-validator
- Sanitización de inputs
- Rate limiting
- CORS configurado

## 🛠️ Tecnologías Utilizadas

### Backend
- **NestJS** - Framework Node.js
- **TypeScript** - Tipado estático
- **TypeORM** - ORM para base de datos
- **PostgreSQL** - Base de datos principal
- **Redis** - Cache y sesiones

### Frontend
- **React** - Librería de UI
- **Tailwind CSS** - Framework CSS
- **Axios** - Cliente HTTP

### Servicios Externos
- **Evolution API** - WhatsApp Business API
- **Deepseek AI** - Servicio de IA
- **Docker** - Containerización

## 📚 Scripts Disponibles

```bash
# Desarrollo
npm run start:dev          # Servidor en modo desarrollo
npm run build             # Build de producción
npm run start:prod        # Servidor en modo producción

# Testing
npm run test              # Ejecutar tests
npm run test:e2e          # Tests end-to-end

# Utilidades
npm run lint              # Linter de código
npm run format            # Formatear código
```

## 🤝 Contribución

1. Fork del proyecto
2. Crear rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit de cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 📞 Soporte

Para soporte técnico o consultas:
- 📧 Email: support@tu-dominio.com
- 💬 WhatsApp: +1234567890
- 🐛 Issues: [GitHub Issues](https://github.com/tu-usuario/chatbot-backend-production/issues)

---

**Desarrollado con ❤️ para automatizar conversaciones de WhatsApp** 