/**
 * Toss Payments Server-side 유틸리티 (모델A 준수)
 *
 * Node.js 서버 전용 - 보증금 사전승인/정산 로직
 *
 * 모델A: 요금 선결제(CAPTURE) + 픽업 30분 전 보증금 사전승인(PREAUTH)
 */

import * as crypto from 'crypto';

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || '';
const TOSS_API_BASE = 'https://api.tosspayments.com/v1';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

interface TossResponse {
  success: boolean;
  data?: any;
  error?: { code: string; message: string };
}

/**
 * Toss Payments Server Service
 */
class TossPaymentsServer {
  private readonly secretKey: string;
  private readonly apiBase: string;

  constructor() {
    this.secretKey = TOSS_SECRET_KEY;
    this.apiBase = TOSS_API_BASE;
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.secretKey}:`).toString('base64')}`;
  }

  private generateIdempotencyKey(prefix: string, id: number): string {
    const timestamp = Date.now();
    const hash = crypto.createHash('sha256').update(`${prefix}-${id}-${timestamp}`).digest('hex').substring(0, 16);
    return `${prefix}-${id}-${hash}`;
  }

  private async request(url: string, method: string, body?: any, retries: number = MAX_RETRIES): Promise<TossResponse> {
    const idempotencyKey = body?._idempotencyKey || this.generateIdempotencyKey('toss', Date.now());

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`🔄 [Toss] ${method} ${url} (attempt ${attempt + 1}/${retries + 1})`);

        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': this.getAuthHeader(),
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey
          },
          body: body ? JSON.stringify(body) : undefined
        });

        const data = await response.json();

        if (response.ok) {
          console.log(`✅ [Toss] Success`);
          return { success: true, data };
        }

        if (response.status >= 500 || response.status === 408) {
          if (attempt < retries) {
            console.log(`⏳ [Toss] Retrying...`);
            await this.sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
            continue;
          }
        }

        console.error(`❌ [Toss] Error ${response.status}:`, data);
        return { success: false, error: { code: data.code || 'UNKNOWN_ERROR', message: data.message || 'Unknown error' } };

      } catch (error) {
        console.error(`❌ [Toss] Request failed:`, error);
        if (attempt < retries) {
          await this.sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }
        return { success: false, error: { code: 'NETWORK_ERROR', message: error instanceof Error ? error.message : 'Network error' } };
      }
    }

    return { success: false, error: { code: 'MAX_RETRIES_EXCEEDED', message: 'Maximum retries exceeded' } };
  }

  /**
   * 1. 요금 결제 확정 (Capture)
   */
  async captureCharge(params: {
    paymentKey: string;
    orderId: string;
    amount: number;
    bookingId: number;
  }): Promise<TossResponse> {
    const { paymentKey, orderId, amount, bookingId } = params;
    console.log(`💳 [Capture] Booking ${bookingId} - ${amount.toLocaleString()}원`);

    const url = `${this.apiBase}/payments/confirm`;
    const body = {
      paymentKey,
      orderId,
      amount,
      _idempotencyKey: this.generateIdempotencyKey('capture', bookingId)
    };

    return this.request(url, 'POST', body);
  }

  /**
   * 2. 보증금 사전승인 (Preauth) - 카드 빌링키 발급
   */
  async preauthDeposit(params: {
    bookingId: number;
    bookingNumber: string;
    depositAmount: number;
    customerKey: string;
    cardNumber: string;
    cardExpiry: string;
    cardPassword: string;
    customerBirth: string;
  }): Promise<TossResponse> {
    const { bookingId, bookingNumber, depositAmount, customerKey, cardNumber, cardExpiry, cardPassword, customerBirth } = params;
    console.log(`🔐 [Preauth] Booking ${bookingNumber} - 보증금 ${depositAmount.toLocaleString()}원`);

    // 빌링키 발급
    const url = `${this.apiBase}/billing/authorizations/card`;
    const body = {
      customerKey,
      cardNumber,
      cardExpirationYear: cardExpiry.substring(2, 4),
      cardExpirationMonth: cardExpiry.substring(0, 2),
      cardPassword,
      customerIdentityNumber: customerBirth,
      _idempotencyKey: this.generateIdempotencyKey('preauth', bookingId)
    };

    return this.request(url, 'POST', body);
  }

  /**
   * 3. 보증금 일부 실결제 (Partial Capture)
   */
  async captureDepositPartial(params: {
    bookingId: number;
    billingKey: string;
    amount: number;
    reason: string;
  }): Promise<TossResponse> {
    const { bookingId, billingKey, amount, reason } = params;
    console.log(`💰 [Partial Capture] BillingKey ${billingKey} - ${amount.toLocaleString()}원 (${reason})`);

    const url = `${this.apiBase}/billing/${billingKey}`;
    const body = {
      customerKey: `customer-${bookingId}`,
      amount,
      orderId: `penalty-${bookingId}-${Date.now()}`,
      orderName: `보증금 차감 (${reason})`,
      _idempotencyKey: this.generateIdempotencyKey('partial-capture', bookingId)
    };

    return this.request(url, 'POST', body);
  }

  /**
   * 4. 보증금 사전승인 취소 (Void) - 빌링키 삭제
   */
  async voidDeposit(params: {
    bookingId: number;
    billingKey: string;
    customerKey: string;
  }): Promise<TossResponse> {
    const { bookingId, billingKey, customerKey } = params;
    console.log(`🔓 [Void] BillingKey ${billingKey} - 보증금 사전승인 취소`);

    const url = `${this.apiBase}/billing/authorizations/${billingKey}`;

    return this.request(url, 'DELETE', {
      customerKey,
      _idempotencyKey: this.generateIdempotencyKey('void', bookingId)
    });
  }

  /**
   * 결제 취소 (전액 환불)
   */
  async cancelPayment(params: {
    paymentKey: string;
    cancelReason: string;
    cancelAmount?: number;
  }): Promise<TossResponse> {
    const { paymentKey, cancelReason, cancelAmount } = params;
    console.log(`❌ [Cancel] PaymentKey ${paymentKey} - ${cancelReason}`);

    const url = `${this.apiBase}/payments/${paymentKey}/cancel`;
    const body = { cancelReason, ...(cancelAmount && { cancelAmount }) };

    return this.request(url, 'POST', body);
  }

  /**
   * 결제 정보 조회
   */
  async getPayment(paymentKey: string): Promise<TossResponse> {
    const url = `${this.apiBase}/payments/${paymentKey}`;
    return this.request(url, 'GET');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { TossPaymentsServer };
export const tossPaymentsServer = new TossPaymentsServer();
