import * as fs from 'fs';
import * as path from 'path';
import * as sqlite3 from 'sqlite3';
import { Logger } from '@nestjs/common';

const logger = new Logger('DatabaseInitializer');

export async function initializeDatabase() {
  try {
    // Obtener la ruta de la base de datos desde las variables de entorno
    const dbPath = process.env.DB_DATABASE || 
                  process.env.TYPEORM_DATABASE || 
                  path.join(process.cwd(), 'database', 'chatbot.sqlite');
    
    // Asegurar que el directorio existe
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      logger.log(`Creating database directory: ${dbDir}`);
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // Verificar que podemos acceder al directorio
    try {
      fs.accessSync(dbDir, fs.constants.W_OK);
      logger.log(`Database directory ${dbDir} is writable`);
    } catch (error) {
      logger.error(`Database directory ${dbDir} is not writable!`, error);
      throw new Error(`Database directory ${dbDir} is not writable: ${error.message}`);
    }

    // Verificar si el archivo existe
    if (!fs.existsSync(dbPath)) {
      logger.log(`Database file does not exist, creating it: ${dbPath}`);
      // Crear un archivo vacío
      fs.closeSync(fs.openSync(dbPath, 'w'));
    }

    // Verificar permisos del archivo
    try {
      fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
      logger.log(`Database file ${dbPath} is readable and writable`);
    } catch (error) {
      logger.error(`Database file ${dbPath} is not accessible!`, error);
      throw new Error(`Database file ${dbPath} is not accessible: ${error.message}`);
    }

    // Inicializar la base de datos con SQLite directamente
    logger.log(`Initializing SQLite database at ${dbPath}`);
    return new Promise<void>((resolve, reject) => {
      // Verificar que sqlite3 está disponible
      logger.log(`SQLite3 version: ${sqlite3.VERSION}`);
      
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          logger.error(`Error opening database: ${err.message}`);
          return reject(err);
        }
        
        logger.log('SQLite database opened successfully');
        
        // Ejecutar algunas operaciones básicas para verificar que funciona
        db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS _db_check (id INTEGER PRIMARY KEY);', (err) => {
          if (err) {
            logger.error(`Error initializing database: ${err.message}`);
            db.close();
            return reject(err);
          }
          
          logger.log('Database initialized successfully');
          db.close(() => {
            logger.log('Database connection closed');
            resolve();
          });
        });
      });
    });
  } catch (error) {
    logger.error(`Database initialization error: ${error.message}`, error.stack);
    throw error;
  }
} 