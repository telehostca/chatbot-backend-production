import { DataSource } from 'typeorm';
import { join } from 'path';
import * as fs from 'fs';
import * as readline from 'readline';

// Entidades para asegurar que tenemos las mismas estructuras
import { ChatSession } from '../chat/entities/chat-session.entity';
import { ChatMessage } from '../chat/entities/message.entity';
import { MessageTemplate } from '../chat/entities/message-template.entity';
import { User } from '../users/entities/user.entity';
import { Chatbot } from '../admin/entities/chatbot.entity';
import { Conversation } from '../admin/entities/conversation.entity';
import { AdminMessage } from '../admin/entities/message.entity';
import { Promotion } from '../promotions/entities/promotion.entity';
import { Discount } from '../promotions/entities/discount.entity';
import { PersistentSession } from '../chat/entities/persistent-session.entity';
import { SearchHistory } from '../chat/entities/search-history.entity';
import { ShoppingCart } from '../chat/entities/shopping-cart.entity';
import { NotificationEntity } from '../notifications/entities/notification.entity';
import { NotificationTemplate } from '../notifications/entities/notification-template.entity';
import { CronConfig } from '../notifications/entities/cron-config.entity';
import { Organization } from '../admin/entities/organization.entity';
import { ChatbotInstance } from '../admin/entities/chatbot-instance.entity';
import { KnowledgeBase } from '../rag/entities/knowledge-base.entity';
import { DocumentChunk } from '../rag/entities/document-chunk.entity';

// Configuración y variables de entorno
require('dotenv').config({ path: join(__dirname, '../../.env') });
require('dotenv').config({ path: join(__dirname, '../../env.local') });

// Solicitar confirmación del usuario antes de continuar
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Lista de entidades para migrar, en orden de dependencia
const entities = [
  User,
  Organization,
  Chatbot,
  ChatbotInstance,
  MessageTemplate,
  Promotion,
  Discount,
  PersistentSession,
  ChatSession,
  ChatMessage,
  Conversation,
  AdminMessage,
  SearchHistory,
  ShoppingCart,
  NotificationEntity,
  NotificationTemplate,
  CronConfig,
  KnowledgeBase,
  DocumentChunk
];

// Función principal de migración
async function migrateData() {
  console.log('🔄 Iniciando migración de SQLite a PostgreSQL');
  
  // Validar que ambas bases de datos estén configuradas
  if (!process.env.DB_TYPE || process.env.DB_TYPE !== 'postgres') {
    console.error('❌ Error: La base de datos de destino debe ser PostgreSQL. Verifica tu archivo .env');
    process.exit(1);
  }

  // Pedir la ruta del archivo SQLite al usuario
  console.log('📋 Por favor, proporciona la información necesaria para la migración:');
  
  rl.question('📁 Ruta completa al archivo SQLite (ej: /ruta/a/chatbot.sqlite): ', async (sqliteDbPath) => {
    if (!fs.existsSync(sqliteDbPath)) {
      console.error(`❌ Error: El archivo SQLite no existe en la ruta: ${sqliteDbPath}`);
      rl.close();
      process.exit(1);
    }

    // Configurar conexión SQLite (origen)
    const sqliteDataSource = new DataSource({
      type: 'sqlite',
      database: sqliteDbPath,
      entities,
      synchronize: false,
      logging: false
    });

    // Configurar conexión PostgreSQL (destino)
    const postgresDataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'chatbot',
      entities,
      synchronize: false,
      logging: ['error'],
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });

    try {
      // Inicializar conexiones
      console.log('🔌 Conectando a las bases de datos...');
      await sqliteDataSource.initialize();
      console.log('✅ Conexión a SQLite establecida');
      
      await postgresDataSource.initialize();
      console.log('✅ Conexión a PostgreSQL establecida');

      // Preguntar si se debe limpiar la base de datos PostgreSQL primero
      rl.question('⚠️ ¿Deseas eliminar todos los datos existentes en PostgreSQL antes de migrar? (si/no): ', async (shouldClean) => {
        if (shouldClean.toLowerCase() === 'si' || shouldClean.toLowerCase() === 'sí' || shouldClean.toLowerCase() === 's') {
          console.log('🧹 Limpiando base de datos PostgreSQL...');
          
          // Deshabilitar restricciones de clave foránea temporalmente
          await postgresDataSource.query('SET session_replication_role = replica;');
          
          // Eliminar datos de todas las tablas en orden inverso (para respetar claves foráneas)
          for (const entity of [...entities].reverse()) {
            const repository = postgresDataSource.getRepository(entity);
            const tableName = repository.metadata.tableName;
            await postgresDataSource.query(`TRUNCATE TABLE "${tableName}" CASCADE;`);
            console.log(`🗑️ Tabla "${tableName}" limpiada`);
          }
          
          // Restablecer restricciones
          await postgresDataSource.query('SET session_replication_role = DEFAULT;');
        }

        // Iniciar migración de datos entidad por entidad
        console.log('🚀 Iniciando migración de datos...');
        
        // Array para almacenar estadísticas
        const stats = [];
        
        for (const entity of entities) {
          const entityName = entity.name;
          console.log(`\n📤 Migrando ${entityName}...`);
          
          // Obtener repositorios
          const sourceRepo = sqliteDataSource.getRepository(entity);
          const targetRepo = postgresDataSource.getRepository(entity);
          
          // Leer todos los registros de la fuente
          console.log(`📊 Leyendo registros de ${entityName} desde SQLite...`);
          const items = await sourceRepo.find();
          console.log(`ℹ️ ${items.length} registros encontrados`);
          
          if (items.length > 0) {
            try {
              // Insertar en lotes para mejor rendimiento
              const batchSize = 100;
              let processed = 0;
              
              for (let i = 0; i < items.length; i += batchSize) {
                const batch = items.slice(i, i + batchSize);
                await targetRepo.save(batch);
                processed += batch.length;
                console.log(`✅ Procesados ${processed}/${items.length} registros`);
              }
              
              console.log(`✅ Migración completada para ${entityName}`);
              stats.push({ entity: entityName, count: items.length, status: 'Éxito' });
            } catch (error) {
              console.error(`❌ Error migrando ${entityName}: ${error.message}`);
              stats.push({ entity: entityName, count: items.length, status: 'Error', error: error.message });
            }
          } else {
            console.log(`ℹ️ No hay datos para migrar en ${entityName}`);
            stats.push({ entity: entityName, count: 0, status: 'Sin datos' });
          }
        }
        
        // Mostrar resumen
        console.log('\n\n📋 RESUMEN DE MIGRACIÓN:');
        console.table(stats);
        
        // Cerrar conexiones
        await sqliteDataSource.destroy();
        await postgresDataSource.destroy();
        
        console.log('\n🎉 Migración completada! La base de datos PostgreSQL contiene ahora todos los datos de SQLite.');
        console.log('ℹ️ Recuerda configurar tu aplicación para usar PostgreSQL permanentemente.');
        
        rl.close();
      });
    } catch (error) {
      console.error('❌ Error durante la migración:', error);
      if (sqliteDataSource.isInitialized) await sqliteDataSource.destroy();
      if (postgresDataSource.isInitialized) await postgresDataSource.destroy();
      rl.close();
      process.exit(1);
    }
  });
}

// Iniciar el proceso
migrateData().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
}); 