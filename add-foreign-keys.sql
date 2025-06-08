-- 🔗 SCRIPT PARA AGREGAR FOREIGN KEYS
-- Ejecutar DESPUÉS de crear todas las tablas

-- ===============================
-- FOREIGN KEYS PRINCIPALES
-- ===============================

-- Foreign Keys para search_history
ALTER TABLE "search_history" 
ADD CONSTRAINT "FK_search_history_session_id" 
FOREIGN KEY ("session_id") REFERENCES "persistent_sessions" ("id") 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys para shopping_carts
ALTER TABLE "shopping_carts" 
ADD CONSTRAINT "FK_shopping_carts_session_id" 
FOREIGN KEY ("session_id") REFERENCES "chat_sessions" ("id") 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys para chat_messages
ALTER TABLE "chat_messages" 
ADD CONSTRAINT "FK_chat_messages_chat_session_id" 
FOREIGN KEY ("chat_session_id") REFERENCES "chat_sessions" ("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chat_messages" 
ADD CONSTRAINT "FK_chat_messages_session_id" 
FOREIGN KEY ("session_id") REFERENCES "persistent_sessions" ("id") 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys para admin_messages
ALTER TABLE "admin_messages" 
ADD CONSTRAINT "FK_admin_messages_conversationId" 
FOREIGN KEY ("conversationId") REFERENCES "conversations" ("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign Keys para conversations
ALTER TABLE "conversations" 
ADD CONSTRAINT "FK_conversations_chatbotId" 
FOREIGN KEY ("chatbotId") REFERENCES "chatbots" ("id") 
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "conversations" 
ADD CONSTRAINT "FK_conversations_userId" 
FOREIGN KEY ("userId") REFERENCES "users" ("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign Keys para message_templates
ALTER TABLE "message_templates" 
ADD CONSTRAINT "FK_message_templates_chatbot_id" 
FOREIGN KEY ("chatbot_id") REFERENCES "chatbots" ("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign Keys para rag_document_chunks
ALTER TABLE "rag_document_chunks" 
ADD CONSTRAINT "FK_rag_document_chunks_knowledgeBaseId" 
FOREIGN KEY ("knowledgeBaseId") REFERENCES "rag_knowledge_base" ("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign Keys para rag_knowledge_base
ALTER TABLE "rag_knowledge_base" 
ADD CONSTRAINT "FK_rag_knowledge_base_chatbotId" 
FOREIGN KEY ("chatbotId") REFERENCES "chatbot_instances" ("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign Keys para chatbot_instances
ALTER TABLE "chatbot_instances" 
ADD CONSTRAINT "FK_chatbot_instances_organizationId" 
FOREIGN KEY ("organizationId") REFERENCES "organizations" ("id") 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign Keys para notification_templates
ALTER TABLE "notification_templates" 
ADD CONSTRAINT "FK_notification_templates_chatbotId" 
FOREIGN KEY ("chatbotId") REFERENCES "chatbot_instances" ("id") 
ON DELETE SET NULL ON UPDATE CASCADE;

-- Foreign Keys para user_subscriptions
ALTER TABLE "user_subscriptions" 
ADD CONSTRAINT "FK_user_subscriptions_userId" 
FOREIGN KEY ("userId") REFERENCES "users" ("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_subscriptions" 
ADD CONSTRAINT "FK_user_subscriptions_planId" 
FOREIGN KEY ("planId") REFERENCES "user_plans" ("id") 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign Keys para user_usage
ALTER TABLE "user_usage" 
ADD CONSTRAINT "FK_user_usage_userId" 
FOREIGN KEY ("userId") REFERENCES "users" ("id") 
ON DELETE CASCADE ON UPDATE CASCADE;

-- Foreign Keys para payments
ALTER TABLE "payments" 
ADD CONSTRAINT "FK_payments_orderId" 
FOREIGN KEY ("orderId") REFERENCES "orders" ("orderNumber") 
ON DELETE RESTRICT ON UPDATE CASCADE;

-- Verificar que todas las foreign keys se crearon correctamente
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema='public'
ORDER BY tc.table_name, kcu.column_name; 