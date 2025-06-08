-- Script para arreglar los valores nulos en user_plans
-- Paso 1: Actualizar los valores nulos con nombres por defecto
UPDATE user_plans SET name = 'Plan Básico' WHERE name IS NULL OR name = '';

-- Paso 2: Verificar que no quedan valores nulos
SELECT COUNT(*) as nulos_restantes FROM user_plans WHERE name IS NULL OR name = '';

-- Paso 3: Si no hay registros, crear los planes por defecto
INSERT INTO user_plans (id, name, description, price, "billingCycle", features, "maxChatbots", "maxMessages", "isActive", "createdAt", "updatedAt") 
VALUES 
    (uuid_generate_v4(), 'Plan Gratuito', 'Plan básico gratuito', 0.00, 'monthly', '{"chatbots": 1, "messages": 1000}', 1, 1000, true, NOW(), NOW()),
    (uuid_generate_v4(), 'Plan Pro', 'Plan profesional', 29.99, 'monthly', '{"chatbots": 5, "messages": 10000}', 5, 10000, true, NOW(), NOW()),
    (uuid_generate_v4(), 'Plan Enterprise', 'Plan empresarial', 99.99, 'monthly', '{"chatbots": 50, "messages": 100000}', 50, 100000, true, NOW(), NOW())
ON CONFLICT DO NOTHING;

-- Paso 4: Mostrar todos los planes
SELECT * FROM user_plans ORDER BY price ASC; 