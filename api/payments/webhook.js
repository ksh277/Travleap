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

const crypto = require('crypto');
const { db } = require('../../utils/database.cjs');
const { getTossWebhookSecret, getTossMode } = require('../../utils/toss-config');
const { notifyError, notifyPaymentFailure, notifyWebhookFailure, notifyOrderCompleted } = require('../../utils/slack-notifier.cjs');

// TOSS_MODE에 따라 자동으로 TEST/LIVE webhook secret 선택
const TOSS_WEBHOOK_SECRET = getTossWebhookSecret();
const RATE_LIMIT_PER_SECOND = 10;

// 서버 시작 시 Webhook Secret 설정 확인
if (TOSS_WEBHOOK_SECRET) {
  console.log(`✅ [Webhook] Toss Webhook Secret 설정됨 (${getTossMode()} 모드)`);
} else {
  console.warn(`⚠️  [Webhook] Toss Webhook Secret 미설정 - 서명 검증이 비활성화됩니다.`);
}

// 이벤트 처리 이력 (메모리 캐시, Redis 권장)
const processedEvents = new Map();

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
      // Slack 알림: 웹훅 검증 실패
      notifyWebhookFailure('Signature verification failed', {
        signature: signature?.substring(0, 20) + '...',
        mode: getTossMode()
      }).catch(err => console.error('Slack notification failed:', err));
    }

    return isValid;
  } catch (error) {
    console.error('❌ [Webhook] Signature verification error:', error);
    // Slack 알림: 검증 에러
    notifyError('Webhook Signature Verification Error', error, {
      mode: getTossMode()
    }).catch(err => console.error('Slack notification failed:', err));
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
    // 🔒 0. 멱등성 보장 - INSERT OR IGNORE (UNIQUE 제약조건 활용)
    try {
      // UNIQUE 제약조건 (payment_key, event_type)으로 멱등성 보장
      // 중복 시 INSERT 실패 → 이미 처리된 이벤트로 간주
      await db.execute(`
        INSERT INTO payment_events (
          event_id, event_type, payment_key, amount, raw_payload, created_at
        ) VALUES (?, ?, ?, ?, ?, NOW())
      `, [
        crypto.randomUUID(),
        'Payment.Approved',
        paymentKey,
        totalAmount,
        JSON.stringify(event)
      ]);

      console.log(`✅ [Webhook] Event recorded in payment_events (idempotency ensured)`);
    } catch (duplicateError) {
      // ER_DUP_ENTRY (1062): UNIQUE 제약조건 위반 → 중복 이벤트
      if (duplicateError.code === 'ER_DUP_ENTRY' || duplicateError.errno === 1062) {
        console.log(`⚠️  [Webhook] Duplicate event detected (UNIQUE constraint): ${paymentKey}`);
        return; // 이미 처리된 이벤트이므로 무시
      }

      // 다른 에러는 경고만 하고 계속 진행 (테이블 없음 등)
      console.warn(`⚠️  [Webhook] Idempotency check skipped (${duplicateError.message})`);
    }

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
    // ✅ payment_key, approved_at 등 결제 상세 정보는 payments 테이블에 저장됨
    // ✅ 배송 상태도 PENDING → READY로 변경
    await db.execute(`
      UPDATE bookings
      SET
        status = 'confirmed',
        payment_status = 'paid',
        delivery_status = IF(delivery_status IS NOT NULL, 'READY', delivery_status),
        updated_at = NOW()
      WHERE id = ?
    `, [booking.id]);

    console.log(`✅ [Webhook] Booking confirmed: ${orderId} (ID: ${booking.id})`);

    // Slack 알림: 주문 완료
    notifyOrderCompleted({
      orderNumber: orderId,
      productName: 'Booking',
      totalAmount: totalAmount
    }).catch(err => console.error('Slack notification failed:', err));

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

    // Note: payment_events 이벤트 기록은 이미 위에서 완료됨 (멱등성 체크 단계)

  } catch (error) {
    console.error(`❌ [Webhook] Error processing Payment.Approved:`, error);
    // Slack 알림: 결제 승인 처리 오류
    notifyError('Payment.Approved Processing Error', error, {
      orderId,
      paymentKey,
      amount: totalAmount
    }).catch(err => console.error('Slack notification failed:', err));
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
    // orderId가 ORDER_로 시작하면 장바구니 주문 → payments에서 bookingIds 조회
    let bookings = [];

    if (orderId.startsWith('ORDER_')) {
      // 장바구니 주문: payments 테이블에서 bookingIds 조회
      const payments = await db.query(`
        SELECT notes FROM payments WHERE gateway_transaction_id = ? LIMIT 1
      `, [orderId]);

      if (payments.length > 0 && payments[0].notes) {
        try {
          const notes = JSON.parse(payments[0].notes);
          if (notes.bookingIds && notes.bookingIds.length > 0) {
            bookings = await db.query(`
              SELECT id, listing_id, num_adults, selected_options
              FROM bookings
              WHERE id IN (${notes.bookingIds.map(() => '?').join(',')})
            `, notes.bookingIds);
          }
        } catch (parseError) {
          console.warn(`⚠️ [Webhook] Failed to parse payment notes:`, parseError);
        }
      }
    } else {
      // 단일 예약: booking_number로 직접 조회
      bookings = await db.query(`
        SELECT id, listing_id, num_adults, selected_options
        FROM bookings
        WHERE booking_number = ?
      `, [orderId]);
    }

    if (bookings.length === 0) {
      console.warn(`⚠️ [Webhook] Booking not found for cancel: ${orderId}`);
      return;
    }

    // 모든 bookings에 대해 재고 복구
    for (const booking of bookings) {
      // 재고 복구 (결제 취소 시)
      if (booking.selected_options) {
        try {
          const options = JSON.parse(booking.selected_options);
          if (options && options.id) {
            await db.execute(`
              UPDATE product_options
              SET stock = stock + ?
              WHERE id = ? AND stock IS NOT NULL
            `, [booking.num_adults, options.id]);
            console.log(`✅ [Webhook] Stock restored for option ${options.id}: +${booking.num_adults}`);
          }
        } catch (parseError) {
          console.warn(`⚠️ [Webhook] Failed to parse selected_options:`, parseError);
        }
      } else if (booking.listing_id) {
        // 옵션이 없는 경우 상품 레벨 재고 복구
        await db.execute(`
          UPDATE listings
          SET stock = stock + ?
          WHERE id = ? AND stock_enabled = 1 AND stock IS NOT NULL
        `, [booking.num_adults, booking.listing_id]);
        console.log(`✅ [Webhook] Stock restored for listing ${booking.listing_id}: +${booking.num_adults}`);
      }

      // ✅ ENUM 값 수정: 'canceled' → 'cancelled' (double 'l')
      await db.execute(`
        UPDATE bookings
        SET
          status = 'cancelled',
          payment_status = 'refunded',
          updated_at = NOW()
        WHERE id = ?
      `, [booking.id]);

      // 로그 기록
      await db.execute(`
        INSERT INTO booking_logs (booking_id, action, details, created_at)
        VALUES (?, 'PAYMENT_CANCELED', ?, NOW())
      `, [booking.id, JSON.stringify({ paymentKey, canceledAt })]);
    }

    console.log(`✅ [Webhook] ${bookings.length} booking(s) cancelled and stock restored: ${orderId}`);

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
const requestCounts = new Map();

function checkRateLimit(ip) {
  const now = Math.floor(Date.now() / 1000); // 현재 초
  const key = `${ip}:${now}`;

  const count = requestCounts.get(key) || 0;

  if (count >= RATE_LIMIT_PER_SECOND) {
    console.warn(`⚠️  [Webhook] Rate limit exceeded: ${ip} (${count} requests/sec)`);
    return false;
  }

  requestCounts.set(key, count + 1);

  // 오래된 키 삭제 (메모리 관리)
  if (requestCounts.size > 1000) {
    const oldKeys = Array.from(requestCounts.keys())
      .filter(k => parseInt(k.split(':')[1]) < now - 60);
    oldKeys.forEach(k => requestCounts.delete(k));
  }

  return true;
}

// IP 화이트리스트 (선택 사항)
const ALLOWED_IPS = (process.env.TOSS_WEBHOOK_IPS || '').split(',').filter(Boolean);

function checkIPWhitelist(ip) {
  // IP 화이트리스트가 설정되지 않았으면 모든 IP 허용
  if (ALLOWED_IPS.length === 0) {
    return true;
  }

  return ALLOWED_IPS.includes(ip);
}

/**
 * 웹훅 메인 핸들러
 */
module.exports = async function handler(req, res) {
  try {
    // 1. POST 메서드만 허용
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    // 2. IP 화이트리스트 체크 (선택 사항)
    const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (!checkIPWhitelist(clientIp)) {
      console.error(`❌ [Webhook] IP not whitelisted: ${clientIp}`);
      return res.status(403).json({
        success: false,
        error: 'Forbidden'
      });
    }

    // 3. Rate Limiting
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests'
      });
    }

    // 4. 서명 검증 (보안)
    if (!verifyWebhookSignature(req)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    const event = req.body;

    if (!event || !event.eventId || !event.eventType) {
      console.error('❌ [Webhook] Invalid event format:', event);
      return res.status(400).json({
        success: false,
        error: 'Invalid event format'
      });
    }

    // 5. Idempotency 체크 (중복 처리 방지)
    if (isEventProcessed(event.eventId)) {
      console.log(`⏭️  [Webhook] Event already processed: ${event.eventId}`);
      return res.status(200).json({
        success: true,
        message: 'Event already processed'
      });
    }

    console.log(`📥 [Webhook] Event received: ${event.eventType} (${event.eventId})`);

    // 6. 이벤트 타입별 처리
    switch (event.eventType) {
      case 'Payment.Approved':
        await handlePaymentApproved(event);
        break;

      case 'Payment.Canceled':
        await handlePaymentCanceled(event);
        break;

      case 'Payment.Failed':
        console.log(`❌ [Webhook] Payment Failed: ${event.data?.orderId || 'unknown'}`);
        // 실패 처리 로직 (필요 시 구현)
        break;

      default:
        console.warn(`⚠️  [Webhook] Unknown event type: ${event.eventType}`);
    }

    // 7. 이벤트 처리 완료 기록
    markEventProcessed(event.eventId);

    // 8. 성공 응답 (Toss에게 200 OK 응답 필수)
    return res.status(200).json({
      success: true,
      message: 'Event processed'
    });

  } catch (error) {
    console.error('❌ [Webhook] Handler error:', error);

    // 에러가 발생해도 200 OK를 반환하여 Toss가 재시도하지 않도록 함
    // (중요한 에러의 경우 별도 알림 시스템으로 처리)
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
