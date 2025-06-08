import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'pg';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

interface ProductSearchResult {
  codigo: string;
  nombre: string;
  preciounidad: number;
  existenciaunidad: number;
  alicuotaiva: number;
  coddepto?: string;
}

interface ClienteData {
  codigocliente: string;
  nombre: string;
  rif: string;
  telefono1: string;
  direccion1?: string;
  status: string;
}

interface PedidoData {
  pedido: {
    codigocliente: string;
    rif: string;
    nombrecliente: string;
    telefonos: string;
    monedacodigo: string;
    moneda: string;
    tasa: number;
    subtotal: number;
    iva: number;
    total: number;
    fechaemision: string;
    hora: string;
    observaciones: string;
    idpago: string;
  };
  productos: Array<{
    codigo: string;
    nombre: string;
    cantidad: number;
    precio: number;
    iva: number;
    preciototal: number;
  }>;
}

@Injectable()
export class ValeryDbToolsService {
  private readonly logger = new Logger(ValeryDbToolsService.name);

  /**
   * HERRAMIENTA: run_query
   * Replica la funcionalidad de n8n para ejecutar consultas SQL
   */
  async runQuery(queryAlias: string, consulta: string, marca?: string, dbConfig?: DatabaseConfig): Promise<any> {
    try {
      this.logger.log(`🔍 Ejecutando consulta: ${queryAlias} para "${consulta}"`);
      
      if (!dbConfig) {
        throw new Error('Configuración de base de datos no proporcionada');
      }

      // Configuración mejorada para PostgreSQL
      const client = new Client({
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.username,
        password: dbConfig.password,
        ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 10000,
        query_timeout: 30000, // 30 segundos máximo por consulta
        statement_timeout: 30000,
        idle_in_transaction_session_timeout: 60000 // 1 minuto
      });

      let connected = false;
      let retries = 0;
      const maxRetries = 3;

      // Agregar reintentos de conexión
      while (!connected && retries < maxRetries) {
        try {
          await client.connect();
          connected = true;
          this.logger.log(`✅ Conexión establecida a ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
        } catch (connError) {
          retries++;
          this.logger.warn(`⚠️ Intento ${retries}/${maxRetries} fallido: ${connError.message}`);
          if (retries >= maxRetries) throw connError;
          await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos antes de reintentar
        }
      }

      let sqlQuery = '';
      let queryParams: any[] = [];

      // Determinar la consulta SQL según el alias
      switch (queryAlias) {
        case 'consulta_inventario_termino_simple':
          sqlQuery = `
            SELECT 
              codigo,
              nombre,
              preciounidad,
              existenciaunidad,
              alicuotaiva,
              coddepto
            FROM inventario 
            WHERE (nombre ILIKE $1 OR codigo ILIKE $1)
              AND status = 'G'
              AND existenciaunidad > 2
              ${marca ? 'AND nombre ILIKE $2' : ''}
            ORDER BY nombre
            LIMIT 5
          `;
          queryParams = [`%${consulta}%`];
          if (marca) queryParams.push(`%${marca}%`);
          break;

        case 'consulta_inventario_palabras_multiples':
          const palabras = consulta.split(' ').filter(p => p.length > 2);
          const whereConditions = palabras.map((_, index) => `nombre ILIKE $${index + 1}`).join(' AND ');
          sqlQuery = `
            SELECT 
              codigo,
              nombre,
              preciounidad,
              existenciaunidad,
              alicuotaiva,
              coddepto
            FROM inventario 
            WHERE ${whereConditions}
              AND status = 'G'
              AND existenciaunidad > 2
              ${marca ? `AND nombre ILIKE $${palabras.length + 1}` : ''}
            ORDER BY nombre
            LIMIT 5
          `;
          queryParams = palabras.map(p => `%${p}%`);
          if (marca) queryParams.push(`%${marca}%`);
          break;

        case 'buscar_cliente_por_telefono':
          sqlQuery = `
            SELECT 
              codigocliente,
              nombre,
              rif,
              telefono1,
              direccion1,
              status
            FROM clientes 
            WHERE telefono1 = $1
            LIMIT 1
          `;
          queryParams = [consulta];
          break;

        case 'buscar_cliente_por_cedula':
          sqlQuery = `
            SELECT 
              codigocliente,
              nombre,
              rif,
              telefono1,
              direccion1,
              status
            FROM clientes 
            WHERE codigocliente = $1 OR rif = $1
            LIMIT 1
          `;
          queryParams = [consulta];
          break;

        default:
          // Para consultas SQL directas
          sqlQuery = queryAlias;
          queryParams = consulta ? [consulta] : [];
      }

      const result = await client.query(sqlQuery, queryParams);
      await client.end();

      // Formatear respuesta según el tipo de consulta
      if (queryAlias.includes('inventario')) {
        return this.formatProductSearchResponse(result.rows, consulta);
      }

      return {
        respuesta: this.formatGenericResponse(result.rows),
        rows: result.rows,
        rowCount: result.rowCount
      };

    } catch (error) {
      this.logger.error(`❌ Error en run_query: ${error.message}`);
      return {
        respuesta: `😔 No pude procesar tu consulta en este momento. ${error.message}`,
        error: true
      };
    }
  }

  /**
   * HERRAMIENTA: crear_cliente
   * Replica la funcionalidad de n8n para crear nuevos clientes
   */
  async crearCliente(clienteData: {
    codigocliente_propuesto: string;
    rif: string;
    nombre: string;
    telefono1: string;
    direccion1?: string;
  }, dbConfig: DatabaseConfig): Promise<any> {
    try {
      this.logger.log(`👤 Creando cliente: ${clienteData.nombre}`);

      const client = new Client({
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.username,
        password: dbConfig.password,
        ssl: dbConfig.ssl || false
      });

      await client.connect();

      // Verificar si ya existe
      const existeQuery = `
        SELECT codigocliente FROM clientes 
        WHERE codigocliente = $1 OR rif = $1 OR telefono1 = $2
      `;
      const existeResult = await client.query(existeQuery, [clienteData.codigocliente_propuesto, clienteData.telefono1]);

      if (existeResult.rowCount > 0) {
        await client.end();
        return {
          mensaje: `Cliente ya existe con código: ${existeResult.rows[0].codigocliente}`,
          id_cliente_creado: existeResult.rows[0].codigocliente,
          nombre_cliente_creado: clienteData.nombre,
          cliente_existia: true
        };
      }

      // Crear nuevo cliente
      const insertQuery = `
        INSERT INTO clientes (
          codigocliente, nombre, rif, telefono1, direccion1, 
          fechacreacion, status
        ) VALUES ($1, $2, $3, $4, $5, NOW(), 'A')
        RETURNING idcliente, codigocliente
      `;

      const insertResult = await client.query(insertQuery, [
        clienteData.codigocliente_propuesto,
        clienteData.nombre,
        clienteData.rif,
        clienteData.telefono1,
        clienteData.direccion1 || null
      ]);

      await client.end();

      return {
        mensaje: `¡Cliente creado exitosamente!`,
        id_cliente_creado: insertResult.rows[0].codigocliente,
        nombre_cliente_creado: clienteData.nombre,
        cliente_existia: false
      };

    } catch (error) {
      this.logger.error(`❌ Error creando cliente: ${error.message}`);
      return {
        mensaje: `Error creando cliente: ${error.message}`,
        error: true
      };
    }
  }

  /**
   * HERRAMIENTA: crear_pedido
   * Replica la funcionalidad de n8n para crear pedidos completos
   */
  async crearPedido(pedidoData: PedidoData, dbConfig: DatabaseConfig): Promise<any> {
    const client = new Client({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.username,
      password: dbConfig.password,
      ssl: dbConfig.ssl || false
    });

    try {
      await client.connect();
      await client.query('BEGIN');

      this.logger.log(`📋 Creando pedido para cliente: ${pedidoData.pedido.nombrecliente}`);

      // 1. Crear encabezado del pedido
      const encabezadoQuery = `
        INSERT INTO encabedoc (
          codcliente, nombrecliente, rif, telefonos, vendedorcodigo, nombrevendedor,
          monedacodigo, moneda, depositocodigo, usuariocodigo, tasa, subtotal, 
          iva, total, esexento, fechaemision, hora, status, observaciones
        ) VALUES (
          $1, $2, $3, $4, 'BOT001', 'WhatsApp Bot', $5, $6, 'MAIN', 'SYSTEM',
          $7, $8, $9, $10, false, $11, $12, 'P', $13
        ) RETURNING idencabedoc
      `;

      const encabezadoResult = await client.query(encabezadoQuery, [
        pedidoData.pedido.codigocliente,
        pedidoData.pedido.nombrecliente,
        pedidoData.pedido.rif,
        pedidoData.pedido.telefonos,
        pedidoData.pedido.monedacodigo,
        pedidoData.pedido.moneda,
        pedidoData.pedido.tasa,
        pedidoData.pedido.subtotal,
        pedidoData.pedido.iva,
        pedidoData.pedido.total,
        pedidoData.pedido.fechaemision,
        pedidoData.pedido.hora,
        pedidoData.pedido.observaciones
      ]);

      const idPedido = encabezadoResult.rows[0].idencabedoc;

      // 2. Crear movimientos de productos
      for (const producto of pedidoData.productos) {
        const movimientoQuery = `
          INSERT INTO movimientosdoc (
            idencabedoc, codigo, nombre, descripcionreal, esimportacion, esexento,
            peso, cantidad, precio, iva, preciototal, status, desstatus, tiempoentrega
          ) VALUES (
            $1, $2, $3, $4, false, false, 0.1, $5, $6, $7, $8, 'G', 
            'Producto en stock', 'INMEDIATO'
          )
        `;

        await client.query(movimientoQuery, [
          idPedido,
          producto.codigo,
          producto.nombre,
          producto.nombre,
          producto.cantidad,
          producto.precio,
          producto.iva,
          producto.preciototal
        ]);
      }

      // 3. Crear registro de pago
      const pagoQuery = `
        INSERT INTO pagos (
          idencabedoc, idtipo, monto, status
        ) VALUES ($1, $2, $3, 'P')
      `;

      await client.query(pagoQuery, [
        idPedido,
        parseInt(pedidoData.pedido.idpago),
        pedidoData.pedido.total
      ]);

      await client.query('COMMIT');
      await client.end();

      return {
        confirmacion: `✅ ¡Pedido creado exitosamente!`,
        id_pedido_creado: idPedido,
        total: pedidoData.pedido.total,
        moneda: pedidoData.pedido.moneda
      };

    } catch (error) {
      await client.query('ROLLBACK');
      await client.end();
      this.logger.error(`❌ Error creando pedido: ${error.message}`);
      return {
        confirmacion: `❌ Error creando pedido: ${error.message}`,
        error: true
      };
    }
  }

  /**
   * HERRAMIENTA: validar_pago
   * Replica la funcionalidad de n8n para validar pagos
   */
  async validarPago(pagoData: {
    metodo: string;
    monto_reportado_cliente: string;
    monto_esperado_bs: number;
    monto_esperado_usd: number;
    referencia_reportada_cliente?: string;
    telefono_cliente: string;
    id_pedido: string;
  }, dbConfig: DatabaseConfig): Promise<any> {
    try {
      this.logger.log(`💳 Validando pago para pedido: ${pagoData.id_pedido}`);

      const client = new Client({
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.username,
        password: dbConfig.password,
        ssl: dbConfig.ssl || false
      });

      await client.connect();

      // Lógica de validación básica
      const montoReportado = parseFloat(pagoData.monto_reportado_cliente);
      const montoEsperado = pagoData.metodo === 'zelle' ? pagoData.monto_esperado_usd : pagoData.monto_esperado_bs;
      const tolerancia = montoEsperado * 0.05; // 5% de tolerancia

      const montoValido = Math.abs(montoReportado - montoEsperado) <= tolerancia;

      if (montoValido) {
        // Actualizar estado del pedido
        await client.query(`
          UPDATE encabedoc 
          SET status = 'E' 
          WHERE idencabedoc = $1
        `, [pagoData.id_pedido]);

        // Actualizar pago
        await client.query(`
          UPDATE pagos 
          SET status = 'V', montorecibido = $1, referencia = $2
          WHERE idencabedoc = $3
        `, [montoReportado, pagoData.referencia_reportada_cliente, pagoData.id_pedido]);
      }

      await client.end();

      return {
        pago_exitoso: montoValido,
        mensaje: montoValido 
          ? '✅ Pago validado correctamente' 
          : `❌ Monto no coincide. Esperado: ${montoEsperado}, Recibido: ${montoReportado}`,
        monto_validado: montoReportado,
        monto_esperado: montoEsperado
      };

    } catch (error) {
      this.logger.error(`❌ Error validando pago: ${error.message}`);
      return {
        pago_exitoso: false,
        mensaje: `Error validando pago: ${error.message}`,
        error: true
      };
    }
  }

  /**
   * HERRAMIENTA: leer_ofertas
   * Placeholder para ofertas especiales
   */
  async leerOfertas(codigocliente?: string): Promise<any> {
    try {
      // Lógica de ofertas básica
      const ofertas = [
        '🎉 ¡Oferta especial! 10% de descuento en productos de limpieza',
        '🛒 Compra 3 productos y llévate el 4to gratis',
        '💰 Envío gratis en compras mayores a $50'
      ];

      return {
        ofertas: ofertas,
        mensaje: ofertas.join('\n\n')
      };

    } catch (error) {
      this.logger.error(`❌ Error leyendo ofertas: ${error.message}`);
      return {
        ofertas: [],
        mensaje: 'No hay ofertas disponibles en este momento'
      };
    }
  }

  /**
   * Formatear respuesta de búsqueda de productos
   */
  private formatProductSearchResponse(productos: ProductSearchResult[], termino: string): any {
    if (!productos || productos.length === 0) {
      return {
        respuesta: `😔 No encontré "${termino}" disponible en este momento. ¿Deseas probar otra marca o presentación?`
      };
    }

    let respuesta = `🛒 **Aquí tienes opciones de ${termino}**:\n\n`;

    productos.forEach((producto, index) => {
      const precioConIva = producto.preciounidad * (1 + (producto.alicuotaiva || 0) / 100);
      const precioBs = precioConIva * 37.5; // Tasa ejemplo, debería venir del sistema

      respuesta += `${index + 1}. **${producto.nombre}**\n`;
      respuesta += `   - 💵 Precio USD: $${precioConIva.toFixed(2)}\n`;
      respuesta += `   - 🇻🇪 Precio Bs: ${precioBs.toFixed(1)}\n`;
      respuesta += `   - 📦 Código: ${producto.codigo}\n\n`;
    });

    respuesta += `👉 ¿Cuál deseas agregar al carrito? Puedes decirme el número o el nombre.`;

    return {
      respuesta: respuesta,
      productos: productos
    };
  }

  /**
   * Formatear respuesta genérica
   */
  private formatGenericResponse(rows: any[]): string {
    if (!rows || rows.length === 0) {
      return 'No se encontraron resultados.';
    }

    return `Encontrados ${rows.length} resultado(s).`;
  }
} 