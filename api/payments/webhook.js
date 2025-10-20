/**
 * Toss Payments 웹훅 핸들러
 *
 * 기능:
 * - PG사에서 전송하는 결제 이벤트 수신
 * - 서명 검증 (보안)
 * - Idempotency 보장 (중복 처리 방지)
 * - 예약 상태 자동 전이 (hold → confirmed)
 *
 * 이벤트 타입:
 * - Payment.Approved: 결제 승인 완료
 * - Payment.Canceled: 결제 취소
 * - Payment.Failed: 결제 실패
 *
 * 라우트: POST /api/payments/webhook
 */

const { Request, Response } = require('express');
import * from 'crypto';
const { db } = require('../../utils/database');

const TOSS_WEBHOOK_SECRET = process.env.TOSS_WEBHOOK_SECRET || '';
const RATE_LIMIT_PER_SECOND = 10;

// 이벤트 처리 이력 (메모리 캐시, Redis 권장)
const processedEvents = new Map<string, number>();

;
  createdAt;
}

/**
 * 서명 검증 (Toss Webhook Secret)
 */
function verifyWebhookSignature(req) {
  const signature = req.headers['toss-signature'];

  if (!signature || !TOSS_WEBHOOK_SECRET) {
    console.warn('⚠️ [Webhook] Missing signature or secret');
    return false;
  }

  try {
    const body = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', TOSS_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      console.error('❌ [Webhook] Signature verification failed');
    }

    return isValid;
  } catch (error) {
    console.error('❌ [Webhook] Signature verification error:', error);
    return false;
  }
}

/**
 * Idempotency 체크 (이벤트 중복 처리 방지)
 */
function isEventProcessed(eventId) {
  const lastProcessed = processedEvents.get(eventId);

  if (lastProcessed) {
    const ageMinutes = (Date.now() - lastProcessed) / 1000 / 60;
    if (ageMinutes < 60) {
      console.log(`🔁 [Webhook] Event already processed: ${eventId}`);
      return true;
    }
    // 1시간 이상 지난 기록 삭제
    processedEvents.delete(eventId);
  }

  return false;
}

/**
 * 이벤트 처리 기록
 */
function markEventProcessed(eventId) {
  processedEvents.set(eventId, Date.now());

  // 메모리 캐시 크기 제한 (1000개)
  if (processedEvents.size > 1000) {
    const oldest = Array.from(processedEvents.entries())
      .sort(([, a], [, b]) => a - b)[0];
    processedEvents.delete(oldest[0]);
  }
}

/**
 * Payment.Approved 이벤트 처리
 * → bookings.status: hold → confirmed
 * → bookings.payment_status: pending → paid
 */
async function handlePaymentApproved(event) {
  const { paymentKey, orderId, totalAmount, approvedAt } = event.data;

  console.log(`💳 [Webhook] Payment Approved: ${orderId} (${totalAmount.toLocaleString()}원)`);

  try {
    // 1. 예약 조회 (orderId = booking_number)
    const bookings = await db.query(`
      SELECT id, booking_number, status, payment_status, total_amount
      FROM bookings
      WHERE booking_number = ?
      LIMIT 1
    `, [orderId]);

    if (bookings.length === 0) {
      console.error(`❌ [Webhook] Booking not found: ${orderId}`);
      throw new Error(`BOOKING_NOT_FOUND: ${orderId}`);
    }

    const booking = bookings[0];

    // 2. 금액 검증
    if (booking.total_amount !== totalAmount) {
      console.error(`❌ [Webhook] Amount mismatch: Expected ${booking.total_amount}, Got ${totalAmount}`);
      throw new Error(`AMOUNT_MISMATCH: ${booking.total_amount} != ${totalAmount}`);
    }

    // 3. 예약 상태 업데이트
    await db.execute(`
      UPDATE bookings
      SET
        status = 'confirmed',
        payment_status = 'paid',
        payment_key = ?,
        payment_approved_at = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [paymentKey, approvedAt || new Date().toISOString(), booking.id]);

    console.log(`✅ [Webhook] Booking confirmed: ${orderId} (ID: ${booking.id})`);

    // 4. 예약 로그 기록
    await db.execute(`
      INSERT INTO booking_logs (booking_id, action, details, created_at)
      VALUES (?, 'PAYMENT_CONFIRMED', ?, NOW())
    `, [
      booking.id,
      JSON.stringify({
        paymentKey,
        amount: totalAmount,
        approvedAt,
        event: 'Payment.Approved'
      })
    ]);

    // 5. 이벤트 기록 (payments_events 테이블)
    await db.execute(`
      INSERT INTO payment_events (
        event_id, event_type, booking_id, payment_key, amount, raw_payload, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NOW())
    `, [
      crypto.randomUUID(),
      'Payment.Approved',
      booking.id,
      paymentKey,
      totalAmount,
      JSON.stringify(event)
    ]);

    console.log(`📝 [Webhook] Event recorded`);

  } catch (error) {
    console.error(`❌ [Webhook] Error processing Payment.Approved:`, error);
    throw error;
  }
}

/**
 * Payment.Canceled 이벤트 처리
 */
async function handlePaymentCanceled(event) {
  const { paymentKey, orderId, canceledAt } = event.data;

  console.log(`❌ [Webhook] Payment Canceled: ${orderId}`);

  try {
    const bookings = await db.query(`
      SELECT id FROM bookings WHERE booking_number = ? LIMIT 1
    `, [orderId]);

    if (bookings.length === 0) {
      console.warn(`⚠️ [Webhook] Booking not found for cancel: ${orderId}`);
      return;
    }

    const booking = bookings[0];

    await db.execute(`
      UPDATE bookings
      SET
        status = 'canceled',
        payment_status = 'refunded',
        updated_at = NOW()
      WHERE id = ?
    `, [booking.id]);

    console.log(`✅ [Webhook] Booking canceled: ${orderId}`);

    // 로그 기록
    await db.execute(`
      INSERT INTO booking_logs (booking_id, action, details, created_at)
      VALUES (?, 'PAYMENT_CANCELED', ?, NOW())
    `, [booking.id, JSON.stringify({ paymentKey, canceledAt })]);

  } catch (error) {
    console.error(`❌ [Webhook] Error processing Payment.Canceled:`, error);
    throw error;
  }
}

/**
 * 웹훅 메인 핸들러
 */


/**
 * Rate Limiting 체크 (간단 구현)
 */
const requestCounts = new Map<string, { count; resetAt }>();



// IP 화이트리스트 (선택 사항)
const ALLOWED_IPS = (process.env.TOSS_WEBHOOK_IPS || '').split(',').filter(Boolean);



module.exports = async function handler(req, res) {
};
