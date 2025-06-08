import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../entities/payment.entity';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private paymentsRepository: Repository<Payment>,
  ) {}

  /**
   * Crear nuevo pago
   */
  async createPayment(data: {
    userId: string;
    subscriptionId?: number;
    amount: number;
    currency?: string;
    paymentMethod?: string;
    description?: string;
    externalPaymentId?: string;
  }): Promise<Payment> {
    try {
      const payment = this.paymentsRepository.create({
        user_id: data.userId,
        subscription_id: data.subscriptionId,
        amount: data.amount,
        currency: data.currency || 'USD',
        payment_method: data.paymentMethod || 'stripe',
        description: data.description,
        external_payment_id: data.externalPaymentId,
        status: 'pending'
      });

      const savedPayment = await this.paymentsRepository.save(payment);
      this.logger.log(`💳 Pago creado: ${savedPayment.id} por $${data.amount} ${data.currency || 'USD'}`);
      
      return savedPayment;
    } catch (error) {
      this.logger.error(`Error creando pago: ${error.message}`);
      throw error;
    }
  }

  /**
   * Marcar pago como completado
   */
  async markAsCompleted(paymentId: number, transactionId?: string): Promise<Payment> {
    try {
      const payment = await this.paymentsRepository.findOne({
        where: { id: paymentId }
      });

      if (!payment) {
        throw new NotFoundException(`Pago con ID ${paymentId} no encontrado`);
      }

      payment.status = 'completed';
      payment.processed_at = new Date();
      if (transactionId) {
        payment.transaction_id = transactionId;
      }

      const updatedPayment = await this.paymentsRepository.save(payment);
      this.logger.log(`✅ Pago ${paymentId} marcado como completado`);
      
      return updatedPayment;
    } catch (error) {
      this.logger.error(`Error marcando pago como completado: ${error.message}`);
      throw error;
    }
  }

  /**
   * Marcar pago como fallido
   */
  async markAsFailed(paymentId: number, failureReason: string): Promise<Payment> {
    try {
      const payment = await this.paymentsRepository.findOne({
        where: { id: paymentId }
      });

      if (!payment) {
        throw new NotFoundException(`Pago con ID ${paymentId} no encontrado`);
      }

      payment.status = 'failed';
      payment.failure_reason = failureReason;
      payment.processed_at = new Date();

      const updatedPayment = await this.paymentsRepository.save(payment);
      this.logger.log(`❌ Pago ${paymentId} marcado como fallido: ${failureReason}`);
      
      return updatedPayment;
    } catch (error) {
      this.logger.error(`Error marcando pago como fallido: ${error.message}`);
      throw error;
    }
  }

  /**
   * Obtener pagos de un usuario
   */
  async getUserPayments(userId: string): Promise<Payment[]> {
    try {
      return await this.paymentsRepository.find({
        where: { user_id: userId },
        relations: ['subscription'],
        order: { created_at: 'DESC' }
      });
    } catch (error) {
      this.logger.error(`Error obteniendo pagos del usuario ${userId}: ${error.message}`);
      return [];
    }
  }

  /**
   * Obtener estadísticas de pagos
   */
  async getPaymentStats(): Promise<{
    totalRevenue: number;
    monthlyRevenue: number;
    totalPayments: number;
    successfulPayments: number;
    failedPayments: number;
  }> {
    try {
      const [totalStats, monthlyStats] = await Promise.all([
        this.paymentsRepository
          .createQueryBuilder('payment')
          .select([
            'COUNT(*) as total_payments',
            'SUM(CASE WHEN status = \'completed\' THEN amount ELSE 0 END) as total_revenue',
            'COUNT(CASE WHEN status = \'completed\' THEN 1 END) as successful_payments',
            'COUNT(CASE WHEN status = \'failed\' THEN 1 END) as failed_payments'
          ])
          .getRawOne(),
        
        this.paymentsRepository
          .createQueryBuilder('payment')
          .select('SUM(amount) as monthly_revenue')
          .where('status = :status', { status: 'completed' })
          .andWhere('DATE_TRUNC(\'month\', created_at) = DATE_TRUNC(\'month\', CURRENT_DATE)')
          .getRawOne()
      ]);

      return {
        totalRevenue: parseFloat(totalStats.total_revenue) || 0,
        monthlyRevenue: parseFloat(monthlyStats.monthly_revenue) || 0,
        totalPayments: parseInt(totalStats.total_payments) || 0,
        successfulPayments: parseInt(totalStats.successful_payments) || 0,
        failedPayments: parseInt(totalStats.failed_payments) || 0
      };
    } catch (error) {
      this.logger.error(`Error obteniendo estadísticas de pagos: ${error.message}`);
      return {
        totalRevenue: 0,
        monthlyRevenue: 0,
        totalPayments: 0,
        successfulPayments: 0,
        failedPayments: 0
      };
    }
  }

  /**
   * Procesar reembolso
   */
  async processRefund(paymentId: number, reason: string): Promise<Payment> {
    try {
      const payment = await this.paymentsRepository.findOne({
        where: { id: paymentId }
      });

      if (!payment) {
        throw new NotFoundException(`Pago con ID ${paymentId} no encontrado`);
      }

      if (payment.status !== 'completed') {
        throw new Error('Solo se pueden reembolsar pagos completados');
      }

      payment.status = 'refunded';
      payment.failure_reason = `Reembolso: ${reason}`;
      payment.processed_at = new Date();

      const updatedPayment = await this.paymentsRepository.save(payment);
      this.logger.log(`🔄 Pago ${paymentId} reembolsado: ${reason}`);
      
      return updatedPayment;
    } catch (error) {
      this.logger.error(`Error procesando reembolso: ${error.message}`);
      throw error;
    }
  }
} 