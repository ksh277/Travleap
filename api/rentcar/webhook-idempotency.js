/**
 * Toss Payments Webhook 멱등성 처리
 *
 * 목적:
 * - Toss Payments는 동일한 이벤트를 여러 번 보낼 수 있음 (재시도 로직)
 * - 동일한 payment_key로 중복 처리를 방지해야 함
 *
 * 방법:
 * - rentcar_webhook_events 테이블에 payment_key + event_type을 UNIQUE 제약조건으로 저장
 * - 중복 이벤트 시 INSERT 실패 → 이미 처리됨으로 간주
 *
 * 사용법:
 * - webhook API에서 이벤트 처리 전에 checkIdempotency() 호출
 * - 이미 처리된 이벤트면 200 OK 반환 (재처리 안함)
 */

const { db } = require('../../utils/database');
const crypto = require('crypto');

/**
 * 웹훅 이벤트 멱등성 체크
 *
 * @param {string} paymentKey - Toss Payments payment_key
 * @param {string} eventType - 이벤트 타입 (PAYMENT_CONFIRMED, REFUND_COMPLETED 등)
 * @param {object} eventData - 이벤트 데이터 (JSON)
 * @returns {Promise<{isProcessed: boolean, eventId: number|null}>}
 */
async function checkIdempotency(paymentKey, eventType, eventData = {}) {
  try {
    // 1. 기존 이벤트 조회
    const existing = await db.query(`
      SELECT id, processed_at, event_data
      FROM rentcar_webhook_events
      WHERE payment_key = ?
        AND event_type = ?
      LIMIT 1
    `, [paymentKey, eventType]);

    // 2. 이미 처리된 이벤트
    if (existing.length > 0) {
      console.log(`🔁 [Idempotency] Event already processed:
        - Payment Key: ${paymentKey}
        - Event Type: ${eventType}
        - Processed At: ${existing[0].processed_at}
        - Event ID: ${existing[0].id}`
      );

      return {
        isProcessed: true,
        eventId: existing[0].id,
        message: 'Event already processed'
      };
    }

    // 3. 신규 이벤트 - 저장 시도 (UNIQUE 제약조건으로 동시성 제어)
    try {
      const result = await db.execute(`
        INSERT INTO rentcar_webhook_events (
          payment_key,
          event_type,
          event_data,
          received_at,
          processed_at
        ) VALUES (?, ?, ?, NOW(), NOW())
      `, [paymentKey, eventType, JSON.stringify(eventData)]);

      console.log(`✅ [Idempotency] New event registered:
        - Payment Key: ${paymentKey}
        - Event Type: ${eventType}
        - Event ID: ${result.insertId}`
      );

      return {
        isProcessed: false,
        eventId: result.insertId,
        message: 'New event - proceed with processing'
      };

    } catch (insertError) {
      // UNIQUE 제약조건 위반 - 동시 요청이 이미 저장함
      if (insertError.code === 'ER_DUP_ENTRY' || insertError.errno === 1062) {
        console.log(`🔁 [Idempotency] Duplicate entry detected (race condition):
          - Payment Key: ${paymentKey}
          - Event Type: ${eventType}`
        );

        // 다시 조회하여 event_id 반환
        const recheck = await db.query(`
          SELECT id FROM rentcar_webhook_events
          WHERE payment_key = ? AND event_type = ?
          LIMIT 1
        `, [paymentKey, eventType]);

        return {
          isProcessed: true,
          eventId: recheck[0]?.id || null,
          message: 'Event already processed (race condition)'
        };
      }

      // 다른 에러는 throw
      throw insertError;
    }

  } catch (error) {
    console.error('❌ [Idempotency] Error checking idempotency:', error);
    throw error;
  }
}

/**
 * 웹훅 이벤트 처리 완료 표시
 *
 * @param {number} eventId - rentcar_webhook_events.id
 * @param {string} status - 'success' | 'failed'
 * @param {string} errorMessage - 에러 메시지 (실패 시)
 */
async function markEventProcessed(eventId, status = 'success', errorMessage = null) {
  try {
    await db.execute(`
      UPDATE rentcar_webhook_events
      SET
        status = ?,
        error_message = ?,
        processed_at = NOW()
      WHERE id = ?
    `, [status, errorMessage, eventId]);

    console.log(`✅ [Idempotency] Event marked as ${status}: ${eventId}`);

  } catch (error) {
    console.error(`❌ [Idempotency] Failed to mark event ${eventId}:`, error);
  }
}

/**
 * 웹훅 이벤트 조회 (디버깅용)
 *
 * @param {string} paymentKey - Toss Payments payment_key
 * @returns {Promise<Array>} 이벤트 목록
 */
async function getWebhookEvents(paymentKey) {
  try {
    const events = await db.query(`
      SELECT
        id,
        payment_key,
        event_type,
        status,
        received_at,
        processed_at,
        error_message
      FROM rentcar_webhook_events
      WHERE payment_key = ?
      ORDER BY received_at DESC
    `, [paymentKey]);

    return events;

  } catch (error) {
    console.error('❌ [Idempotency] Error fetching events:', error);
    return [];
  }
}

/**
 * 웹훅 서명 검증 (HMAC-SHA256)
 *
 * Toss Payments 웹훅 보안:
 * - 웹훅이 실제로 Toss Payments에서 온 것인지 검증
 * - HMAC-SHA256 서명 검증
 *
 * @param {string} payload - 웹훅 요청 body (raw string)
 * @param {string} signature - X-Toss-Signature 헤더 값
 * @param {string} webhookSecret - 웹훅 시크릿 키 (Toss Payments 콘솔에서 발급)
 * @returns {boolean} 서명이 유효하면 true
 */
function verifyWebhookSignature(payload, signature, webhookSecret) {
  try {
    if (!signature || !webhookSecret) {
      console.warn('⚠️  [Webhook] Missing signature or secret');
      return false;
    }

    // HMAC-SHA256 서명 생성
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(payload);
    const computedSignature = hmac.digest('base64');

    // 서명 비교 (timing-safe comparison)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature)
    );

    if (isValid) {
      console.log('✅ [Webhook] Signature verified successfully');
    } else {
      console.error('❌ [Webhook] Signature verification failed');
      console.error(`   Expected: ${computedSignature}`);
      console.error(`   Received: ${signature}`);
    }

    return isValid;

  } catch (error) {
    console.error('❌ [Webhook] Signature verification error:', error);
    return false;
  }
}

/**
 * 웹훅 미들웨어 - Express 미들웨어로 사용
 *
 * 사용 예시:
 * app.post('/api/rentcar/webhook', verifyWebhookMiddleware, async (req, res) => {
 *   // 서명이 검증된 경우만 여기 도달
 * });
 *
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {Function} next - Express next function
 */
function verifyWebhookMiddleware(req, res, next) {
  const signature = req.headers['x-toss-signature'];
  const webhookSecret = process.env.TOSS_WEBHOOK_SECRET;

  // 개발 환경에서는 검증 스킵 가능 (선택적)
  if (process.env.NODE_ENV === 'development' && !webhookSecret) {
    console.warn('⚠️  [Webhook] Skipping signature verification in development (no webhook secret)');
    return next();
  }

  if (!webhookSecret) {
    console.error('❌ [Webhook] TOSS_WEBHOOK_SECRET not configured');
    return res.status(500).json({
      success: false,
      error: 'Webhook secret not configured'
    });
  }

  // req.body는 이미 JSON 파싱된 상태이므로 raw body 필요
  // body-parser에서 rawBody를 저장해야 함
  const rawBody = req.rawBody || JSON.stringify(req.body);

  const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);

  if (!isValid) {
    console.error('❌ [Webhook] Invalid signature - possible security threat');
    return res.status(401).json({
      success: false,
      error: 'Invalid webhook signature',
      message: 'Webhook signature verification failed'
    });
  }

  // 서명이 유효하면 다음 핸들러로 진행
  next();
}

module.exports = {
  checkIdempotency,
  markEventProcessed,
  getWebhookEvents,
  verifyWebhookSignature,
  verifyWebhookMiddleware
};
