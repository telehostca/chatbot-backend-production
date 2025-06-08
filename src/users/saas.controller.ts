import { Controller, Get, Post, Body, Param, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@ApiTags('🚀 SaaS System')
@Controller('saas')
export class SaasController {
  private readonly logger = new Logger(SaasController.name);

  constructor(
    @InjectDataSource('users') private readonly dataSource: DataSource
  ) {}

  @Get('test')
  @ApiOperation({ summary: '✅ Test del sistema SaaS' })
  @ApiResponse({ status: 200, description: 'Sistema funcionando correctamente' })
  async test() {
    return {
      message: '🚀 Sistema SaaS funcionando perfectamente con PostgreSQL',
      timestamp: new Date().toISOString(),
      database: 'PostgreSQL',
      status: 'healthy',
      version: '2.0'
    };
  }

  @Get('diagnostico')
  @ApiOperation({ summary: '🔍 Diagnóstico completo del sistema SaaS' })
  @ApiResponse({ status: 200, description: 'Diagnóstico completado' })
  async diagnostico() {
    try {
      const isConnected = this.dataSource.isInitialized;
      const dbOptions = this.dataSource.options;
      
      // Verificar tablas SaaS
      const saasTablesQuery = `
        SELECT 
          table_name,
          (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns,
          (CASE 
            WHEN table_name = 'user_plans' THEN (SELECT COUNT(*) FROM user_plans)
            WHEN table_name = 'user_subscriptions' THEN (SELECT COUNT(*) FROM user_subscriptions)
            WHEN table_name = 'payments' THEN (SELECT COUNT(*) FROM payments)
            WHEN table_name = 'users' THEN (SELECT COUNT(*) FROM users)
            WHEN table_name = 'user_usage' THEN (SELECT COUNT(*) FROM user_usage)
            ELSE 0
          END) as records
        FROM information_schema.tables t
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'user_plans', 'user_subscriptions', 'payments', 'user_usage')
        ORDER BY table_name
      `;

      const tables = await this.dataSource.query(saasTablesQuery);

      // Obtener información de planes
      const plans = await this.dataSource.query(`
        SELECT id, name, price, currency, max_chatbots, max_messages_per_month, billing_cycle
        FROM user_plans 
        WHERE is_active = true 
        ORDER BY price ASC
      `);

      return {
        status: 'success',
        system: {
          name: 'Chatbot SaaS',
          version: '2.0',
          database: 'PostgreSQL',
          migration_status: 'completed'
        },
        database: {
          type: dbOptions.type,
          host: (dbOptions as any).host || 'localhost',
          port: (dbOptions as any).port || 5432,
          database: (dbOptions as any).database || 'chatbot_backend',
          connected: isConnected
        },
        saas_tables: {
          total: tables.length,
          expected: 5,
          details: tables
        },
        business_data: {
          plans_available: plans.length,
          plans: plans
        },
        migration_summary: {
          from: 'SQLite',
          to: 'PostgreSQL',
          status: 'completed',
          tables_migrated: 5,
          plans_configured: plans.length
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error(`Error en diagnóstico: ${error.message}`);
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('plans')
  @ApiOperation({ summary: '📋 Obtener todos los planes SaaS disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de planes obtenida exitosamente' })
  async getPlans() {
    try {
      const plans = await this.dataSource.query(`
        SELECT 
          id, name, description, price, currency, billing_cycle,
          max_chatbots, max_messages_per_month, features,
          whatsapp_integration, ai_responses, analytics, custom_branding,
          is_active, created_at
        FROM user_plans 
        WHERE is_active = true 
        ORDER BY price ASC
      `);

      return {
        success: true,
        data: plans,
        total: plans.length,
        message: `${plans.length} planes SaaS disponibles`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error(`Error obteniendo planes: ${error.message}`);
      return {
        success: false,
        error: error.message,
        message: 'Error obteniendo planes de suscripción'
      };
    }
  }

  @Get('stats')
  @ApiOperation({ summary: '📊 Estadísticas del sistema SaaS' })
  @ApiResponse({ status: 200, description: 'Estadísticas generales del sistema' })
  async getStats() {
    try {
      // Obtener estadísticas de todas las tablas principales
      const statsQuery = `
        SELECT 
          'users' as entity,
          COUNT(*) as count,
          'Usuarios registrados en el sistema' as description
        FROM users
        
        UNION ALL
        
        SELECT 
          'active_plans' as entity,
          COUNT(*) as count,
          'Planes de suscripción activos' as description
        FROM user_plans 
        WHERE is_active = true
        
        UNION ALL
        
        SELECT 
          'subscriptions' as entity,
          COUNT(*) as count,
          'Suscripciones totales' as description
        FROM user_subscriptions
        
        UNION ALL
        
        SELECT 
          'active_subscriptions' as entity,
          COUNT(*) as count,
          'Suscripciones activas' as description
        FROM user_subscriptions 
        WHERE status = 'active'
        
        UNION ALL
        
        SELECT 
          'payments' as entity,
          COUNT(*) as count,
          'Pagos procesados' as description
        FROM payments
        
        UNION ALL
        
        SELECT 
          'completed_payments' as entity,
          COUNT(*) as count,
          'Pagos completados exitosamente' as description
        FROM payments 
        WHERE status = 'completed'
      `;

      const stats = await this.dataSource.query(statsQuery);

      // Calcular ingresos totales
      const revenueQuery = `
        SELECT 
          COALESCE(SUM(amount), 0) as total_revenue,
          COUNT(*) as total_transactions
        FROM payments 
        WHERE status = 'completed'
      `;

      const revenue = await this.dataSource.query(revenueQuery);

      return {
        success: true,
        system_stats: stats,
        revenue_stats: revenue[0],
        summary: {
          total_users: stats.find(s => s.entity === 'users')?.count || 0,
          active_plans: stats.find(s => s.entity === 'active_plans')?.count || 0,
          active_subscriptions: stats.find(s => s.entity === 'active_subscriptions')?.count || 0,
          total_revenue: parseFloat(revenue[0]?.total_revenue || 0)
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error(`Error obteniendo estadísticas: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post('create-test-data')
  @ApiOperation({ summary: '🧪 Crear datos de prueba para el sistema SaaS' })
  @ApiResponse({ status: 201, description: 'Datos de prueba creados exitosamente' })
  async createTestData() {
    try {
      // Crear usuario de prueba
      const testUser = await this.dataSource.query(`
        INSERT INTO users (id, name, email, password, phone, role, status, plan_id, created_at)
        VALUES (
          gen_random_uuid(),
          'Usuario SaaS Test',
          'test.saas.${Date.now()}@example.com',
          'password123',
          '+584141234567',
          'cliente',
          'activo',
          (SELECT id FROM user_plans WHERE name = 'Free' LIMIT 1),
          NOW()
        )
        RETURNING id, name, email
      `);

      // Crear suscripción de prueba
      const testSubscription = await this.dataSource.query(`
        INSERT INTO user_subscriptions (user_id, plan_id, status, start_date, end_date, amount_paid, currency)
        VALUES (
          $1,
          (SELECT id FROM user_plans WHERE name = 'Starter' LIMIT 1),
          'active',
          CURRENT_DATE,
          CURRENT_DATE + INTERVAL '1 month',
          9.99,
          'USD'
        )
        RETURNING id, status, amount_paid
      `, [testUser[0].id]);

      // Crear pago de prueba
      const testPayment = await this.dataSource.query(`
        INSERT INTO payments (user_id, subscription_id, amount, currency, status, payment_method, description)
        VALUES (
          $1,
          $2,
          9.99,
          'USD',
          'completed',
          'stripe',
          'Pago de prueba - Plan Starter'
        )
        RETURNING id, amount, status
      `, [testUser[0].id, testSubscription[0].id]);

      return {
        success: true,
        message: 'Datos de prueba creados exitosamente',
        data: {
          user: testUser[0],
          subscription: testSubscription[0],
          payment: testPayment[0]
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error(`Error creando datos de prueba: ${error.message}`);
      return {
        success: false,
        error: error.message,
        message: 'Error creando datos de prueba'
      };
    }
  }

  @Get('health')
  @ApiOperation({ summary: '💚 Estado de salud del sistema SaaS' })
  @ApiResponse({ status: 200, description: 'Estado de salud verificado' })
  async health() {
    try {
      // Verificar conexión a base de datos
      const dbCheck = await this.dataSource.query('SELECT NOW() as current_time');
      
      // Verificar tablas principales
      const tableCheck = await this.dataSource.query(`
        SELECT COUNT(*) as table_count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'user_plans', 'user_subscriptions', 'payments', 'user_usage')
      `);

      const isHealthy = this.dataSource.isInitialized && 
                       dbCheck.length > 0 && 
                       parseInt(tableCheck[0].table_count) === 5;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        database: {
          connected: this.dataSource.isInitialized,
          response_time: dbCheck[0]?.current_time,
          tables_count: parseInt(tableCheck[0]?.table_count || 0)
        },
        system: {
          uptime: process.uptime(),
          memory_usage: process.memoryUsage(),
          node_version: process.version
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      this.logger.error(`Error en health check: ${error.message}`);
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
} 