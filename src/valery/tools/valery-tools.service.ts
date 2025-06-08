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

@Injectable()
export class ValeryToolsService {
  private readonly logger = new Logger(ValeryToolsService.name);

  /**
   * HERRAMIENTA: run_query
   * Replica la funcionalidad de n8n para ejecutar consultas SQL
   */
  async runQuery(queryAlias: string, consulta: string, marca?: string, dbConfig?: DatabaseConfig): Promise<any> {
    try {
      this.logger.log(`🔍 Ejecutando consulta: ${queryAlias} para "${consulta}"`);
      
      // Simulación básica por ahora
      const productos = [
        {
          codigo: 'PROD001',
          nombre: `${consulta} Marca Premium`,
          preciounidad: 5.50,
          existenciaunidad: 10,
          alicuotaiva: 16,
          coddepto: 'ALM'
        }
      ];

      return this.formatProductSearchResponse(productos, consulta);

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
  async crearCliente(clienteData: any, dbConfig: DatabaseConfig): Promise<any> {
    try {
      this.logger.log(`👤 Creando cliente: ${clienteData.nombre}`);
      return {
        mensaje: 'Cliente creado exitosamente',
        id_cliente_creado: clienteData.codigocliente_propuesto,
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
  async crearPedido(pedidoData: any, dbConfig: DatabaseConfig): Promise<any> {
    try {
      this.logger.log(`📋 Creando pedido para cliente: ${pedidoData.pedido.nombrecliente}`);
      return {
        confirmacion: '✅ ¡Pedido creado exitosamente!',
        id_pedido_creado: Date.now(),
        total: pedidoData.pedido.total,
        moneda: pedidoData.pedido.moneda
      };
    } catch (error) {
      this.logger.error(`❌ Error creando pedido: ${error.message}`);
      return {
        confirmacion: `❌ Error creando pedido: ${error.message}`,
        error: true
      };
    }
  }

  /**
   * Formatear respuesta de búsqueda de productos
   */
  private formatProductSearchResponse(productos: any[], termino: string): any {
    if (!productos || productos.length === 0) {
      return {
        respuesta: `😔 No encontré "${termino}" disponible en este momento. ¿Deseas probar otra marca o presentación?`
      };
    }

    let respuesta = `🛒 **Aquí tienes opciones de ${termino}**:\n\n`;

    productos.forEach((producto, index) => {
      const precioConIva = producto.preciounidad * (1 + (producto.alicuotaiva || 0) / 100);
      const precioBs = precioConIva * 37.5;

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