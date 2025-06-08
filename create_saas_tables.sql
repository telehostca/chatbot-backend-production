-- ===== SISTEMA SAAS - ESTRUCTURA DE BASE DE DATOS =====
-- Crear todas las tablas necesarias para el sistema SaaS

-- 1. Tabla de planes de usuario
CREATE TABLE IF NOT EXISTS user_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime')),
  features JSONB,
  max_chatbots INTEGER DEFAULT 0,
  max_messages_per_month INTEGER DEFAULT 1000,
  whatsapp_integration BOOLEAN DEFAULT true,
  ai_responses BOOLEAN DEFAULT false,
  analytics BOOLEAN DEFAULT false,
  custom_branding BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Tabla de suscripciones de usuario
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cancelled', 'expired')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  trial_end_date DATE,
  is_trial BOOLEAN DEFAULT false,
  auto_renew BOOLEAN DEFAULT false,
  amount_paid DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  stripe_subscription_id VARCHAR(100),
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES user_plans(id) ON DELETE RESTRICT
);

-- 3. Tabla de pagos
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id INTEGER,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method VARCHAR(20) DEFAULT 'stripe' CHECK (payment_method IN ('stripe', 'paypal', 'bank_transfer', 'crypto')),
  external_payment_id VARCHAR(100),
  transaction_id VARCHAR(100),
  payment_details JSONB,
  description TEXT,
  invoice_url VARCHAR(500),
  receipt_url VARCHAR(500),
  failure_reason TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES user_subscriptions(id) ON DELETE SET NULL
);

-- 4. Tabla de uso/estadísticas de usuario
CREATE TABLE IF NOT EXISTS user_usage (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  messages_sent_this_month INTEGER DEFAULT 0,
  chatbots_created INTEGER DEFAULT 0,
  api_calls_this_month INTEGER DEFAULT 0,
  storage_used_mb INTEGER DEFAULT 0,
  usage_month DATE NOT NULL,
  feature_usage JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, usage_month)
);

-- 5. Actualizar tabla users para incluir campos SaaS
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS settings JSONB;

-- Agregar foreign key para plan_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_users_plan_id'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_plan_id 
        FOREIGN KEY (plan_id) REFERENCES user_plans(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_plan_id ON user_subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_external_id ON payments(external_payment_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON user_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_month ON user_usage(usage_month);

-- 7. Insertar planes por defecto
INSERT INTO user_plans (name, description, price, billing_cycle, max_chatbots, max_messages_per_month, features) VALUES
('Free', 'Plan gratuito con funcionalidades básicas', 0.00, 'monthly', 1, 100, '{"support": "email", "features": ["basic_chatbot", "100_messages"]}'),
('Starter', 'Plan básico para pequeños negocios', 9.99, 'monthly', 3, 1000, '{"support": "email", "features": ["whatsapp_integration", "1000_messages", "basic_analytics"]}'),
('Professional', 'Plan profesional con IA y analíticas', 29.99, 'monthly', 10, 5000, '{"support": "email+chat", "features": ["ai_responses", "advanced_analytics", "custom_branding", "5000_messages"]}'),
('Enterprise', 'Plan empresarial con funcionalidades completas', 99.99, 'monthly', 50, 25000, '{"support": "priority", "features": ["unlimited_features", "priority_support", "custom_integrations", "25000_messages"]}')
ON CONFLICT (name) DO NOTHING;

-- 8. Asignar plan gratuito a usuarios existentes
UPDATE users 
SET plan_id = (SELECT id FROM user_plans WHERE name = 'Free' LIMIT 1)
WHERE plan_id IS NULL;

-- 9. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 10. Crear triggers para updated_at
DROP TRIGGER IF EXISTS update_user_plans_updated_at ON user_plans;
CREATE TRIGGER update_user_plans_updated_at BEFORE UPDATE ON user_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_usage_updated_at ON user_usage;
CREATE TRIGGER update_user_usage_updated_at BEFORE UPDATE ON user_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Mostrar resumen de tablas creadas
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('user_plans', 'user_subscriptions', 'payments', 'user_usage', 'users')
ORDER BY tablename; 