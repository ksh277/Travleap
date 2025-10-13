/**
 * 결제 승인 API
 *
 * Toss Payments에서 결제 완료 후 우리 서버로 돌아왔을 때 호출
 * HOLD 상태의 예약을 CONFIRMED로 변경하고 결제 정보를 기록
 */

import { db } from '../../utils/database-cloud';
import { tossPayments, type PaymentApproval } from '../../utils/toss-payments';

export interface PaymentConfirmRequest {
  paymentKey: string;       // Toss에서 발급한 결제 키
  orderId: string;          // 주문 ID
  amount: number;           // 결제 금액
}

export interface PaymentConfirmResponse {
  success: boolean;
  message: string;
  bookingId?: number;
  paymentKey?: string;
  receiptUrl?: string;
  code?: string;
}

/**
 * 결제 승인 처리
 *
 * 1. Toss Payments API로 결제 승인 요청
 * 2. 결제 정보 검증
 * 3. 예약 상태 변경 (HOLD → CONFIRMED)
 * 4. 결제 정보 기록 (payment_history)
 * 5. 로그 기록 (booking_logs)
 */
export async function confirmPayment(request: PaymentConfirmRequest): Promise<PaymentConfirmResponse> {
  const { paymentKey, orderId, amount } = request;

  console.log('💳 결제 승인 처리 시작:', { paymentKey, orderId, amount });

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. orderId로 예약 조회
    const [bookings] = await connection.query(`
      SELECT id, listing_id, user_id, total_amount, status, payment_status, hold_expires_at
      FROM bookings
      WHERE booking_number = ?
      LIMIT 1
    `, [orderId]);

    if (!bookings || bookings.length === 0) {
      throw new Error('예약을 찾을 수 없습니다.');
    }

    const booking = bookings[0];

    // 2. 예약 상태 검증
    if (booking.status !== 'pending') {
      throw new Error(`이미 처리된 예약입니다. (현재 상태: ${booking.status})`);
    }

    // 3. 금액 검증
    if (booking.total_amount !== amount) {
      throw new Error(`결제 금액이 일치하지 않습니다. (예약: ${booking.total_amount}, 결제: ${amount})`);
    }

    // 4. HOLD 만료 시간 검증
    if (booking.hold_expires_at) {
      const now = new Date();
      const expiresAt = new Date(booking.hold_expires_at);

      if (expiresAt < now) {
        throw new Error('예약 시간이 만료되었습니다. 다시 예약해주세요.');
      }
    }

    // 5. Toss Payments API로 결제 승인 요청
    console.log('📡 Toss Payments API 호출...');
    const paymentResult = await tossPayments.approvePayment({
      paymentKey,
      orderId,
      amount
    });

    console.log('✅ Toss Payments 승인 성공:', paymentResult);

    // 6. 예약 상태 변경 (HOLD → CONFIRMED)
    await connection.execute(`
      UPDATE bookings
      SET
        status = 'confirmed',
        payment_status = 'paid',
        updated_at = NOW()
      WHERE id = ?
    `, [booking.id]);

    console.log(`✅ 예약 상태 변경: ${booking.id} (pending → confirmed)`);

    // 7. 결제 정보 기록
    await connection.execute(`
      INSERT INTO payment_history
      (booking_id, payment_key, payment_method, amount, status, paid_at, created_at)
      VALUES (?, ?, ?, ?, 'completed', NOW(), NOW())
    `, [
      booking.id,
      paymentKey,
      paymentResult.method || 'unknown',
      amount
    ]);

    console.log('✅ 결제 정보 기록 완료');

    // 8. 로그 기록
    await connection.execute(`
      INSERT INTO booking_logs
      (booking_id, action, details, created_at)
      VALUES (?, 'PAYMENT_CONFIRMED', ?, NOW())
    `, [
      booking.id,
      JSON.stringify({
        paymentKey,
        orderId,
        amount,
        method: paymentResult.method,
        approvedAt: paymentResult.approvedAt,
        card: paymentResult.card,
        receiptUrl: paymentResult.receipt?.url
      })
    ]);

    await connection.commit();

    console.log('🎉 결제 승인 완료!');

    return {
      success: true,
      message: '결제가 완료되었습니다.',
      bookingId: booking.id,
      paymentKey,
      receiptUrl: paymentResult.receipt?.url
    };

  } catch (error: any) {
    await connection.rollback();

    console.error('❌ 결제 승인 실패:', error);

    // 결제 실패 로그 기록 (best effort)
    try {
      const [bookings] = await connection.query(
        'SELECT id FROM bookings WHERE booking_number = ?',
        [orderId]
      );

      if (bookings && bookings.length > 0) {
        await connection.execute(`
          INSERT INTO booking_logs
          (booking_id, action, details, created_at)
          VALUES (?, 'PAYMENT_FAILED', ?, NOW())
        `, [
          bookings[0].id,
          JSON.stringify({
            paymentKey,
            orderId,
            amount,
            error: error.message
          })
        ]);
      }
    } catch (logError) {
      console.error('로그 기록 실패:', logError);
    }

    return {
      success: false,
      message: error.message || '결제 승인 중 오류가 발생했습니다.',
      code: 'PAYMENT_FAILED'
    };

  } finally {
    connection.release();
  }
}

/**
 * 결제 실패 처리
 *
 * 사용자가 결제를 취소하거나 실패했을 때 호출
 */
export async function handlePaymentFailure(orderId: string, reason?: string): Promise<PaymentConfirmResponse> {
  console.log(`🚫 결제 실패 처리: ${orderId} (사유: ${reason || '알 수 없음'})`);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. 예약 조회
    const [bookings] = await connection.query(`
      SELECT id, status FROM bookings
      WHERE booking_number = ?
      LIMIT 1
    `, [orderId]);

    if (!bookings || bookings.length === 0) {
      throw new Error('예약을 찾을 수 없습니다.');
    }

    const booking = bookings[0];

    // 2. 예약 취소 (HOLD 상태만 취소 가능)
    if (booking.status === 'pending') {
      await connection.execute(`
        UPDATE bookings
        SET
          status = 'cancelled',
          payment_status = 'failed',
          cancelled_at = NOW(),
          cancellation_reason = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [reason || '결제 실패', booking.id]);

      console.log(`✅ 예약 취소: ${booking.id}`);
    }

    // 3. 로그 기록
    await connection.execute(`
      INSERT INTO booking_logs
      (booking_id, action, details, created_at)
      VALUES (?, 'PAYMENT_FAILED', ?, NOW())
    `, [
      booking.id,
      JSON.stringify({
        orderId,
        reason: reason || '결제 실패',
        cancelledAt: new Date().toISOString()
      })
    ]);

    await connection.commit();

    return {
      success: true,
      message: '예약이 취소되었습니다.',
      bookingId: booking.id
    };

  } catch (error: any) {
    await connection.rollback();
    console.error('❌ 결제 실패 처리 중 오류:', error);

    return {
      success: false,
      message: error.message || '처리 중 오류가 발생했습니다.',
      code: 'PROCESS_FAILED'
    };

  } finally {
    connection.release();
  }
}

export default {
  confirmPayment,
  handlePaymentFailure
};
