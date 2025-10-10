/**
 * 예약 API 엔드포인트
 * POST /api/booking/checkout - 예약 결제 및 확정
 */

import { PMSService } from './service';
import type { PMSVendor, PMSBookingRequest } from './types';

// 결제 서비스 인터페이스 (예: Stripe, Toss Payments 등)
interface PaymentService {
  // 결제 사전 승인 (PreAuth)
  preAuth(amount: number, currency: string, cardToken: string): Promise<{
    success: boolean;
    authId: string;
    error?: string;
  }>;

  // 결제 승인 (Capture)
  capture(authId: string): Promise<{
    success: boolean;
    transactionId: string;
    error?: string;
  }>;

  // 결제 취소 (PreAuth 취소)
  cancelAuth(authId: string): Promise<{ success: boolean }>;
}

// Mock 결제 서비스 (실제로는 Toss Payments, Stripe 등 사용)
class MockPaymentService implements PaymentService {
  async preAuth(amount: number, currency: string, cardToken: string) {
    // 실제로는 결제 게이트웨이 API 호출
    console.log(`PreAuth: ${amount} ${currency}`);
    return {
      success: true,
      authId: `auth_${Date.now()}`,
    };
  }

  async capture(authId: string) {
    console.log(`Capture: ${authId}`);
    return {
      success: true,
      transactionId: `txn_${Date.now()}`,
    };
  }

  async cancelAuth(authId: string) {
    console.log(`Cancel Auth: ${authId}`);
    return { success: true };
  }
}

// 예약 요청 바디
export interface BookingCheckoutRequest {
  vendor: PMSVendor;
  hotelId: string;
  roomTypeId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  guestInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  adults: number;
  children: number;
  specialRequests?: string;
  payment: {
    cardToken: string; // 결제 토큰
    amount: number;
    currency: string;
  };
}

// 예약 응답
export interface BookingCheckoutResponse {
  success: boolean;
  bookingId?: string;
  confirmationNumber?: string;
  holdId?: string;
  error?: string;
  errorCode?: string;
}

/**
 * 예약 결제 및 확정 API
 *
 * 플로우:
 * 1. 재고 확인
 * 2. Hold 생성 (PMS에 단기 잠금)
 * 3. 결제 PreAuth (사전 승인)
 * 4. 예약 확정 (PMS Confirm)
 * 5. 결제 Capture (승인)
 *
 * 실패 시:
 * - Hold 해제
 * - PreAuth 취소
 */
export async function bookingCheckout(
  request: BookingCheckoutRequest
): Promise<BookingCheckoutResponse> {
  const pmsService = new PMSService();
  const paymentService = new MockPaymentService(); // 실제로는 주입받기

  let holdId: string | undefined;
  let paymentAuthId: string | undefined;

  try {
    // === 1단계: 재고 확인 ===
    console.log('[1/5] 재고 확인 중...');
    const availability = await pmsService.checkAvailability(
      request.vendor,
      request.hotelId,
      request.roomTypeId,
      request.checkIn,
      request.checkOut,
      1
    );

    if (!availability.available) {
      return {
        success: false,
        error: availability.reason || '재고 부족',
        errorCode: 'INVENTORY_UNAVAILABLE',
      };
    }

    // === 2단계: Hold 생성 (재고 단기 잠금, 180초) ===
    console.log('[2/5] Hold 생성 중...');
    const pmsRequest: PMSBookingRequest = {
      hotelId: request.hotelId,
      roomTypeId: request.roomTypeId,
      checkIn: request.checkIn,
      checkOut: request.checkOut,
      guestInfo: request.guestInfo,
      adults: request.adults,
      children: request.children,
      specialRequests: request.specialRequests,
    };

    const holdResult = await pmsService.createBookingHold(
      request.vendor,
      pmsRequest,
      180 // 180초 (3분) TTL
    );

    if (!holdResult.success || !holdResult.holdId) {
      return {
        success: false,
        error: holdResult.error || 'Hold 생성 실패',
        errorCode: 'HOLD_FAILED',
      };
    }

    holdId = holdResult.holdId;
    console.log(`Hold 생성 완료: ${holdId}`);

    // === 3단계: 결제 PreAuth (사전 승인) ===
    console.log('[3/5] 결제 PreAuth 중...');
    const preAuthResult = await paymentService.preAuth(
      request.payment.amount,
      request.payment.currency,
      request.payment.cardToken
    );

    if (!preAuthResult.success) {
      // PreAuth 실패 시 Hold 해제
      console.error('PreAuth 실패, Hold 해제 중...');
      await pmsService.releaseHold(request.vendor, request.hotelId, holdId);

      return {
        success: false,
        error: preAuthResult.error || '결제 승인 실패',
        errorCode: 'PAYMENT_PREAUTH_FAILED',
      };
    }

    paymentAuthId = preAuthResult.authId;
    console.log(`PreAuth 완료: ${paymentAuthId}`);

    // === 4단계: 예약 확정 (PMS Confirm) ===
    console.log('[4/5] 예약 확정 중...');
    const confirmResult = await pmsService.confirmBooking(
      request.vendor,
      request.hotelId,
      holdId,
      paymentAuthId
    );

    if (!confirmResult.success) {
      // 확정 실패 시 PreAuth 취소 및 Hold 해제
      console.error('예약 확정 실패, PreAuth 취소 및 Hold 해제 중...');
      await paymentService.cancelAuth(paymentAuthId);
      await pmsService.releaseHold(request.vendor, request.hotelId, holdId);

      return {
        success: false,
        error: confirmResult.error || '예약 확정 실패',
        errorCode: 'BOOKING_CONFIRM_FAILED',
      };
    }

    console.log(`예약 확정 완료: ${confirmResult.bookingId}`);

    // === 5단계: 결제 Capture (승인) ===
    console.log('[5/5] 결제 Capture 중...');
    const captureResult = await paymentService.capture(paymentAuthId);

    if (!captureResult.success) {
      // Capture 실패 (이미 PMS에 확정됨, 수동 처리 필요)
      console.error('결제 Capture 실패! 수동 처리 필요');
      // TODO: 관리자 알림, 수동 환불 처리

      return {
        success: false,
        error: '결제 처리 실패 (예약은 확정됨, 고객센터 문의 필요)',
        errorCode: 'PAYMENT_CAPTURE_FAILED',
        bookingId: confirmResult.bookingId,
      };
    }

    console.log(`결제 완료: ${captureResult.transactionId}`);

    // === 성공 ===
    return {
      success: true,
      bookingId: confirmResult.bookingId,
      confirmationNumber: confirmResult.bookingId, // PMS에서 받은 확인 번호
    };
  } catch (error) {
    console.error('bookingCheckout 예외 발생:', error);

    // 예외 발생 시 롤백
    if (paymentAuthId) {
      try {
        await paymentService.cancelAuth(paymentAuthId);
      } catch (e) {
        console.error('PreAuth 취소 실패:', e);
      }
    }

    if (holdId) {
      try {
        await pmsService.releaseHold(request.vendor, request.hotelId, holdId);
      } catch (e) {
        console.error('Hold 해제 실패:', e);
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: 'INTERNAL_ERROR',
    };
  }
}

/**
 * API 스펙
 *
 * POST /api/booking/checkout
 *
 * Request Body:
 * {
 *   "vendor": "cloudbeds",
 *   "hotelId": "hotel_123",
 *   "roomTypeId": "room_456",
 *   "checkIn": "2025-11-01",
 *   "checkOut": "2025-11-03",
 *   "guestInfo": {
 *     "firstName": "홍",
 *     "lastName": "길동",
 *     "email": "hong@example.com",
 *     "phone": "+82-10-1234-5678"
 *   },
 *   "adults": 2,
 *   "children": 0,
 *   "specialRequests": "조식 포함 요청",
 *   "payment": {
 *     "cardToken": "tok_visa_1234",
 *     "amount": 250000,
 *     "currency": "KRW"
 *   }
 * }
 *
 * Response (성공):
 * {
 *   "success": true,
 *   "bookingId": "booking_789",
 *   "confirmationNumber": "CONF-123456"
 * }
 *
 * Response (실패):
 * {
 *   "success": false,
 *   "error": "재고 부족: 2025-11-02",
 *   "errorCode": "INVENTORY_UNAVAILABLE"
 * }
 *
 * Error Codes:
 * - INVENTORY_UNAVAILABLE: 재고 부족
 * - HOLD_FAILED: Hold 생성 실패
 * - PAYMENT_PREAUTH_FAILED: 결제 사전 승인 실패
 * - BOOKING_CONFIRM_FAILED: 예약 확정 실패
 * - PAYMENT_CAPTURE_FAILED: 결제 승인 실패
 * - INTERNAL_ERROR: 서버 내부 오류
 */
