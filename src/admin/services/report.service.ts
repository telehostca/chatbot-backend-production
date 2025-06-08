import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Conversation } from '../entities/conversation.entity';
import { AdminMessage } from '../entities/message.entity';
import { User } from '../../users/entities/user.entity';
import { Order } from '../../orders/entities/order.entity';
import { Promotion } from '../../promotions/entities/promotion.entity';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    @InjectRepository(AdminMessage, 'users')
    private readonly messageRepository: Repository<AdminMessage>,
    @InjectRepository(Conversation, 'users')
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(User, 'users')
    private readonly userRepository: Repository<User>,
    @InjectRepository(Promotion, 'users')
    private promotionRepository: Repository<Promotion>,
    @InjectRepository(Order, 'users')
    private orderRepository: Repository<Order>,
  ) {}

  async getSalesReport(startDate: Date, endDate: Date) {
    try {
      const conversations = await this.conversationRepository.find({
        where: {
          updatedAt: Between(startDate, endDate)
        }
      });

      const totalSales = conversations.reduce((sum, conv) => {
        return sum + (conv.cart?.total || 0);
      }, 0);

      const activeConversations = conversations.filter(c => 
        c.metadata.status === 'active'
      ).length;

      return {
        totalSales,
        totalOrders: conversations.length,
        averageOrderValue: totalSales / conversations.length || 0,
        activeConversations,
        salesByDay: this.groupSalesByDay(conversations),
        salesByPaymentMethod: this.groupSalesByPaymentMethod(conversations)
      };
    } catch (error) {
      this.logger.error(`Error al generar reporte de ventas: ${error.message}`);
      throw error;
    }
  }

  async getConversationReport(startDate: Date, endDate: Date) {
    try {
      const conversations = await this.conversationRepository.find({
        where: {
          updatedAt: Between(startDate, endDate)
        },
        relations: ['messages', 'user'],
      });

      return {
        totalConversations: conversations.length,
        activeConversations: conversations.filter(c => 
          c.metadata.status === 'active'
        ).length,
        totalMessages: conversations.reduce((acc, c) => acc + c.messages.length, 0),
        averageResponseTime: this.calculateAverageResponseTime(conversations),
        conversationFlow: this.analyzeConversationFlow(conversations),
        userEngagement: this.calculateUserEngagement(conversations),
      };
    } catch (error) {
      this.logger.error(`Error al generar reporte de conversaciones: ${error.message}`);
      throw error;
    }
  }

  async getPromotionReport(startDate: Date, endDate: Date) {
    try {
      const promotions = await this.promotionRepository.find({
        where: {
          startDate: LessThanOrEqual(endDate),
          endDate: MoreThanOrEqual(startDate)
        }
      });

      return {
        activePromotions: promotions.filter(p => p.isActive).length,
        totalPromotions: promotions.length,
        promotionUsage: this.calculatePromotionUsage(promotions),
        revenueImpact: this.calculatePromotionRevenueImpact(promotions),
        topPromotions: this.getTopPromotions(promotions),
      };
    } catch (error) {
      this.logger.error(`Error al generar reporte de promociones: ${error.message}`);
      throw error;
    }
  }

  async getUserReport() {
    try {
      const users = await this.userRepository.find({
        relations: ['conversations'],
      });

      return {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.status === 'active').length,
        blockedUsers: users.filter(u => u.status === 'blocked').length,
        userSegments: this.segmentUsers(users),
        userActivity: this.analyzeUserActivity(users),
        retentionMetrics: this.calculateRetentionMetrics(users),
      };
    } catch (error) {
      this.logger.error(`Error al generar reporte de usuarios: ${error.message}`);
      throw error;
    }
  }

  private groupSalesByDay(conversations: Conversation[]) {
    const salesByDay = new Map<string, number>();
    
    conversations.forEach(conv => {
      const date = conv.updatedAt.toISOString().split('T')[0];
      const total = conv.cart?.total || 0;
      salesByDay.set(date, (salesByDay.get(date) || 0) + total);
    });

    return Array.from(salesByDay.entries()).map(([date, total]) => ({
      date,
      total,
      count: conversations.filter(c => 
        c.updatedAt.toISOString().split('T')[0] === date
      ).length
    }));
  }

  private groupSalesByPaymentMethod(conversations: Conversation[]) {
    const salesByMethod = new Map<string, number>();
    
    conversations.forEach(conv => {
      const method = conv.cart?.paymentMethod || 'unknown';
      const total = conv.cart?.total || 0;
      salesByMethod.set(method, (salesByMethod.get(method) || 0) + total);
    });

    return Array.from(salesByMethod.entries()).map(([method, total]) => ({
      method,
      total,
      count: conversations.filter(c => 
        (c.cart?.paymentMethod || 'unknown') === method
      ).length
    }));
  }

  private calculateAverageResponseTime(conversations: any[]): number {
    if (!conversations || conversations.length === 0) {
      return 0;
    }

    let totalResponseTime = 0;
    let responseCount = 0;

    for (const conversation of conversations) {
      if (conversation.messages && conversation.messages.length > 1) {
        for (let i = 1; i < conversation.messages.length; i++) {
          const currentMessage = conversation.messages[i];
          const previousMessage = conversation.messages[i - 1];
          
          // Solo contar respuestas del bot (no del usuario)
          if (currentMessage.isFromBot && !previousMessage.isFromBot) {
            const responseTime = new Date(currentMessage.timestamp).getTime() - 
                                new Date(previousMessage.timestamp).getTime();
            
            // Solo considerar respuestas dentro de un rango razonable (1 segundo a 1 hora)
            if (responseTime >= 1000 && responseTime <= 3600000) {
              totalResponseTime += responseTime;
              responseCount++;
            }
          }
        }
      }
    }

    // Retornar tiempo promedio en segundos
    return responseCount > 0 ? Math.round(totalResponseTime / responseCount / 1000) : 0;
  }

  private analyzeConversationFlow(conversations: any[]): any {
    // Implementar lógica para analizar flujo de conversaciones
    return {};
  }

  private calculateUserEngagement(conversations: any[]): any {
    // Implementar lógica para calcular engagement de usuarios
    return {};
  }

  private calculatePromotionUsage(promotions: any[]): any {
    // Implementar lógica para calcular uso de promociones
    return {};
  }

  private calculatePromotionRevenueImpact(promotions: any[]): any {
    if (!promotions || promotions.length === 0) {
      return {
        totalRevenue: 0,
        totalDiscount: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        topPerformingPromotions: []
      };
    }

    let totalRevenue = 0;
    let totalDiscount = 0;
    let totalOrders = 0;
    const promotionStats = [];

    for (const promotion of promotions) {
      const orders = promotion.orders || [];
      let promotionRevenue = 0;
      let promotionDiscount = 0;

      for (const order of orders) {
        const orderValue = parseFloat(order.total) || 0;
        const discountAmount = parseFloat(order.discountAmount) || 0;

        promotionRevenue += orderValue;
        promotionDiscount += discountAmount;
        totalOrders++;
      }

      totalRevenue += promotionRevenue;
      totalDiscount += promotionDiscount;

      promotionStats.push({
        id: promotion.id,
        name: promotion.name,
        revenue: promotionRevenue,
        discount: promotionDiscount,
        orders: orders.length,
        averageOrderValue: orders.length > 0 ? promotionRevenue / orders.length : 0,
        discountRate: promotion.discountPercentage || 0,
        roi: promotionDiscount > 0 ? ((promotionRevenue - promotionDiscount) / promotionDiscount) * 100 : 0
      });
    }

    // Ordenar promociones por rendimiento (ROI)
    const topPerformingPromotions = promotionStats
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 5);

    return {
      totalRevenue: Math.round(totalRevenue),
      totalDiscount: Math.round(totalDiscount),
      totalOrders,
      averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      netRevenue: Math.round(totalRevenue - totalDiscount),
      discountRate: totalRevenue > 0 ? Math.round((totalDiscount / totalRevenue) * 100) : 0,
      topPerformingPromotions,
      promotionStats
    };
  }

  private getTopPromotions(promotions: any[]): any[] {
    // Implementar lógica para obtener promociones más usadas
    return [];
  }

  private segmentUsers(users: any[]): any {
    // Implementar lógica para segmentar usuarios
    return {};
  }

  private analyzeUserActivity(users: any[]): any {
    // Implementar lógica para analizar actividad de usuarios
    return {};
  }

  private calculateRetentionMetrics(users: any[]): any {
    if (!users || users.length === 0) {
      return {
        daily: 0,
        weekly: 0,
        monthly: 0,
        churnRate: 0
      };
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Usuarios activos en cada período
    const dailyActive = users.filter(user => 
      user.lastActivity && new Date(user.lastActivity) >= oneDayAgo
    ).length;

    const weeklyActive = users.filter(user => 
      user.lastActivity && new Date(user.lastActivity) >= oneWeekAgo
    ).length;

    const monthlyActive = users.filter(user => 
      user.lastActivity && new Date(user.lastActivity) >= oneMonthAgo
    ).length;

    // Calcular tasas de retención
    const totalUsers = users.length;
    const dailyRetention = totalUsers > 0 ? (dailyActive / totalUsers) * 100 : 0;
    const weeklyRetention = totalUsers > 0 ? (weeklyActive / totalUsers) * 100 : 0;
    const monthlyRetention = totalUsers > 0 ? (monthlyActive / totalUsers) * 100 : 0;

    // Calcular tasa de abandono (usuarios que no han estado activos en 30 días)
    const inactiveUsers = users.filter(user => 
      !user.lastActivity || new Date(user.lastActivity) < oneMonthAgo
    ).length;
    const churnRate = totalUsers > 0 ? (inactiveUsers / totalUsers) * 100 : 0;

    return {
      daily: Math.round(dailyRetention),
      weekly: Math.round(weeklyRetention),
      monthly: Math.round(monthlyRetention),
      churnRate: Math.round(churnRate),
      activeUsers: {
        daily: dailyActive,
        weekly: weeklyActive,
        monthly: monthlyActive
      },
      totalUsers
    };
  }

  /**
   * Generar reporte de performance del chatbot
   */
  async generateChatbotPerformanceReport(chatbotId: string, dateRange: { from: Date; to: Date }): Promise<any> {
    try {
      // Simular datos del chatbot
      const mockData = {
        totalMessages: 1250,
        totalUsers: 320,
        activeUsers: 89,
        averageResponseTime: 2.3,
        resolutionRate: 78,
        satisfactionScore: 4.2,
        topQueries: [
          { query: "productos disponibles", count: 156 },
          { query: "precios", count: 134 },
          { query: "envío", count: 98 },
          { query: "horarios", count: 87 },
          { query: "pagos", count: 76 }
        ],
        dailyStats: this.generateDailyStats(dateRange.from, dateRange.to)
      };

      return {
        chatbotId,
        period: {
          from: dateRange.from,
          to: dateRange.to,
          days: Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
        },
        performance: mockData,
        generatedAt: new Date()
      };
    } catch (error) {
      this.logger.error(`Error generando reporte de performance: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generar estadísticas diarias simuladas
   */
  private generateDailyStats(fromDate: Date, toDate: Date): any[] {
    const stats = [];
    const current = new Date(fromDate);
    
    while (current <= toDate) {
      stats.push({
        date: current.toISOString().split('T')[0],
        messages: Math.floor(Math.random() * 100) + 20,
        users: Math.floor(Math.random() * 30) + 5,
        responseTime: Math.round((Math.random() * 3 + 1) * 10) / 10,
        satisfaction: Math.round((Math.random() * 2 + 3) * 10) / 10
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return stats;
  }

  /**
   * Exportar reporte como CSV
   */
  async exportReportAsCSV(reportData: any, reportType: string): Promise<string> {
    try {
      let csvContent = '';
      
      switch (reportType) {
        case 'sales':
          csvContent = this.generateSalesCSV(reportData);
          break;
        case 'users':
          csvContent = this.generateUsersCSV(reportData);
          break;
        case 'chatbot':
          csvContent = this.generateChatbotCSV(reportData);
          break;
        default:
          throw new Error(`Tipo de reporte no soportado: ${reportType}`);
      }
      
      return csvContent;
    } catch (error) {
      this.logger.error(`Error exportando reporte como CSV: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generar CSV para reporte de ventas
   */
  private generateSalesCSV(data: any): string {
    const headers = ['Fecha', 'Ventas Totales', 'Número de Órdenes', 'Ticket Promedio', 'Producto Más Vendido'];
    let csv = headers.join(',') + '\n';
    
    if (data.dailyStats) {
      for (const day of data.dailyStats) {
        const row = [
          day.date,
          day.sales || 0,
          day.orders || 0,
          day.averageTicket || 0,
          `"${day.topProduct || 'N/A'}"`
        ];
        csv += row.join(',') + '\n';
      }
    }
    
    return csv;
  }

  /**
   * Generar CSV para reporte de usuarios
   */
  private generateUsersCSV(data: any): string {
    const headers = ['Fecha', 'Usuarios Nuevos', 'Usuarios Activos', 'Tasa de Retención', 'Satisfacción'];
    let csv = headers.join(',') + '\n';
    
    if (data.dailyStats) {
      for (const day of data.dailyStats) {
        const row = [
          day.date,
          day.newUsers || 0,
          day.activeUsers || 0,
          `${day.retention || 0}%`,
          day.satisfaction || 0
        ];
        csv += row.join(',') + '\n';
      }
    }
    
    return csv;
  }

  /**
   * Generar CSV para reporte de chatbot
   */
  private generateChatbotCSV(data: any): string {
    const headers = ['Fecha', 'Mensajes', 'Usuarios', 'Tiempo Respuesta (s)', 'Satisfacción'];
    let csv = headers.join(',') + '\n';
    
    if (data.performance && data.performance.dailyStats) {
      for (const day of data.performance.dailyStats) {
        const row = [
          day.date,
          day.messages || 0,
          day.users || 0,
          day.responseTime || 0,
          day.satisfaction || 0
        ];
        csv += row.join(',') + '\n';
      }
    }
    
    return csv;
  }
} 