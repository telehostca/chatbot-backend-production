UPDATE user_plans SET name = 'Plan Básico' WHERE name IS NULL OR name = '';
SELECT COUNT(*) as nulos_restantes FROM user_plans WHERE name IS NULL OR name = '';
