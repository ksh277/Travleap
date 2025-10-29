/**
 * Toss Payments API 연동 유틸리티
 *
 * 공식 문서: https://docs.tosspayments.com/
 */

import { getTossClientKey, getTossSecretKey } from './toss-config.js';

// Toss Payments 환경 변수 (백엔드 전용)
// ⚠️  이 파일은 백엔드(Node.js)에서만 사용됩니다!
// ⚠️  프론트엔드에서는 절대 사용하지 마세요 (시크릿 키 노출 위험)
//
// TOSS_MODE에 따라 자동으로 TEST/LIVE 키 선택
const TOSS_CLIENT_KEY = getTossClientKey();
const TOSS_SECRET_KEY = getTossSecretKey();

// API 엔드포인트
const TOSS_API_BASE = 'https://api.tosspayments.com/v1';

/**
 * 결제 요청 정보
 */
export interface PaymentRequest {
  orderId: string;          // 주문 ID (우리 시스템의 booking_id 또는 고유값)
  orderName: string;        // 주문명 (예: "신안 비치 리조트 1박")
  amount: number;           // 결제 금액
  customerEmail?: string;   // 고객 이메일
  customerName?: string;    // 고객 이름
  successUrl: string;       // 결제 성공 시 리다이렉트 URL
  failUrl: string;          // 결제 실패 시 리다이렉트 URL
}

/**
 * 결제 승인 요청
 */
export interface PaymentApproval {
  paymentKey: string;       // Toss에서 발급한 결제 키
  orderId: string;          // 주문 ID
  amount: number;           // 결제 금액 (검증용)
}

/**
 * 결제 승인 응답
 */
export interface PaymentApprovalResponse {
  paymentKey: string;
  orderId: string;
  orderName: string;
  method: string;           // 결제 수단 (카드, 계좌이체 등)
  totalAmount: number;
  status: string;           // DONE, CANCELED 등
  requestedAt: string;
  approvedAt: string;
  card?: {
    company: string;
    number: string;
    installmentPlanMonths: number;
  };
  virtualAccount?: {
    accountNumber: string;
    bank: string;
    customerName: string;
    dueDate: string;
  };
  receipt?: {
    url: string;
  };
}

/**
 * Toss Payments 클라이언트 클래스
 */
export class TossPaymentsClient {
  private clientKey: string;
  private secretKey: string;

  constructor(clientKey?: string, secretKey?: string) {
    this.clientKey = clientKey || TOSS_CLIENT_KEY;
    this.secretKey = secretKey || TOSS_SECRET_KEY;
  }

  /**
   * 결제 승인 요청
   *
   * Toss Payments에서 결제 완료 후 우리 서버로 돌아왔을 때 호출
   */
  async approvePayment(approval: PaymentApproval): Promise<PaymentApprovalResponse> {
    try {
      console.log('💳 Toss Payments 결제 승인 요청:', approval);

      const response = await fetch(`${TOSS_API_BASE}/payments/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(this.secretKey + ':')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          paymentKey: approval.paymentKey,
          orderId: approval.orderId,
          amount: approval.amount
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Toss Payments 승인 실패:', error);
        throw new Error(`결제 승인 실패: ${error.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Toss Payments 승인 성공:', result);

      return result as PaymentApprovalResponse;

    } catch (error) {
      console.error('❌ 결제 승인 중 오류:', error);
      throw error;
    }
  }

  /**
   * 결제 조회
   */
  async getPayment(paymentKey: string): Promise<PaymentApprovalResponse> {
    try {
      const response = await fetch(`${TOSS_API_BASE}/payments/${paymentKey}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(this.secretKey + ':')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`결제 조회 실패: ${error.message || response.statusText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('❌ 결제 조회 중 오류:', error);
      throw error;
    }
  }

  /**
   * 결제 취소 (전액)
   */
  async cancelPayment(paymentKey: string, cancelReason: string): Promise<PaymentApprovalResponse> {
    try {
      console.log(`🚫 결제 취소 요청: ${paymentKey} (사유: ${cancelReason})`);

      const response = await fetch(`${TOSS_API_BASE}/payments/${paymentKey}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(this.secretKey + ':')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cancelReason
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`결제 취소 실패: ${error.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ 결제 취소 성공:', result);

      return result;

    } catch (error) {
      console.error('❌ 결제 취소 중 오류:', error);
      throw error;
    }
  }

  /**
   * 결제 환불 (부분 환불 지원)
   */
  async refundPayment(params: {
    paymentKey: string;
    refundAmount?: number;  // 부분 환불 금액 (없으면 전액)
    refundReason: string;
  }): Promise<PaymentApprovalResponse> {
    try {
      console.log(`💰 환불 요청: ${params.paymentKey}`);
      console.log(`   - 환불 금액: ${params.refundAmount ? params.refundAmount.toLocaleString() + '원' : '전액'}`);
      console.log(`   - 사유: ${params.refundReason}`);

      const requestBody: any = {
        cancelReason: params.refundReason
      };

      // 부분 환불인 경우 금액 지정
      if (params.refundAmount) {
        requestBody.cancelAmount = params.refundAmount;
      }

      const response = await fetch(`${TOSS_API_BASE}/payments/${params.paymentKey}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(this.secretKey + ':')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ 환불 실패:', error);
        throw new Error(`환불 실패: ${error.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ 환불 성공:', result);

      return result;

    } catch (error) {
      console.error('❌ 환불 처리 중 오류:', error);
      throw error;
    }
  }

  /**
   * 클라이언트 키 반환 (프론트엔드 SDK 초기화용)
   */
  getClientKey(): string {
    return this.clientKey;
  }
}

// 싱글톤 인스턴스
export const tossPayments = new TossPaymentsClient();

/**
 * 결제 위젯 초기화 헬퍼
 *
 * 브라우저에서 사용
 */
export async function loadTossPaymentsWidget() {
  if (typeof window === 'undefined') {
    throw new Error('이 함수는 브라우저 환경에서만 사용할 수 있습니다.');
  }

  // Toss Payments Widget SDK 로드 (신버전)
  if (!(window as any).PaymentWidget) {
    const script = document.createElement('script');
    script.src = 'https://js.tosspayments.com/v1/payment-widget';
    script.async = true;

    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Toss Payments Widget SDK 로드 실패'));
      document.head.appendChild(script);
    });
  }

  // Payment Widget 초기화 (신버전 API - ANONYMOUS 고객)
  const PaymentWidget = (window as any).PaymentWidget;

  // 프론트엔드에서 직접 환경 변수 읽기
  const env = (import.meta as any).env;
  const clientKey = env.VITE_TOSS_CLIENT_KEY_TEST || env.VITE_TOSS_CLIENT_KEY || 'test_ck_pP2YxJ4K87YxByjJDaX0VRGZwXLO';

  console.log('🔑 [Widget] Client Key 전달:', clientKey);
  console.log('🔍 [Debug] 환경 변수:', {
    VITE_TOSS_CLIENT_KEY_TEST: env.VITE_TOSS_CLIENT_KEY_TEST,
    VITE_TOSS_CLIENT_KEY: env.VITE_TOSS_CLIENT_KEY
  });

  if (!clientKey || clientKey.includes('undefined')) {
    throw new Error('Client Key가 올바르게 로드되지 않았습니다. .env 파일을 확인하세요.');
  }

  return PaymentWidget(clientKey, PaymentWidget.ANONYMOUS);
}

/**
 * 주문 ID 생성 헬퍼
 *
 * 형식: ORDER_{timestamp}_{random}
 */
export function generateOrderId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORDER_${timestamp}_${random}`;
}

/**
 * 개발 환경에서 전역으로 노출
 */
if (typeof window !== 'undefined' &&
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV ||
     typeof process !== 'undefined' && process.env.NODE_ENV === 'development')) {
  (window as any).tossPayments = tossPayments;
  console.log('🔧 개발 도구: tossPayments - Toss Payments API 클라이언트');
  console.log('   - tossPayments.approvePayment(approval)');
  console.log('   - tossPayments.getPayment(paymentKey)');
  console.log('   - tossPayments.cancelPayment(paymentKey, reason)');
  console.log('   - tossPayments.refundPayment({ paymentKey, refundAmount?, refundReason })');
}

export default tossPayments;
