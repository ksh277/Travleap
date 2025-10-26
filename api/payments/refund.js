/**
 * 결제 환불 API
 *
 * 기능:
 * - Toss Payments를 통한 결제 취소/환불 처리
 * - 전액 환불 및 부분 환불 지원
 * - 환불 정책에 따른 수수료 계산
 *
 * 라우트: POST /api/payments/refund
 */

const { db } = require('../../utils/database');
const { tossPayments } = require('../../utils/toss-payments');

/**
 * 환불 정책 조회 (DB에서 가져오기)
 *
 * @param {number} listingId - 상품 ID
 * @param {string} category - 카테고리
 * @param {number} vendorId - 벤더 ID
 * @returns {Object} 환불 정책
 */
async function getRefundPolicyFromDB(listingId, category, vendorId) {
  try {
    // 우선순위: 1) 특정 상품 정책 > 2) 카테고리 정책 > 3) 벤더 정책 > 4) 기본 정책
    const policies = await db.query(`
      SELECT *
      FROM refund_policies
      WHERE is_active = TRUE
        AND (
          listing_id = ? OR
          category = ? OR
          vendor_id = ? OR
          (listing_id IS NULL AND category IS NULL AND vendor_id IS NULL)
        )
      ORDER BY priority DESC, id DESC
      LIMIT 1
    `, [listingId, category, vendorId]);

    if (policies.length > 0) {
      return policies[0];
    }

    // 기본 정책 (fallback - 하드코딩)
    return {
      policy_name: '기본 환불정책',
      is_refundable: true,
      refund_policy_json: {
        rules: [
          { days_before: 10, fee_rate: 0, description: '10일 전 무료 취소' },
          { days_before: 7, fee_rate: 0.1, description: '9~7일 전 10% 수수료' },
          { days_before: 3, fee_rate: 0.2, description: '6~3일 전 20% 수수료' },
          { days_before: 1, fee_rate: 0.3, description: '2~1일 전 30% 수수료' },
          { days_before: 0, fee_rate: 0.5, description: '당일 50% 수수료' }
        ],
        past_booking_refundable: false
      }
    };
  } catch (error) {
    console.error('환불 정책 조회 실패:', error);
    // 에러 발생 시 기본 정책 반환
    return {
      policy_name: '기본 환불정책',
      is_refundable: true,
      refund_policy_json: {
        rules: [
          { days_before: 10, fee_rate: 0, description: '10일 전 무료 취소' },
          { days_before: 7, fee_rate: 0.1, description: '9~7일 전 10% 수수료' },
          { days_before: 3, fee_rate: 0.2, description: '6~3일 전 20% 수수료' },
          { days_before: 1, fee_rate: 0.3, description: '2~1일 전 30% 수수료' },
          { days_before: 0, fee_rate: 0.5, description: '당일 50% 수수료' }
        ],
        past_booking_refundable: false
      }
    };
  }
}

/**
 * 환불 정책 계산 (DB 정책 기반)
 *
 * @param {Object} booking - 예약 정보
 * @param {Object} policy - DB에서 조회한 환불 정책
 * @param {Date} now - 현재 시각
 * @returns {Object} { refundable: boolean, refundAmount: number, cancellationFee: number }
 */
function calculateRefundPolicy(booking, policy, now = new Date()) {
  const totalAmount = booking.total_amount || booking.amount || 0;

  // 1. 환불 불가 정책인지 확인
  if (!policy.is_refundable) {
    return {
      refundable: false,
      refundAmount: 0,
      cancellationFee: totalAmount,
      reason: policy.refund_disabled_reason || '이 상품은 환불이 불가능합니다.',
      policyName: policy.policy_name
    };
  }

  // 2. 예약 시작일 확인
  const startDate = new Date(booking.start_date || booking.booking_date);
  const daysUntilStart = Math.floor((startDate - now) / (1000 * 60 * 60 * 24));

  // 3. 예약일 지났는지 확인
  const policyJson = typeof policy.refund_policy_json === 'string'
    ? JSON.parse(policy.refund_policy_json)
    : policy.refund_policy_json;

  if (daysUntilStart < 0 && !policyJson.past_booking_refundable) {
    return {
      refundable: false,
      refundAmount: 0,
      cancellationFee: totalAmount,
      reason: '예약 시작일이 지나서 환불이 불가능합니다.',
      policyName: policy.policy_name
    };
  }

  // 4. 정책 규칙에서 수수료율 찾기
  let cancellationFeeRate = 0.5; // 기본값 (매칭 안 되면 50%)
  let matchedRule = null;

  const rules = policyJson.rules || [];
  // days_before 내림차순 정렬
  rules.sort((a, b) => b.days_before - a.days_before);

  for (const rule of rules) {
    if (daysUntilStart >= rule.days_before) {
      cancellationFeeRate = rule.fee_rate;
      matchedRule = rule;
      break;
    }
  }

  // 5. 환불 금액 계산
  const cancellationFee = Math.floor(totalAmount * cancellationFeeRate);
  const refundAmount = totalAmount - cancellationFee;

  return {
    refundable: true,
    refundAmount,
    cancellationFee,
    daysUntilStart,
    cancellationFeeRate: `${cancellationFeeRate * 100}%`,
    policyName: policy.policy_name,
    appliedRule: matchedRule ? matchedRule.description : '규칙 없음'
  };
}

/**
 * 환불 처리
 *
 * @param {Object} params
 * @param {string} params.paymentKey - Toss Payments 결제 키
 * @param {string} params.cancelReason - 환불 사유
 * @param {number} [params.cancelAmount] - 부분 환불 금액 (없으면 전액 환불)
 * @param {boolean} [params.skipPolicy] - 환불 정책 무시 (관리자 전용)
 */
async function refundPayment({ paymentKey, cancelReason, cancelAmount, skipPolicy = false }) {
  try {
    console.log(`💰 [Refund] 환불 요청 시작: paymentKey=${paymentKey}, reason=${cancelReason}`);

    // 1. DB에서 결제 정보 + 상품 정보 조회
    const payments = await db.query(`
      SELECT
        p.*,
        b.start_date, b.booking_date, b.total_amount as booking_amount, b.id as booking_id,
        l.id as listing_id, l.category, l.vendor_id
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN listings l ON b.listing_id = l.id
      WHERE p.payment_key = ?
      LIMIT 1
    `, [paymentKey]);

    if (payments.length === 0) {
      throw new Error('PAYMENT_NOT_FOUND: 결제 정보를 찾을 수 없습니다.');
    }

    const payment = payments[0];

    // 2. 이미 환불된 결제인지 확인
    if (payment.payment_status === 'refunded' || payment.status === 'refunded') {
      throw new Error('ALREADY_REFUNDED: 이미 환불된 결제입니다.');
    }

    // 3. 환불 정책 계산 (skipPolicy가 false일 때만)
    let actualRefundAmount = cancelAmount || payment.amount;
    let policyInfo = null;

    if (!skipPolicy && payment.booking_id) {
      // 3-1. DB에서 환불 정책 조회
      const policyFromDB = await getRefundPolicyFromDB(
        payment.listing_id,
        payment.category,
        payment.vendor_id
      );

      console.log(`📋 [Refund] 적용 정책: ${policyFromDB.policy_name}`);

      // 3-2. 정책 기반 환불 금액 계산
      policyInfo = calculateRefundPolicy(payment, policyFromDB);

      if (!policyInfo.refundable) {
        throw new Error(`REFUND_POLICY_VIOLATION: ${policyInfo.reason}`);
      }

      // 부분 환불이 아니면 정책에 따른 환불 금액 적용
      if (!cancelAmount) {
        actualRefundAmount = policyInfo.refundAmount;
      }

      console.log(`📋 [Refund] 환불 정책 적용: ${policyInfo.policyName} - ${policyInfo.appliedRule}, 수수료 ${policyInfo.cancellationFeeRate}, ${policyInfo.daysUntilStart}일 전 취소`);
    }

    // 4. Toss Payments API로 환불 요청
    console.log(`🔄 [Refund] Toss Payments API 호출 중... (금액: ${actualRefundAmount.toLocaleString()}원)`);

    const refundResult = await tossPayments.cancelPayment({
      paymentKey,
      cancelReason,
      cancelAmount: actualRefundAmount > 0 ? actualRefundAmount : undefined
    });

    console.log(`✅ [Refund] Toss Payments 환불 완료:`, refundResult);

    // 5. DB 업데이트 - payments 테이블
    await db.execute(`
      UPDATE payments
      SET
        payment_status = 'refunded',
        refund_amount = ?,
        refund_reason = ?,
        refunded_at = NOW(),
        updated_at = NOW()
      WHERE payment_key = ?
    `, [actualRefundAmount, cancelReason, paymentKey]);

    console.log(`✅ [Refund] payments 테이블 업데이트 완료`);

    // 6. DB 업데이트 - bookings 테이블 (있는 경우)
    if (payment.booking_id) {
      // ✅ cancelled_at 컬럼이 bookings 테이블에 없으므로 제외
      await db.execute(`
        UPDATE bookings
        SET
          status = 'cancelled',
          payment_status = 'refunded',
          cancellation_reason = ?,
          updated_at = NOW()
        WHERE id = ?
      `, [cancelReason, payment.booking_id]);

      console.log(`✅ [Refund] bookings 테이블 업데이트 완료 (booking_id: ${payment.booking_id})`);

      // 7. 포인트 환불 처리 (사용된 포인트가 있는 경우)
      if (payment.points_used && payment.points_used > 0 && payment.user_id) {
        try {
          const { refundPoints } = require('../../utils/points-system.js');

          const pointsRefundResult = await refundPoints(
            payment.user_id,
            payment.points_used,
            `주문 취소로 인한 포인트 환불 (주문번호: ${payment.order_number || payment.booking_id})`,
            payment.order_number || payment.booking_id
          );

          if (pointsRefundResult.success) {
            console.log(`✅ [Refund] 포인트 환불 완료: ${payment.points_used}P → user_id: ${payment.user_id}`);
          } else {
            console.error(`❌ [Refund] 포인트 환불 실패:`, pointsRefundResult.message);
            // 포인트 환불 실패해도 전체 환불은 계속 진행 (수동 처리 필요)
          }
        } catch (pointsError) {
          console.error(`❌ [Refund] 포인트 환불 오류:`, pointsError);
          // 포인트 시스템 에러가 있어도 환불은 계속 진행
        }
      }

      // 8. 예약 로그 기록
      await db.execute(`
        INSERT INTO booking_logs (booking_id, action, details, created_at)
        VALUES (?, 'REFUND_PROCESSED', ?, NOW())
      `, [
        payment.booking_id,
        JSON.stringify({
          paymentKey,
          refundAmount: actualRefundAmount,
          pointsRefunded: payment.points_used || 0,
          cancelReason,
          refundedAt: new Date().toISOString()
        })
      ]);

      console.log(`📝 [Refund] booking_logs 기록 완료`);
    }

    // 8. 성공 응답
    return {
      success: true,
      message: '환불이 완료되었습니다.',
      refundAmount: actualRefundAmount,
      paymentKey,
      bookingId: payment.booking_id,
      refundedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`❌ [Refund] 환불 처리 실패:`, error);

    // Toss Payments API 에러 처리
    if (error.message) {
      return {
        success: false,
        message: error.message,
        code: error.code || 'REFUND_FAILED'
      };
    }

    return {
      success: false,
      message: '환불 처리 중 오류가 발생했습니다.',
      code: 'REFUND_ERROR'
    };
  }
}

/**
 * 환불 가능 여부 조회
 *
 * @param {string} paymentKey - Toss Payments 결제 키
 */
async function getRefundPolicy(paymentKey) {
  try {
    const payments = await db.query(`
      SELECT
        p.*,
        b.start_date, b.booking_date, b.total_amount as booking_amount,
        l.id as listing_id, l.category, l.vendor_id
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN listings l ON b.listing_id = l.id
      WHERE p.payment_key = ?
      LIMIT 1
    `, [paymentKey]);

    if (payments.length === 0) {
      throw new Error('결제 정보를 찾을 수 없습니다.');
    }

    const payment = payments[0];

    if (payment.payment_status === 'refunded') {
      return {
        success: true,
        refundable: false,
        reason: '이미 환불된 결제입니다.',
        payment
      };
    }

    // DB에서 환불 정책 조회
    const policyFromDB = await getRefundPolicyFromDB(
      payment.listing_id,
      payment.category,
      payment.vendor_id
    );

    // 정책 기반 환불 계산
    const policy = calculateRefundPolicy(payment, policyFromDB);

    return {
      success: true,
      ...policy,
      payment: {
        paymentKey: payment.payment_key,
        amount: payment.amount,
        bookingId: payment.booking_id,
        approvedAt: payment.approved_at
      }
    };

  } catch (error) {
    console.error('환불 정책 조회 실패:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Export functions
module.exports = {
  refundPayment,
  getRefundPolicy,
  getRefundPolicyFromDB,
  calculateRefundPolicy
};
