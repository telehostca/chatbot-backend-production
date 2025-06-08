-- Fix user_plans description NULL values for production
-- This script handles the column contains null values error

-- Step 1: Add the description column as nullable first (if it doesn't exist)
ALTER TABLE "user_plans" ADD COLUMN IF NOT EXISTS "description" character varying;

-- Step 2: Update all NULL values with a default value
UPDATE "user_plans" SET "description" = 'Plan por defecto' WHERE "description" IS NULL;

-- Step 3: Set the column as NOT NULL now that all values are filled
ALTER TABLE "user_plans" ALTER COLUMN "description" SET NOT NULL;

-- Step 4: Verify the changes
SELECT 
    id, 
    name, 
    description, 
    created_at
FROM "user_plans" 
ORDER BY id;

-- Optional: Add some default plans if the table is empty
INSERT INTO "user_plans" (name, description, status, config) 
VALUES 
    ('Plan Básico', 'Plan básico con funcionalidades limitadas', 'active', '{"max_chatbots": 1, "max_messages": 1000}'),
    ('Plan Premium', 'Plan premium con todas las funcionalidades', 'active', '{"max_chatbots": 10, "max_messages": 10000}'),
    ('Plan Enterprise', 'Plan empresarial para grandes organizaciones', 'active', '{"max_chatbots": -1, "max_messages": -1}')
ON CONFLICT (name) DO NOTHING; 