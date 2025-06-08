# 📍 Ubicación: Gestión de Intenciones SaaS

## 🎯 **¿DÓNDE puede el dueño del chatbot configurar las intenciones?**

### **📂 Archivo Frontend:**
```
📁 frontend/src/pages/Chatbots.jsx
📍 Línea 959-965: Integración del IntentManager
📍 Línea 149-463: Componente IntentManager completo
```

### **🖥️ URL de Acceso:**
```
http://localhost:3000/chatbots (desarrollo)
https://tu-dominio.com/chatbots (producción)
```

### **🗺️ Navegación en la UI:**

#### **Para CREAR nuevo chatbot:**
```
1. Dashboard Principal
2. Click "Chatbots" en el menú
3. Click "➕ Crear Nuevo Chatbot"
4. Scroll hasta la sección "🎯 Gestión de Intenciones (SaaS)"
```

#### **Para EDITAR chatbot existente:**
```
1. Dashboard Principal  
2. Click "Chatbots" en el menú
3. Buscar el chatbot en la lista
4. Click "✏️ Editar" en el chatbot deseado
5. Scroll hasta la sección "🎯 Gestión de Intenciones (SaaS)"
```

### **🎨 Identificación Visual:**

#### **Sección en el Formulario:**
```
🎯 Gestión de Intenciones (SaaS)
┌─────────────────────────────────────────────────┐
│ Fondo: Degradado morado-púrpura                 │
│ Borde: 2px sólido morado                        │
│ Ubicado DESPUÉS de: "Configuración de IA"       │
│ Ubicado ANTES de: "Prompts y Contexto"          │
└─────────────────────────────────────────────────┘
```

#### **Componentes Internos:**
```
📋 Header: "Intenciones Configuradas" + Botón "➕ Nueva Intención"
🃏 Tarjetas: Grid responsive de intenciones existentes
🖱️ Acciones: ✏️ Editar | 🗑️ Eliminar por intención
🪟 Modal: Editor completo de intenciones
```

### **🔧 Funcionalidades Disponibles:**

#### **✅ Crear Nueva Intención:**
- **Trigger:** Botón "➕ Nueva Intención"
- **Abre:** Modal `IntentEditor`
- **Campos:** Nombre, keywords, respuesta, ejemplos, estado

#### **✏️ Editar Intención:**
- **Trigger:** Botón "✏️" en cada tarjeta
- **Abre:** Modal `IntentEditor` con datos precargados
- **Permite:** Modificar todos los campos

#### **🗑️ Eliminar Intención:**
- **Trigger:** Botón "🗑️" en cada tarjeta
- **Confirmación:** Alert nativo del navegador
- **Efecto:** Eliminación inmediata del estado

#### **👁️ Ver Intenciones:**
- **Vista:** Grid responsivo de tarjetas
- **Info mostrada:** Nombre, estado, keywords (primeras 3), respuesta (truncada)
- **Estados:** Verde (Activa) / Gris (Inactiva)

### **💾 Persistencia de Datos:**

#### **Frontend (Estado temporal):**
```javascript
// Estado del formulario
form.intents = [
  {
    id: 1,
    name: 'horarios',
    keywords: ['horario', 'hora'],
    response: 'Respuesta personalizada...',
    examples: ['¿a qué hora abren?'],
    enabled: true
  }
]
```

#### **Backend (Guardado definitivo):**
```javascript
// En la base de datos
chatbotConfig: {
  intents: [...], // Se guarda al crear/actualizar chatbot
  systemPrompt: '...',
  // ... otras configuraciones
}
```

### **⚡ Flujo de Uso Rápido:**

```
1. Acceso: /chatbots → Crear/Editar
2. Scroll: Hasta "🎯 Gestión de Intenciones"  
3. Gestión: ➕ Crear | ✏️ Editar | 🗑️ Eliminar
4. Configuración: Modal con formulario completo
5. Guardado: Al hacer submit del chatbot
6. Procesamiento: IA usa intenciones automáticamente
```

### **📱 Características Técnicas:**

#### **Responsive Design:**
- 📱 Móvil: 1 columna
- 📽️ Tablet: 2 columnas  
- 🖥️ Desktop: 2 columnas

#### **Validaciones:**
- ✅ Nombre obligatorio
- ✅ Respuesta obligatoria
- ⚠️ Keywords opcionales
- ⚠️ Ejemplos opcionales

#### **UX/UI:**
- 🎨 Tema morado coherente
- ⚡ Transiciones suaves
- 🏷️ Tags para keywords
- 💬 Preview de respuestas

---

## 🎉 **RESUMEN EJECUTIVO**

**📍 UBICACIÓN EXACTA:**
- **URL:** `/chatbots` 
- **Formulario:** Crear/Editar Chatbot
- **Sección:** "🎯 Gestión de Intenciones (SaaS)"
- **Posición:** Entre IA Config y Prompts

**👤 ACCESO USUARIO:**
- Self-service completo
- Sin necesidad de código
- Interfaz visual intuitiva
- Cambios en tiempo real

**🔄 FLUJO SIMPLE:**
`Login → Chatbots → Crear/Editar → Gestionar Intenciones → Guardar` 