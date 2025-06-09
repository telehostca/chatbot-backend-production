const { Client } = require('pg');

async function verifyAndCreateTables() {
  // Configuración de la base de datos local
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'saas_chatbots',
    user: 'postgres',
    password: 'mysecretpassword',
  });

  try {
    await client.connect();
    console.log('✅ Conectado a la base de datos');

    // Verificar qué tablas existen
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Tablas existentes:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Verificar si chat_messages existe
    const chatMessagesExists = tablesResult.rows.some(row => row.table_name === 'chat_messages');
    
    if (!chatMessagesExists) {
      console.log('\n❌ Tabla chat_messages NO existe. Creando...');
      
      // Crear la tabla chat_messages
      await client.query(`
        CREATE TABLE chat_messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          content TEXT NOT NULL,
          sender VARCHAR(255) NOT NULL,
          timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          chat_session_id UUID,
          session_id UUID,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      // Crear índices
      await client.query(`
        CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
      `);
      
      await client.query(`
        CREATE INDEX idx_chat_messages_timestamp ON chat_messages(timestamp);
      `);
      
      console.log('✅ Tabla chat_messages creada exitosamente');
    } else {
      console.log('\n✅ Tabla chat_messages ya existe');
      
      // Verificar estructura
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📋 Estructura de chat_messages:');
      columnsResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    }

    // Verificar persistent_sessions
    const persistentSessionsResult = await client.query(`
      SELECT COUNT(*) as count FROM persistent_sessions;
    `);
    
    console.log(`\n📊 Sesiones persistentes: ${persistentSessionsResult.rows[0].count}`);

    // Verificar chat_messages (si existe)
    if (chatMessagesExists) {
      const messagesResult = await client.query(`
        SELECT COUNT(*) as count FROM chat_messages;
      `);
      
      console.log(`📊 Mensajes de chat: ${messagesResult.rows[0].count}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

verifyAndCreateTables(); 