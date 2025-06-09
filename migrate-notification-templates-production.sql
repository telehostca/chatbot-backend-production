-- =====================================================
-- MIGRACIÓN COMPLETA: NOTIFICATION TEMPLATES PARA PRODUCCIÓN
-- =====================================================

BEGIN;

-- 1. AGREGAR COLUMNAS FALTANTES EN notification_templates
-- =====================================================

-- Verificar si la columna 'audience' existe, si no, agregarla
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notification_templates' 
                   AND column_name = 'audience') THEN
        ALTER TABLE notification_templates ADD COLUMN audience VARCHAR(50) DEFAULT 'all';
    END IF;
END $$;

-- Verificar si la columna 'cron_enabled' existe, si no, agregarla
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notification_templates' 
                   AND column_name = 'cron_enabled') THEN
        ALTER TABLE notification_templates ADD COLUMN cron_enabled BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Verificar si la columna 'cron_expression' existe, si no, agregarla
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notification_templates' 
                   AND column_name = 'cron_expression') THEN
        ALTER TABLE notification_templates ADD COLUMN cron_expression VARCHAR(100);
    END IF;
END $$;

-- Verificar si la columna 'next_execution' existe, si no, agregarla
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notification_templates' 
                   AND column_name = 'next_execution') THEN
        ALTER TABLE notification_templates ADD COLUMN next_execution TIMESTAMP;
    END IF;
END $$;

-- Verificar si la columna 'last_execution' existe, si no, agregarla
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notification_templates' 
                   AND column_name = 'last_execution') THEN
        ALTER TABLE notification_templates ADD COLUMN last_execution TIMESTAMP;
    END IF;
END $$;

-- Verificar si la columna 'sent_count' existe, si no, agregarla
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notification_templates' 
                   AND column_name = 'sent_count') THEN
        ALTER TABLE notification_templates ADD COLUMN sent_count INTEGER DEFAULT 0;
    END IF;
END $$;

-- Verificar si la columna 'open_rate' existe, si no, agregarla
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notification_templates' 
                   AND column_name = 'open_rate') THEN
        ALTER TABLE notification_templates ADD COLUMN open_rate DECIMAL(3,2) DEFAULT 0;
    END IF;
END $$;

-- Verificar si la columna 'click_rate' existe, si no, agregarla
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notification_templates' 
                   AND column_name = 'click_rate') THEN
        ALTER TABLE notification_templates ADD COLUMN click_rate DECIMAL(3,2) DEFAULT 0;
    END IF;
END $$;

-- Verificar si la columna 'variables' existe, si no, agregarla
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notification_templates' 
                   AND column_name = 'variables') THEN
        ALTER TABLE notification_templates ADD COLUMN variables JSON;
    END IF;
END $$;

-- Verificar si la columna 'chatbot_id' existe, si no, agregarla
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notification_templates' 
                   AND column_name = 'chatbot_id') THEN
        ALTER TABLE notification_templates ADD COLUMN chatbot_id UUID;
    END IF;
END $$;

-- Verificar si la columna 'created_by' existe, si no, agregarla
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notification_templates' 
                   AND column_name = 'created_by') THEN
        ALTER TABLE notification_templates ADD COLUMN created_by VARCHAR(100);
    END IF;
END $$;

-- 2. INSERTAR PLANTILLAS PREDEFINIDAS
-- =====================================================

-- Limpiar templates existentes si es necesario (opcional)
-- DELETE FROM notification_templates WHERE created_by = 'system';

INSERT INTO notification_templates (
    title, 
    content, 
    category, 
    audience, 
    is_active, 
    cron_enabled, 
    cron_expression, 
    next_execution,
    variables,
    created_by,
    created_at, 
    updated_at
) VALUES

-- 1. DESCUENTOS Y PROMOCIONES
('🔥 Descuento Flash 30% OFF', 
'¡Hola {{nombre}}! 🎉 Te tenemos una oferta ESPECIAL del 30% de descuento en todos nuestros productos. ¡Solo por hoy! 

🛒 Usa el código: FLASH30
⏰ Válido hasta las 11:59 PM
🚀 Aprovecha esta oportunidad única

¿Te interesa conocer más sobre nuestros productos?', 
'discount', 
'active_users', 
true, 
true, 
'0 10 * * 1', -- Lunes a las 10:00 AM
NOW() + INTERVAL '1 hour',
'{"nombre": "string", "producto": "string", "descuento": "number"}',
'system',
NOW(), 
NOW()),

('💎 Black Friday - 50% Descuento', 
'🖤 ¡BLACK FRIDAY ESTÁ AQUÍ! 🖤

{{nombre}}, no te pierdas la oportunidad del año:
✨ 50% de descuento en TODA la tienda
🎁 Envío gratis en compras +$500
⚡ Stock limitado - ¡Corre!

🛍️ ¿Qué producto te interesa más?
Escribe "CATALOGO" para ver todas las ofertas.', 
'promotion', 
'all', 
false, 
true, 
'0 8 25 11 *', -- 25 de Noviembre a las 8:00 AM
'2024-11-25 08:00:00',
'{"nombre": "string", "descuento": "number"}',
'system',
NOW(), 
NOW()),

-- 2. BIENVENIDA Y ONBOARDING
('👋 Bienvenido a nuestra familia', 
'¡Hola {{nombre}}! 👋

Te damos la bienvenida a {{empresa}}. Estamos emocionados de tenerte con nosotros.

🎯 Aquí tienes todo lo que necesitas saber:
• Cómo hacer tu primera compra
• Nuestros productos más populares  
• Formas de contactarnos

¿Te gustaría que te enviemos nuestro catálogo completo?', 
'welcome', 
'new_users', 
true, 
true, 
'0 9 * * *', -- Diario a las 9:00 AM
NOW() + INTERVAL '1 hour',
'{"nombre": "string", "empresa": "string"}',
'system',
NOW(), 
NOW()),

-- 3. RECORDATORIOS Y SEGUIMIENTO
('🛒 Carrito Abandonado - ¡No lo olvides!', 
'Hola {{nombre}} 👋

Notamos que dejaste algunos productos increíbles en tu carrito:
{{productos_carrito}}

💡 ¿Necesitas ayuda para completar tu compra?
🎁 Además, tienes un 10% de descuento disponible

Escribe "COMPLETAR" y te ayudamos inmediatamente.', 
'reminder', 
'cart_abandoners', 
true, 
true, 
'0 */4 * * *', -- Cada 4 horas
NOW() + INTERVAL '4 hours',
'{"nombre": "string", "productos_carrito": "string"}',
'system',
NOW(), 
NOW()),

('📞 Te extrañamos - Vuelve con nosotros', 
'¡Hola {{nombre}}! 😊

Hace tiempo que no sabemos de ti y te extrañamos mucho.

🎁 Como gesto especial, te ofrecemos:
• 20% de descuento en tu próxima compra
• Envío gratis
• Atención personalizada

¿Qué te parece si conversamos? Responde este mensaje.', 
'followup', 
'inactive_users', 
true, 
true, 
'0 15 * * 3', -- Miércoles a las 3:00 PM
NOW() + INTERVAL '2 days',
'{"nombre": "string", "dias_inactivo": "number"}',
'system',
NOW(), 
NOW()),

-- 4. EVENTOS Y FECHAS ESPECIALES
('❤️ Día de las Madres - Regalos Especiales', 
'¡Feliz Día de las Madres! ❤️

{{nombre}}, celebra a mamá con nuestros regalos especiales:

🌹 Arreglos florales desde $299
💄 Sets de belleza con 40% descuento  
👗 Ropa elegante para ella
🍰 Desayunos sorpresa a domicilio

¿Qué le gustaría regalar a su mamá?', 
'promotion', 
'all', 
false, 
true, 
'0 8 * 5 0', -- Segundo domingo de Mayo a las 8:00 AM
'2024-05-12 08:00:00',
'{"nombre": "string", "fecha_evento": "string"}',
'system',
NOW(), 
NOW()),

-- 5. NOTIFICACIONES DE SERVICIO
('🔧 Mantenimiento Programado del Sistema', 
'Estimado {{nombre}},

Te informamos que realizaremos mantenimiento programado:
📅 Fecha: {{fecha_mantenimiento}}
⏰ Horario: {{horario_mantenimiento}}
⌛ Duración: Aproximadamente 2 horas

Durante este tiempo podrías experimentar interrupciones menores.
Trabajamos para mejorar tu experiencia.

¿Tienes alguna pregunta?', 
'reminder', 
'all_active', 
false, 
false, 
'',
NULL,
'{"nombre": "string", "fecha_mantenimiento": "string", "horario_mantenimiento": "string"}',
'system',
NOW(), 
NOW()),

-- 6. ENCUESTAS Y FEEDBACK
('⭐ ¿Cómo fue tu experiencia con nosotros?', 
'Hola {{nombre}} 👋

Queremos conocer tu opinión sobre tu reciente compra.

⭐ Por favor califica tu experiencia:
• Excelente (5⭐)
• Muy buena (4⭐)  
• Buena (3⭐)
• Regular (2⭐)
• Mala (1⭐)

Tu feedback nos ayuda a mejorar cada día.
¡Gracias por confiar en nosotros!', 
'followup', 
'recent_buyers', 
true, 
true, 
'0 18 * * *', -- Diario a las 6:00 PM
NOW() + INTERVAL '6 hours',
'{"nombre": "string", "producto_comprado": "string"}',
'system',
NOW(), 
NOW()),

-- 7. OFERTAS ESTACIONALES
('🎄 Navidad 2024 - Ofertas Mágicas', 
'🎅 ¡Ho Ho Ho! {{nombre}}

La magia de la Navidad llegó con ofertas increíbles:

🎁 Regalos desde $99
🎄 Decoración navideña -40%
🍪 Canastas navideñas personalizadas
🎉 Fiestas corporativas todo incluido

🎯 ¿Para quién estás buscando el regalo perfecto?
Escribe "NAVIDAD" y te ayudamos a elegir.', 
'promotion', 
'all', 
false, 
true, 
'0 9 1 12 *', -- 1 de Diciembre a las 9:00 AM
'2024-12-01 09:00:00',
'{"nombre": "string", "mes": "string"}',
'system',
NOW(), 
NOW());

-- 3. CREAR TABLA cron_config SI NO EXISTE
-- =====================================================

CREATE TABLE IF NOT EXISTS cron_config (
    id SERIAL PRIMARY KEY,
    enabled BOOLEAN DEFAULT true,
    max_notifications_per_hour INTEGER DEFAULT 100,
    retry_attempts INTEGER DEFAULT 3,
    batch_size INTEGER DEFAULT 50,
    timezone VARCHAR(50) DEFAULT 'America/Mexico_City',
    allowed_time_ranges JSON DEFAULT '{"start": "08:00", "end": "20:00"}',
    blocked_days JSON DEFAULT '[]',
    last_run_at TIMESTAMP,
    total_notifications_sent BIGINT DEFAULT 0,
    total_failures BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Insertar configuración inicial si no existe
INSERT INTO cron_config (
    enabled,
    max_notifications_per_hour,
    retry_attempts,
    batch_size,
    timezone,
    allowed_time_ranges,
    blocked_days
) VALUES (
    true,
    100,
    3,
    50,
    'America/Mexico_City',
    '{"start": "08:00", "end": "20:00"}',
    '[]'
) ON CONFLICT DO NOTHING;

COMMIT;

-- 4. VERIFICACIÓN FINAL
-- =====================================================

SELECT 
    title,
    category,
    audience,
    cron_expression,
    is_active,
    cron_enabled,
    created_by
FROM notification_templates 
WHERE created_by = 'system'
ORDER BY created_at DESC;

SELECT 'Migración completada exitosamente. ' || COUNT(*) || ' templates insertados.' as resultado
FROM notification_templates 
WHERE created_by = 'system'; 