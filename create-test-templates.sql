-- SCRIPT RÁPIDO PARA CREAR PLANTILLAS DE PRUEBA
-- Este script crea plantillas directamente sin verificar columnas

-- Insertar 3 plantillas básicas de prueba
INSERT INTO notification_templates (
    title, 
    content, 
    category, 
    audience, 
    is_active, 
    cron_enabled, 
    created_by,
    created_at, 
    updated_at
) VALUES

-- 1. Plantilla de Bienvenida
('👋 Bienvenida', 
'¡Hola! Bienvenido a nuestro servicio. ¿En qué podemos ayudarte hoy?', 
'welcome', 
'new_users', 
true, 
false,
'system',
NOW(), 
NOW()),

-- 2. Plantilla de Promoción
('🎉 Oferta Especial', 
'¡Tenemos una oferta especial solo para ti! 50% de descuento en productos seleccionados. ¡No te lo pierdas!', 
'promotion', 
'all', 
true, 
false,
'system',
NOW(), 
NOW()),

-- 3. Plantilla de Recordatorio
('⏰ Recordatorio', 
'Hola, este es un recordatorio amigable sobre tu consulta pendiente. ¿Podemos ayudarte en algo más?', 
'reminder', 
'active_users', 
true, 
false,
'system',
NOW(), 
NOW());

-- Verificar plantillas insertadas
SELECT 
    id,
    title,
    category,
    audience,
    is_active,
    created_by
FROM notification_templates 
WHERE created_by = 'system'
ORDER BY created_at DESC; 