-- =====================================================
-- PLANTILLAS PREDEFINIDAS PARA NOTIFICACIONES PROGRAMADAS
-- =====================================================

-- Insertar plantillas de notificaciones programadas predefinidas
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
NOW(), 
NOW());

-- =====================================================
-- CONFIGURACIÓN DE CRON (SI NO EXISTE)
-- =====================================================

INSERT INTO cron_config (
    enabled,
    max_notifications_per_hour,
    retry_attempts,
    batch_size,
    timezone,
    allowed_time_ranges,
    blocked_days,
    created_at,
    updated_at
) VALUES (
    true,
    100,
    3,
    50,
    'America/Mexico_City',
    '{"start": "08:00", "end": "20:00"}',
    '[]',
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

SELECT 
    title,
    category,
    cron_expression,
    is_active,
    cron_enabled
FROM notification_templates 
ORDER BY created_at DESC; 