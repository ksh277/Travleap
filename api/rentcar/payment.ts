// 렌트카 결제 처리 API
import { db } from '../../utils/database';

interface RentcarPaymentRequest {
  booking_id: number;
  payment_key: string;
  order_id: string;
  amount: number;
  payment_method?: string;
}

/**
 * 렌트카 결제 확정
 *
 * 프로세스:
 * 1. 예약 정보 조회 및 검증
 * 2. Toss Payments 결제 확정 요청
 * 3. 예약 상태 업데이트 (pending → confirmed)
 * 4. 결제 내역 저장
 */
export async function confirmRentcarPayment(request: RentcarPaymentRequest) {
  try {
    const { booking_id, payment_key, order_id, amount } = request;

    console.log('💳 [Rentcar Payment] 결제 확정 시작:', { booking_id, order_id, amount });

    // 1. 예약 정보 조회
    const bookings = await db.query(`
      SELECT
        rb.*,
        v.display_name as vehicle_name,
        vendor.business_name as vendor_name,
        vendor.commission_rate
      FROM rentcar_bookings rb
      LEFT JOIN rentcar_vehicles v ON rb.vehicle_id = v.id
      LEFT JOIN rentcar_vendors vendor ON rb.vendor_id = vendor.id
      WHERE rb.id = ?
    `, [booking_id]);

    if (bookings.length === 0) {
      return {
        success: false,
        message: '예약을 찾을 수 없습니다'
      };
    }

    const booking = bookings[0];

    // 2. 예약 상태 검증
    if (booking.status === 'confirmed') {
      return {
        success: false,
        message: '이미 확정된 예약입니다'
      };
    }

    if (booking.status === 'cancelled') {
      return {
        success: false,
        message: '취소된 예약입니다'
      };
    }

    // 3. 금액 검증
    if (booking.total_krw !== amount) {
      console.error('❌ [Rentcar Payment] 금액 불일치:', {
        expected: booking.total_krw,
        received: amount
      });
      return {
        success: false,
        message: '결제 금액이 예약 금액과 일치하지 않습니다'
      };
    }

    // 4. Toss Payments 결제 확정
    const { TossPaymentsServer } = await import('../../utils/toss-payments-server.js');
    const tossService = new TossPaymentsServer();

    const paymentResult = await tossService.captureCharge({
      paymentKey: payment_key,
      orderId: order_id,
      amount: amount,
      bookingId: booking_id
    });

    if (!paymentResult.success) {
      console.error('❌ [Rentcar Payment] Toss 결제 실패:', paymentResult.error);

      // 예약 상태를 failed로 변경
      await db.execute(`
        UPDATE rentcar_bookings
        SET payment_status = 'failed', updated_at = NOW()
        WHERE id = ?
      `, [booking_id]);

      return {
        success: false,
        message: paymentResult.error?.message || '결제 처리 중 오류가 발생했습니다'
      };
    }

    // 5. 수수료 계산
    const commissionRate = booking.commission_rate || 0.10; // 기본 10%
    const platformFee = Math.floor(booking.total_krw * commissionRate);
    const vendorAmount = booking.total_krw - platformFee;

    // 6. 예약 상태 업데이트
    await db.execute(`
      UPDATE rentcar_bookings
      SET
        status = 'confirmed',
        payment_status = 'completed',
        payment_method = ?,
        payment_key = ?,
        order_id = ?,
        paid_at = NOW(),
        platform_fee_krw = ?,
        vendor_amount_krw = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
      request.payment_method || 'card',
      payment_key,
      order_id,
      platformFee,
      vendorAmount,
      booking_id
    ]);

    // 7. 결제 내역 저장 (payment_transactions 테이블)
    await db.execute(`
      INSERT INTO payment_transactions (
        booking_id, booking_type, amount, payment_method, payment_key,
        order_id, status, transaction_type, created_at
      ) VALUES (?, 'rentcar', ?, ?, ?, ?, 'completed', 'charge', NOW())
    `, [
      booking_id,
      amount,
      request.payment_method || 'card',
      payment_key,
      order_id
    ]);

    console.log('✅ [Rentcar Payment] 결제 완료:', {
      booking_id,
      booking_number: booking.booking_number,
      amount,
      platform_fee: platformFee,
      vendor_amount: vendorAmount
    });

    return {
      success: true,
      message: '결제가 완료되었습니다',
      booking: {
        id: booking_id,
        booking_number: booking.booking_number,
        vehicle_name: booking.vehicle_name,
        vendor_name: booking.vendor_name,
        pickup_date: booking.pickup_date,
        dropoff_date: booking.dropoff_date,
        total_amount: booking.total_krw,
        status: 'confirmed',
        payment_status: 'completed'
      }
    };

  } catch (error) {
    console.error('❌ [Rentcar Payment] 결제 확정 오류:', error);
    return {
      success: false,
      message: '결제 처리 중 오류가 발생했습니다'
    };
  }
}

/**
 * 렌트카 결제 취소/환불
 */
export async function refundRentcarPayment(bookingId: number, reason?: string) {
  try {
    console.log('💸 [Rentcar Payment] 환불 시작:', { bookingId, reason });

    // 1. 예약 정보 조회
    const bookings = await db.query(`
      SELECT *
      FROM rentcar_bookings
      WHERE id = ?
    `, [bookingId]);

    if (bookings.length === 0) {
      return {
        success: false,
        message: '예약을 찾을 수 없습니다'
      };
    }

    const booking = bookings[0];

    // 2. 환불 가능 여부 확인
    if (booking.payment_status !== 'completed') {
      return {
        success: false,
        message: '결제 완료된 예약만 환불할 수 있습니다'
      };
    }

    if (!booking.payment_key) {
      return {
        success: false,
        message: '결제 정보가 없습니다'
      };
    }

    // 3. 취소 수수료 계산 (예약일까지 기간에 따라)
    const now = new Date();
    const pickupDate = new Date(booking.pickup_date);
    const daysUntilPickup = Math.floor((pickupDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let cancellationFee = 0;
    if (daysUntilPickup < 1) {
      cancellationFee = booking.total_krw; // 당일 취소: 환불 불가
    } else if (daysUntilPickup < 3) {
      cancellationFee = Math.floor(booking.total_krw * 0.5); // 3일 이내: 50% 수수료
    } else if (daysUntilPickup < 7) {
      cancellationFee = Math.floor(booking.total_krw * 0.3); // 7일 이내: 30% 수수료
    } else {
      cancellationFee = Math.floor(booking.total_krw * 0.1); // 7일 이상: 10% 수수료
    }

    const refundAmount = booking.total_krw - cancellationFee;

    if (refundAmount <= 0) {
      return {
        success: false,
        message: '취소 수수료로 인해 환불 금액이 없습니다'
      };
    }

    // 4. Toss Payments 환불 요청
    const { TossPaymentsServer } = await import('../../utils/toss-payments-server.js');
    const tossService = new TossPaymentsServer();

    const refundResult = await tossService.cancelPayment({
      paymentKey: booking.payment_key,
      cancelReason: reason || '사용자 요청',
      cancelAmount: refundAmount
    });

    if (!refundResult.success) {
      console.error('❌ [Rentcar Payment] 환불 실패:', refundResult.error);
      return {
        success: false,
        message: refundResult.error?.message || '환불 처리 중 오류가 발생했습니다'
      };
    }

    // 5. 예약 상태 업데이트
    await db.execute(`
      UPDATE rentcar_bookings
      SET
        status = 'cancelled',
        payment_status = 'refunded',
        cancellation_fee_krw = ?,
        refund_amount_krw = ?,
        cancellation_reason = ?,
        cancelled_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
    `, [cancellationFee, refundAmount, reason || '사용자 요청', bookingId]);

    // 6. 환불 트랜잭션 저장
    await db.execute(`
      INSERT INTO payment_transactions (
        booking_id, booking_type, amount, payment_method, payment_key,
        order_id, status, transaction_type, created_at
      ) VALUES (?, 'rentcar', ?, ?, ?, ?, 'completed', 'refund', NOW())
    `, [
      bookingId,
      refundAmount,
      booking.payment_method,
      booking.payment_key,
      booking.order_id
    ]);

    console.log('✅ [Rentcar Payment] 환불 완료:', {
      bookingId,
      booking_number: booking.booking_number,
      refund_amount: refundAmount,
      cancellation_fee: cancellationFee
    });

    return {
      success: true,
      message: '환불이 완료되었습니다',
      refund: {
        booking_id: bookingId,
        booking_number: booking.booking_number,
        total_amount: booking.total_krw,
        cancellation_fee: cancellationFee,
        refund_amount: refundAmount
      }
    };

  } catch (error) {
    console.error('❌ [Rentcar Payment] 환불 오류:', error);
    return {
      success: false,
      message: '환불 처리 중 오류가 발생했습니다'
    };
  }
}

/**
 * 결제 상태 조회
 */
export async function getRentcarPaymentStatus(bookingId: number) {
  try {
    const bookings = await db.query(`
      SELECT
        rb.id,
        rb.booking_number,
        rb.status,
        rb.payment_status,
        rb.payment_method,
        rb.payment_key,
        rb.order_id,
        rb.total_krw,
        rb.paid_at,
        rb.refund_amount_krw,
        rb.cancellation_fee_krw
      FROM rentcar_bookings rb
      WHERE rb.id = ?
    `, [bookingId]);

    if (bookings.length === 0) {
      return {
        success: false,
        message: '예약을 찾을 수 없습니다'
      };
    }

    return {
      success: true,
      payment: bookings[0]
    };

  } catch (error) {
    console.error('❌ [Rentcar Payment] 결제 상태 조회 오류:', error);
    return {
      success: false,
      message: '결제 상태 조회 중 오류가 발생했습니다'
    };
  }
}
