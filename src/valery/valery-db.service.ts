import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ValeryDbService {
  private readonly logger = new Logger(ValeryDbService.name);

  constructor() {
    this.logger.log('🔧 ValeryDbService inicializado en modo simplificado para sistema SaaS');
  }

  // Métodos stub para evitar errores de compilación
  async obtenerProductosParaChatbot(query: string, options?: any): Promise<any[]> {
    this.logger.warn('obtenerProductosParaChatbot: Método no implementado en modo SaaS');
    return [];
  }

  async obtenerBancos(): Promise<any[]> {
    this.logger.warn('obtenerBancos: Método no implementado en modo SaaS');
    return [];
  }

  async convertirCarritoAPedido(phoneNumber: string, metodoPago: string): Promise<any> {
    this.logger.warn('convertirCarritoAPedido: Método no implementado en modo SaaS');
    return null;
  }

  async crearPedidoCompleto(datosCarrito: any): Promise<any> {
    this.logger.warn('crearPedidoCompleto: Método no implementado en modo SaaS');
    return null;
  }

  async buscarProductosPorLista(message: string): Promise<any> {
    this.logger.warn('buscarProductosPorLista: Método no implementado en modo SaaS');
    return {
      productos: [],
      terminos: [],
      estadisticas: { terminosBuscados: 0, productosEncontrados: 0, promedioPorTermino: 0 }
    };
  }

  async validarCliente(cedula: string): Promise<any> {
    this.logger.warn('validarCliente: Método no implementado en modo SaaS');
    return { nombre: 'Cliente no encontrado', valido: false };
  }

  async registrarInformacionPago(data: any): Promise<void> {
    this.logger.warn('registrarInformacionPago: Método no implementado en modo SaaS');
  }

  async obtenerFacturasCliente(codigoCliente: string): Promise<any[]> {
    this.logger.warn('obtenerFacturasCliente: Método no implementado en modo SaaS');
    return [];
  }

  async ejecutarQuery(query: string, params: any[] = [], chatbotId: string = ''): Promise<any[]> {
    this.logger.warn('ejecutarQuery: Método no implementado en modo SaaS');
    return [];
  }

  async obtenerProductos(termino: string): Promise<any[]> {
    this.logger.warn('obtenerProductos: Método no implementado en modo SaaS');
    return [];
  }

  async obtenerClientePorTelefono(telefono: string): Promise<any> {
    this.logger.warn('obtenerClientePorTelefono: Método no implementado en modo SaaS');
    return null;
  }

  // Método de estado para el sistema SaaS
  async isConnected(): Promise<boolean> {
    return true; // Siempre retorna true en modo simplificado
  }

  async diagnosticoSaaS(): Promise<any> {
    return {
      status: 'simplified',
      message: 'ValeryDbService ejecutándose en modo simplificado para sistema SaaS',
      timestamp: new Date().toISOString()
    };
  }
} 