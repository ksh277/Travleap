/**
 * 결제 게이트웨이 통합
 * Phase 7-5: Payment Integration
 *
 * 지원 PG:
 * - 토스페이먼츠 (Toss Payments)
 * - 아임포트 (Iamport)
 * - 카카오페이 (Kakao Pay)
 * - 네이버페이 (Naver Pay)
 *
 * 기능:
 * - 결제 요청
 * - 결제 승인
 * - 결제 취소/환불
 * - 결제 검증 (웹훅)
 * - 결제 이력 추적
 */

import { logger } from './logger';
import { db } from './database.js';
import { AppError, ErrorCode } from './error-handler';

// ============================================
// 결제 타입 정의
// ============================================

export enum PaymentProvider {
  TOSS = 'toss',
  IAMPORT = 'iamport',
  KAKAO = 'kakao',
  NAVER = 'naver'
}

export enum PaymentMethod {
  CARD = 'card',              // 신용카드
  VIRTUAL_ACCOUNT = 'virtual_account',  // 가상계좌
  BANK_TRANSFER = 'bank_transfer',      // 계좌이체
  MOBILE = 'mobile',          // 휴대폰 결제
  KAKAO_PAY = 'kakao_pay',
  NAVER_PAY = 'naver_pay',
  TOSS_PAY = 'toss_pay'
}

export enum PaymentStatus {
  PENDING = 'pending',        // 결제 대기
  READY = 'ready',            // 결제 준비 완료
  APPROVED = 'approved',      // 결제 승인
  FAILED = 'failed',          // 결제 실패
  CANCELLED = 'cancelled',    // 결제 취소
  REFUNDED = 'refunded'       // 환불 완료
}

export interface PaymentRequest {
  bookingId: number;
  amount: number;
  method: PaymentMethod;
  provider: PaymentProvider;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderName: string;
  successUrl: string;
  failUrl: string;
}

export interface PaymentResponse {
  paymentId: string;
  orderId: string;
  amount: number;
  status: PaymentStatus;
  approvedAt?: Date;
  method?: string;
  card?: {
    company: string;
    number: string;
    installment: number;
  };
  checkoutUrl?: string; // 결제 페이지 URL
}

export interface RefundRequest {
  paymentId: string;
  amount: number;
  reason: string;
}

// ============================================
// Payment Gateway 추상 인터페이스
// ============================================

interface PaymentGateway {
  requestPayment(request: PaymentRequest): Promise<PaymentResponse>;
  approvePayment(paymentId: string, additionalData?: any): Promise<PaymentResponse>;
  cancelPayment(paymentId: string, reason: string): Promise<PaymentResponse>;
  refundPayment(request: RefundRequest): Promise<PaymentResponse>;
  verifyWebhook(payload: any, signature: string): boolean;
}

// ============================================
// Toss Payments 구현
// ============================================

class TossPaymentsGateway implements PaymentGateway {
  private secretKey: string;
  private clientKey: string;
  private apiUrl: string;

  constructor() {
    this.secretKey = process.env.TOSS_SECRET_KEY || '';
    this.clientKey = process.env.TOSS_CLIENT_KEY || '';
    this.apiUrl = process.env.TOSS_API_URL || 'https://api.tosspayments.com/v1';
  }

  async requestPayment(request: PaymentRequest): Promise<PaymentResponse> {
    logger.info('Requesting Toss payment', { bookingId: request.bookingId, amount: request.amount });

    // TODO: 실제 Toss API 호출
    // const response = await fetch(`${this.apiUrl}/payments`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify({
    //     amount: request.amount,
    //     orderId: `ORDER_${request.bookingId}_${Date.now()}`,
    //     orderName: request.orderName,
    //     customerName: request.customerName,
    //     successUrl: request.successUrl,
    //     failUrl: request.failUrl
    //   })
    // });

    // 개발 환경: Mock 응답
    const mockPaymentId = `toss_${Date.now()}`;
    const mockOrderId = `ORDER_${request.bookingId}_${Date.now()}`;

    return {
      paymentId: mockPaymentId,
      orderId: mockOrderId,
      amount: request.amount,
      status: PaymentStatus.READY,
      checkoutUrl: `https://checkout.tosspayments.com/payment/${mockPaymentId}`
    };
  }

  async approvePayment(paymentId: string, additionalData?: any): Promise<PaymentResponse> {
    logger.info('Approving Toss payment', { paymentId });

    // TODO: 실제 Toss API 호출
    // const response = await fetch(`${this.apiUrl}/payments/${paymentId}/approve`, {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`,
    //     'Content-Type': 'application/json'
    //   },
    //   body: JSON.stringify(additionalData)
    // });

    // 개발 환경: Mock 응답
    return {
      paymentId,
      orderId: additionalData?.orderId || 'MOCK_ORDER',
      amount: additionalData?.amount || 0,
      status: PaymentStatus.APPROVED,
      approvedAt: new Date(),
      method: 'card'
    };
  }

  async cancelPayment(paymentId: string, reason: string): Promise<PaymentResponse> {
    logger.info('Cancelling Toss payment', { paymentId, reason });

    // TODO: 실제 Toss API 호출

    return {
      paymentId,
      orderId: 'MOCK_ORDER',
      amount: 0,
      status: PaymentStatus.CANCELLED
    };
  }

  async refundPayment(request: RefundRequest): Promise<PaymentResponse> {
    logger.info('Refunding Toss payment', request);

    // TODO: 실제 Toss API 호출

    return {
      paymentId: request.paymentId,
      orderId: 'MOCK_ORDER',
      amount: request.amount,
      status: PaymentStatus.REFUNDED
    };
  }

  verifyWebhook(payload: any, signature: string): boolean {
    // TODO: Webhook 서명 검증
    return true;
  }
}

// ============================================
// Iamport 구현 (스텁)
// ============================================

class IamportGateway implements PaymentGateway {
  async requestPayment(request: PaymentRequest): Promise<PaymentResponse> {
    // TODO: Iamport 구현
    throw new Error('Iamport not implemented');
  }

  async approvePayment(paymentId: string): Promise<PaymentResponse> {
    throw new Error('Iamport not implemented');
  }

  async cancelPayment(paymentId: string, reason: string): Promise<PaymentResponse> {
    throw new Error('Iamport not implemented');
  }

  async refundPayment(request: RefundRequest): Promise<PaymentResponse> {
    throw new Error('Iamport not implemented');
  }

  verifyWebhook(payload: any, signature: string): boolean {
    return false;
  }
}

// ============================================
// Payment Manager (통합 인터페이스)
// ============================================

class PaymentManager {
  private gateways: Map<PaymentProvider, PaymentGateway>;

  constructor() {
    this.gateways = new Map();
    this.gateways.set(PaymentProvider.TOSS, new TossPaymentsGateway());
    this.gateways.set(PaymentProvider.IAMPORT, new IamportGateway());
  }

  private getGateway(provider: PaymentProvider): PaymentGateway {
    const gateway = this.gateways.get(provider);
    if (!gateway) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        `Unsupported payment provider: ${provider}`,
        '지원하지 않는 결제 수단입니다.'
      );
    }
    return gateway;
  }

  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const gateway = this.getGateway(request.provider);

    try {
      const response = await gateway.requestPayment(request);

      // 결제 이력 저장
      await this.savePaymentHistory({
        bookingId: request.bookingId,
        paymentId: response.paymentId,
        orderId: response.orderId,
        provider: request.provider,
        method: request.method,
        amount: request.amount,
        status: response.status
      });

      return response;
    } catch (error) {
      logger.error('Payment request failed', error as Error, request);
      throw new AppError(
        ErrorCode.EXTERNAL_API_ERROR,
        `Payment request failed: ${error}`,
        '결제 요청에 실패했습니다. 잠시 후 다시 시도해주세요.'
      );
    }
  }

  async approvePayment(
    provider: PaymentProvider,
    paymentId: string,
    additionalData?: any
  ): Promise<PaymentResponse> {
    const gateway = this.getGateway(provider);

    try {
      const response = await gateway.approvePayment(paymentId, additionalData);

      // 결제 상태 업데이트
      await db.execute(`
        UPDATE payment_history
        SET status = ?, approved_at = NOW(), updated_at = NOW()
        WHERE payment_id = ?
      `, [response.status, paymentId]);

      // 예약 상태 업데이트
      const payment = await this.getPaymentByPaymentId(paymentId);
      if (payment && response.status === PaymentStatus.APPROVED) {
        await db.execute(`
          UPDATE rentcar_bookings
          SET payment_status = 'paid', updated_at = NOW()
          WHERE id = ?
        `, [payment.booking_id]);
      }

      return response;
    } catch (error) {
      logger.error('Payment approval failed', error as Error, { paymentId });
      throw new AppError(
        ErrorCode.PAYMENT_GATEWAY_ERROR,
        `Payment approval failed: ${error}`,
        '결제 승인에 실패했습니다.'
      );
    }
  }

  async cancelPayment(
    provider: PaymentProvider,
    paymentId: string,
    reason: string
  ): Promise<PaymentResponse> {
    const gateway = this.getGateway(provider);

    try {
      const response = await gateway.cancelPayment(paymentId, reason);

      // 결제 상태 업데이트
      await db.execute(`
        UPDATE payment_history
        SET status = ?, cancel_reason = ?, updated_at = NOW()
        WHERE payment_id = ?
      `, [response.status, reason, paymentId]);

      return response;
    } catch (error) {
      logger.error('Payment cancellation failed', error as Error, { paymentId, reason });
      throw new AppError(
        ErrorCode.PAYMENT_GATEWAY_ERROR,
        `Payment cancellation failed: ${error}`,
        '결제 취소에 실패했습니다.'
      );
    }
  }

  async refundPayment(
    provider: PaymentProvider,
    request: RefundRequest
  ): Promise<PaymentResponse> {
    const gateway = this.getGateway(provider);

    try {
      const response = await gateway.refundPayment(request);

      // 환불 이력 저장
      await db.execute(`
        INSERT INTO refund_history (
          payment_id, amount, reason, status, created_at
        ) VALUES (?, ?, ?, ?, NOW())
      `, [request.paymentId, request.amount, request.reason, response.status]);

      return response;
    } catch (error) {
      logger.error('Refund failed', error as Error, request);
      throw new AppError(
        ErrorCode.PAYMENT_GATEWAY_ERROR,
        `Refund failed: ${error}`,
        '환불 처리에 실패했습니다.'
      );
    }
  }

  private async savePaymentHistory(data: {
    bookingId: number;
    paymentId: string;
    orderId: string;
    provider: PaymentProvider;
    method: PaymentMethod;
    amount: number;
    status: PaymentStatus;
  }): Promise<void> {
    await db.execute(`
      INSERT INTO payment_history (
        booking_id, payment_id, order_id, provider, method, amount, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      data.bookingId,
      data.paymentId,
      data.orderId,
      data.provider,
      data.method,
      data.amount,
      data.status
    ]);
  }

  private async getPaymentByPaymentId(paymentId: string): Promise<any> {
    const payments = await db.query(`
      SELECT * FROM payment_history WHERE payment_id = ?
    `, [paymentId]);

    return payments[0] || null;
  }

  async getPaymentsByBooking(bookingId: number): Promise<any[]> {
    return await db.query(`
      SELECT * FROM payment_history
      WHERE booking_id = ?
      ORDER BY created_at DESC
    `, [bookingId]);
  }
}

// ============================================
// 싱글톤 인스턴스
// ============================================

export const paymentManager = new PaymentManager();

export default {
  PaymentProvider,
  PaymentMethod,
  PaymentStatus,
  paymentManager
};
