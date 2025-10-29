/**
 * 결제 환불 API
 *
 * 기능:
 * - Toss Payments를 통한 결제 취소/환불 처리
 * - 전액 환불 및 부분 환불 지원
 * - 환불 정책에 따른 수수료 계산
 * - ✅ 재고 복구 (옵션 + 상품)
 * - ✅ 적립 포인트 회수 (Dual DB)
 * - ✅ 장바구니 주문 환불 지원
 *
 * 라우트: POST /api/payments/refund
 */

const { connect } = require('@planetscale/database');

// Toss Payments 설정
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
const TOSS_API_BASE = 'https://api.tosspayments.com/v1';

/**
 * Toss Payments API - 결제 취소
 */
async function cancelTossPayment(paymentKey, cancelReason, cancelAmount = null) {
  try {
    console.log(`🚫 결제 취소 요청: ${paymentKey} (사유: ${cancelReason})`);

    const body = { cancelReason };
    if (cancelAmount) {
      body.cancelAmount = cancelAmount;
    }

    const response = await fetch(`${TOSS_API_BASE}/payments/${paymentKey}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
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
 * 환불 정책 조회 (DB에서 가져오기)
 *
 * @param {Object} connection - PlanetScale connection
 * @param {number} listingId - 상품 ID
 * @param {string} category - 카테고리
 * @param {number} vendorId - 벤더 ID
 * @returns {Object} 환불 정책
 */
async function getRefundPolicyFromDB(connection, listingId, category) {
  try {
    // 우선순위: 1) 특정 상품 정책 > 2) 카테고리 정책 > 3) 기본 정책
    const policies = await connection.execute(`
      SELECT *
      FROM refund_policies
      WHERE is_active = TRUE
        AND (
          listing_id = ? OR
          category = ? OR
          (listing_id IS NULL AND category IS NULL)
        )
      ORDER BY priority DESC, id DESC
      LIMIT 1
    `, [listingId, category]);

    if (policies.rows && policies.rows.length > 0) {
      return policies.rows[0];
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
  const startDate = new Date(booking.start_date);
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
 * 재고 복구 처리
 *
 * @param {Object} connection - PlanetScale connection
 * @param {number} bookingId - 예약 ID
 */
async function restoreStock(connection, bookingId) {
  try {
    console.log(`📦 [재고 복구] booking_id=${bookingId} 재고 복구 시작`);

    // 1. booking 정보 조회
    const bookingResult = await connection.execute(`
      SELECT listing_id, selected_option_id, guests
      FROM bookings
      WHERE id = ?
    `, [bookingId]);

    if (!bookingResult.rows || bookingResult.rows.length === 0) {
      console.warn(`⚠️ [재고 복구] booking을 찾을 수 없음: ${bookingId}`);
      return;
    }

    const booking = bookingResult.rows[0];
    const quantity = booking.guests || 1;

    // 2. 옵션 재고 복구
    if (booking.selected_option_id) {
      const optionResult = await connection.execute(`
        UPDATE product_options
        SET stock = stock + ?
        WHERE id = ? AND stock IS NOT NULL
      `, [quantity, booking.selected_option_id]);

      if (optionResult.affectedRows > 0) {
        console.log(`✅ [재고 복구] 옵션 재고 복구 완료: option_id=${booking.selected_option_id}, +${quantity}개`);
      } else {
        console.log(`ℹ️ [재고 복구] 옵션 재고 관리 비활성화 (option_id=${booking.selected_option_id})`);
      }
    }

    // 3. 상품 재고 복구
    if (booking.listing_id) {
      const listingResult = await connection.execute(`
        UPDATE listings
        SET stock = stock + ?
        WHERE id = ? AND stock IS NOT NULL AND stock_enabled = 1
      `, [quantity, booking.listing_id]);

      if (listingResult.affectedRows > 0) {
        console.log(`✅ [재고 복구] 상품 재고 복구 완료: listing_id=${booking.listing_id}, +${quantity}개`);
      } else {
        console.log(`ℹ️ [재고 복구] 상품 재고 관리 비활성화 (listing_id=${booking.listing_id})`);
      }
    }

  } catch (error) {
    console.error(`❌ [재고 복구] 실패 (booking_id=${bookingId}):`, error);
    // 재고 복구 실패해도 환불은 계속 진행 (수동 처리 필요)
  }
}

/**
 * 적립 포인트 회수 처리 (Dual DB)
 *
 * @param {Object} connection - PlanetScale connection
 * @param {number} userId - 사용자 ID
 * @param {string} orderNumber - 주문 번호
 */
async function deductEarnedPoints(connection, userId, orderNumber) {
  try {
    console.log(`💰 [포인트 회수] user_id=${userId}, order_number=${orderNumber}`);

    // 1. PlanetScale에서 해당 주문으로 적립된 포인트 조회 (정확한 매칭)
    let earnedPointsResult = await connection.execute(`
      SELECT points, id, related_order_id
      FROM user_points
      WHERE user_id = ? AND related_order_id = ? AND point_type = 'earn' AND points > 0
      ORDER BY created_at DESC
    `, [userId, orderNumber]);

    // 정확한 매칭이 안되면 LIKE 검색 시도
    if (!earnedPointsResult.rows || earnedPointsResult.rows.length === 0) {
      console.log(`⚠️ [포인트 회수] 정확한 매칭 실패, LIKE 검색 시도...`);

      // ORDER_로 시작하는 경우, 숫자 부분만 추출해서 LIKE 검색
      const orderPattern = orderNumber.replace(/^ORDER_/, '').split('_')[0]; // 타임스탬프 부분 추출

      earnedPointsResult = await connection.execute(`
        SELECT points, id, related_order_id
        FROM user_points
        WHERE user_id = ?
          AND point_type = 'earn'
          AND points > 0
          AND related_order_id LIKE ?
        ORDER BY created_at DESC
        LIMIT 10
      `, [userId, `%${orderPattern}%`]);

      console.log(`💰 [포인트 회수] LIKE 검색 결과: ${earnedPointsResult.rows?.length || 0}건`);
    }

    if (!earnedPointsResult.rows || earnedPointsResult.rows.length === 0) {
      console.log(`ℹ️ [포인트 회수] 적립된 포인트가 없음 (order_number=${orderNumber})`);

      // 디버그: 최근 적립 내역 5개 조회
      const debugResult = await connection.execute(`
        SELECT related_order_id, points, created_at
        FROM user_points
        WHERE user_id = ? AND point_type = 'earn' AND points > 0
        ORDER BY created_at DESC
        LIMIT 5
      `, [userId]);

      console.log(`🔍 [포인트 회수] 최근 적립 내역 (디버그):`, debugResult.rows);

      return 0;
    }

    // ✅ 모든 적립 포인트 합산 (여러 적립 내역이 있을 경우 대비)
    const pointsToDeduct = earnedPointsResult.rows.reduce((sum, row) => sum + (row.points || 0), 0);
    console.log(`💰 [포인트 회수] 총 ${earnedPointsResult.rows.length}건의 적립 내역, 합계: ${pointsToDeduct}P`);

    // 2. Neon PostgreSQL에서 현재 포인트 조회 및 차감
    const { Pool } = require('@neondatabase/serverless');
    const poolNeon = new Pool({
      connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
    });

    try {
      // 트랜잭션 시작
      await poolNeon.query('BEGIN');

      const userResult = await poolNeon.query(`
        SELECT total_points FROM users WHERE id = $1 FOR UPDATE
      `, [userId]);

      if (!userResult.rows || userResult.rows.length === 0) {
        console.error(`❌ [포인트 회수] 사용자를 찾을 수 없음: user_id=${userId}`);
        return 0;
      }

      const currentPoints = userResult.rows[0].total_points || 0;
      const newBalance = Math.max(0, currentPoints - pointsToDeduct); // 음수 방지

      // 3. Neon - users 테이블 포인트 차감
      await poolNeon.query(`
        UPDATE users SET total_points = $1 WHERE id = $2
      `, [newBalance, userId]);

      // 4. PlanetScale - user_points 테이블에 회수 내역 추가
      await connection.execute(`
        INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after, created_at)
        VALUES (?, ?, 'deduct', ?, ?, ?, NOW())
      `, [userId, -pointsToDeduct, `환불로 인한 포인트 회수 (주문번호: ${orderNumber})`, orderNumber, newBalance]);

      // 트랜잭션 커밋
      await poolNeon.query('COMMIT');

      console.log(`✅ [포인트 회수] ${pointsToDeduct}P 회수 완료 (user_id=${userId}, 잔액: ${newBalance}P)`);

      return pointsToDeduct;

    } catch (error) {
      // 롤백
      try {
        await poolNeon.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('❌ [포인트 회수] 롤백 실패:', rollbackError);
      }
      throw error;
    } finally {
      // ✅ Connection pool 정리 (에러 발생해도 반드시 실행)
      await poolNeon.end();
    }

  } catch (error) {
    console.error(`❌ [포인트 회수] 실패 (user_id=${userId}):`, error);
    return 0;
  }
}

/**
 * 사용된 포인트 환불 처리 (Dual DB)
 *
 * @param {Object} connection - PlanetScale connection
 * @param {number} userId - 사용자 ID
 * @param {number} pointsUsed - 사용한 포인트
 * @param {string} orderNumber - 주문 번호
 */
async function refundUsedPoints(connection, userId, pointsUsed, orderNumber) {
  try {
    console.log(`💰 [포인트 환불] user_id=${userId}, points=${pointsUsed}P`);

    // 1. Neon PostgreSQL에서 현재 포인트 조회
    const { Pool } = require('@neondatabase/serverless');
    const poolNeon = new Pool({
      connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
    });

    try {
      // 트랜잭션 시작
      await poolNeon.query('BEGIN');

      const userResult = await poolNeon.query(`
        SELECT total_points FROM users WHERE id = $1 FOR UPDATE
      `, [userId]);

      if (!userResult.rows || userResult.rows.length === 0) {
        console.error(`❌ [포인트 환불] 사용자를 찾을 수 없음: user_id=${userId}`);
        return false;
      }

      const currentPoints = userResult.rows[0].total_points || 0;
      const newBalance = currentPoints + pointsUsed;

      // 2. Neon - users 테이블 포인트 환불
      await poolNeon.query(`
        UPDATE users SET total_points = $1 WHERE id = $2
      `, [newBalance, userId]);

      // 3. PlanetScale - user_points 테이블에 환불 내역 추가
      await connection.execute(`
        INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after, created_at)
        VALUES (?, ?, 'refund', ?, ?, ?, NOW())
      `, [userId, pointsUsed, `주문 취소로 인한 포인트 환불 (주문번호: ${orderNumber})`, orderNumber, newBalance]);

      // 트랜잭션 커밋
      await poolNeon.query('COMMIT');

      console.log(`✅ [포인트 환불] ${pointsUsed}P 환불 완료 (user_id=${userId}, 잔액: ${newBalance}P)`);

      return true;

    } catch (error) {
      // 롤백
      try {
        await poolNeon.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('❌ [포인트 환불] 롤백 실패:', rollbackError);
      }
      throw error;
    } finally {
      // ✅ Connection pool 정리 (에러 발생해도 반드시 실행)
      await poolNeon.end();
    }

  } catch (error) {
    console.error(`❌ [포인트 환불] 실패 (user_id=${userId}):`, error);
    return false;
  }
}

/**
 * 환불 처리 (완전 재작성)
 *
 * @param {Object} params
 * @param {string} params.paymentKey - Toss Payments 결제 키
 * @param {string} params.cancelReason - 환불 사유
 * @param {number} [params.cancelAmount] - 부분 환불 금액 (없으면 전액 환불)
 * @param {boolean} [params.skipPolicy] - 환불 정책 무시 (관리자 전용)
 */
async function refundPayment({ paymentKey, cancelReason, cancelAmount, skipPolicy = false }) {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log(`💰 [Refund] 환불 요청 시작: paymentKey=${paymentKey}, reason=${cancelReason}`);

    // 1. DB에서 결제 정보 조회 (delivery_status 포함)
    const paymentResult = await connection.execute(`
      SELECT
        p.*,
        b.id as booking_id,
        b.start_date,
        b.total_amount as booking_amount,
        b.listing_id,
        b.selected_option_id,
        b.guests,
        b.order_number,
        b.booking_number,
        b.delivery_status,
        l.category
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN listings l ON b.listing_id = l.id
      WHERE p.payment_key = ?
      LIMIT 1
    `, [paymentKey]);

    if (!paymentResult.rows || paymentResult.rows.length === 0) {
      throw new Error('PAYMENT_NOT_FOUND: 결제 정보를 찾을 수 없습니다.');
    }

    const payment = paymentResult.rows[0];

    // 2. 이미 환불된 결제인지 확인
    if (payment.payment_status === 'refunded') {
      throw new Error('ALREADY_REFUNDED: 이미 환불된 결제입니다.');
    }

    // 3. 환불 정책 계산 (skipPolicy가 false일 때만)
    let actualRefundAmount = cancelAmount || payment.amount;
    let policyInfo = null;

    if (!skipPolicy && payment.booking_id) {
      // 3-1. DB에서 환불 정책 조회
      const policyFromDB = await getRefundPolicyFromDB(
        connection,
        payment.listing_id,
        payment.category
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

    // 3-3. 팝업 카테고리 배송 기반 환불 정책 적용 (skipPolicy=false일 때만)
    if (!skipPolicy && payment.category === '팝업' && payment.delivery_status) {
      console.log(`📦 [Refund] 팝업 상품 배송 기반 환불 정책 적용 (delivery_status: ${payment.delivery_status})`);

      // 배송비 추출
      let deliveryFee = 0;
      if (payment.notes) {
        try {
          const notesData = typeof payment.notes === 'string' ? JSON.parse(payment.notes) : payment.notes;
          deliveryFee = notesData.deliveryFee || 0;
          console.log(`💰 [Refund] 배송비: ${deliveryFee}원`);
        } catch (e) {
          console.error('⚠️ [Refund] notes 파싱 실패:', e);
        }
      }

      const RETURN_FEE = 3000; // 반품비 3,000원
      const isDefectOrWrongItem = cancelReason.includes('하자') || cancelReason.includes('오배송');

      if (isDefectOrWrongItem) {
        // 판매자 귀책사유 → 전액 환불
        actualRefundAmount = payment.amount;
        console.log(`💰 [Refund] 상품 하자/오배송 → 전액 환불: ${actualRefundAmount}원`);
      } else if (payment.delivery_status === 'shipped' || payment.delivery_status === 'delivered') {
        // 배송 중 or 배송 완료 → 배송비 + 반품비 차감
        const deduction = deliveryFee + RETURN_FEE;
        actualRefundAmount = Math.max(0, payment.amount - deduction);
        console.log(`💰 [Refund] 배송 중/완료 → 배송비(${deliveryFee}원) + 반품비(${RETURN_FEE}원) 차감 = ${actualRefundAmount}원 환불`);
      } else {
        // 배송 전 (pending or null) → 전액 환불
        actualRefundAmount = payment.amount;
        console.log(`💰 [Refund] 배송 전 → 전액 환불: ${actualRefundAmount}원`);
      }
    } else if (!skipPolicy && payment.category === '팝업' && !payment.delivery_status) {
      // 배송 상태가 없는 경우 (배송 전) → 전액 환불
      actualRefundAmount = payment.amount;
      console.log(`💰 [Refund] 팝업 상품 배송 전 → 전액 환불: ${actualRefundAmount}원`);
    } else if (payment.category !== '팝업') {
      // 팝업이 아닌 상품은 기존 환불 정책 적용 (위에서 계산된 actualRefundAmount 사용)
      console.log(`💰 [Refund] 비팝업 카테고리 → 기존 정책 적용: ${actualRefundAmount}원`);
    }

    // 🔒 4. DB 트랜잭션 시작 (Problem #37, #39 해결: Toss 환불 전에 DB 작업 먼저 수행)
    console.log(`🔒 [Refund] DB 트랜잭션 시작 - 재고/포인트/상태 변경 처리`);
    await connection.execute('START TRANSACTION');

    // 5. 장바구니 주문 여부 확인
    const isCartOrder = payment.order_number && payment.order_number.startsWith('ORDER_');

    // 6. 장바구니 주문이면 모든 bookings 조회
    let bookingsToRefund = [];

    if (isCartOrder) {
      const bookingsResult = await connection.execute(`
        SELECT id, listing_id, selected_option_id, guests
        FROM bookings
        WHERE order_number = ? AND status != 'cancelled'
      `, [payment.order_number]);

      bookingsToRefund = bookingsResult.rows || [];
      console.log(`📦 [Refund] 장바구니 주문: ${bookingsToRefund.length}개 예약 환불 처리`);
    } else if (payment.booking_id) {
      // 단일 예약
      bookingsToRefund = [{ id: payment.booking_id, listing_id: payment.listing_id, selected_option_id: payment.selected_option_id, guests: payment.guests }];
    }

    // 7. 각 booking에 대해 재고 복구
    for (const booking of bookingsToRefund) {
      await restoreStock(connection, booking.id);
    }

    // 8. bookings 상태 변경
    if (isCartOrder) {
      await connection.execute(`
        UPDATE bookings
        SET status = 'cancelled',
            payment_status = 'refunded',
            cancellation_reason = ?,
            updated_at = NOW()
        WHERE order_number = ?
      `, [cancelReason, payment.order_number]);

      console.log(`✅ [Refund] ${bookingsToRefund.length}개 예약 취소 완료`);
    } else if (payment.booking_id) {
      await connection.execute(`
        UPDATE bookings
        SET status = 'cancelled',
            payment_status = 'refunded',
            cancellation_reason = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [cancelReason, payment.booking_id]);

      console.log(`✅ [Refund] 예약 취소 완료 (booking_id: ${payment.booking_id})`);
    }

    // 9. payments 테이블 업데이트
    await connection.execute(`
      UPDATE payments
      SET payment_status = 'refunded',
          refund_amount = ?,
          refund_reason = ?,
          refunded_at = NOW(),
          updated_at = NOW()
      WHERE payment_key = ?
    `, [actualRefundAmount, cancelReason, paymentKey]);

    console.log(`✅ [Refund] payments 테이블 업데이트 완료`);

    // 10. 포인트 처리 (적립 포인트 회수 + 사용 포인트 환불)
    // ✅ 장바구니 주문은 order_number, 단일 예약은 booking_number, gateway_transaction_id, 없으면 booking_id 사용
    const refundOrderId = payment.order_number || payment.booking_number || payment.gateway_transaction_id || `BOOKING_${payment.booking_id}`;

    console.log(`💰 [Refund] 포인트 처리 시작 - user_id: ${payment.user_id}, refundOrderId: ${refundOrderId}`);
    console.log(`💰 [Refund] Debug - order_number: ${payment.order_number}, booking_number: ${payment.booking_number}, gateway_transaction_id: ${payment.gateway_transaction_id}, booking_id: ${payment.booking_id}`);

    if (payment.user_id && refundOrderId) {
      // 10-1. 적립된 포인트 회수
      const deductedPoints = await deductEarnedPoints(connection, payment.user_id, refundOrderId);
      console.log(`✅ [Refund] 포인트 회수 완료: ${deductedPoints}P`);

      // 10-2. 사용한 포인트 환불 (notes에서 추출)
      if (payment.notes) {
        try {
          const notes = typeof payment.notes === 'string' ? JSON.parse(payment.notes) : payment.notes;
          const pointsUsed = notes.pointsUsed || 0;

          if (pointsUsed > 0) {
            await refundUsedPoints(connection, payment.user_id, pointsUsed, refundOrderId);
            console.log(`✅ [Refund] 사용 포인트 환불 완료: ${pointsUsed}P`);
          }
        } catch (notesError) {
          console.error('⚠️ [Refund] notes 파싱 실패:', notesError);
        }
      }
    } else {
      console.warn(`⚠️ [Refund] 포인트 처리 스킵 - user_id: ${payment.user_id}, refundOrderId: ${refundOrderId}`);
    }

    // 11. 예약 로그 기록
    if (payment.booking_id) {
      try {
        await connection.execute(`
          INSERT INTO booking_logs (booking_id, action, details, created_at)
          VALUES (?, 'REFUND_PROCESSED', ?, NOW())
        `, [
          payment.booking_id,
          JSON.stringify({
            paymentKey,
            refundAmount: actualRefundAmount,
            cancelReason,
            refundedAt: new Date().toISOString()
          })
        ]);
        console.log(`📝 [Refund] booking_logs 기록 완료`);
      } catch (logError) {
        console.warn('⚠️ [Refund] booking_logs 기록 실패 (계속 진행):', logError);
      }
    }

    // 12. 트랜잭션 커밋 (DB 작업 완료)
    await connection.execute('COMMIT');
    console.log(`✅ [Refund] DB 트랜잭션 커밋 완료 - 재고/포인트/상태 변경 성공`);

    // 13. 🔄 Toss Payments API로 환불 요청 (DB 작업 성공 후 실행 - Problem #37 해결)
    console.log(`🔄 [Refund] Toss Payments API 호출 중... (금액: ${actualRefundAmount.toLocaleString()}원)`);

    const refundResult = await cancelTossPayment(
      paymentKey,
      cancelReason,
      actualRefundAmount > 0 ? actualRefundAmount : undefined
    );

    console.log(`✅ [Refund] Toss Payments 환불 완료:`, refundResult);

    // 14. 성공 응답
    return {
      success: true,
      message: '환불이 완료되었습니다.',
      refundAmount: actualRefundAmount,
      paymentKey,
      bookingId: payment.booking_id,
      orderNumber: payment.order_number,
      refundedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error(`❌ [Refund] 환불 처리 실패:`, error);

    // 트랜잭션 롤백
    try {
      await connection.execute('ROLLBACK');
      console.log(`🔙 [Refund] DB 트랜잭션 롤백 완료`);
    } catch (rollbackError) {
      console.error(`❌ [Refund] 롤백 실패:`, rollbackError);
    }

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
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const paymentResult = await connection.execute(`
      SELECT
        p.*,
        b.start_date, b.total_amount as booking_amount,
        l.id as listing_id, l.category
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN listings l ON b.listing_id = l.id
      WHERE p.payment_key = ?
      LIMIT 1
    `, [paymentKey]);

    if (!paymentResult.rows || paymentResult.rows.length === 0) {
      throw new Error('결제 정보를 찾을 수 없습니다.');
    }

    const payment = paymentResult.rows[0];

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
      connection,
      payment.listing_id,
      payment.category
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

/**
 * API 핸들러
 */
module.exports = async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const { paymentKey, cancelReason, cancelAmount, skipPolicy } = req.body;

    if (!paymentKey) {
      return res.status(400).json({
        success: false,
        message: 'paymentKey is required'
      });
    }

    if (!cancelReason) {
      return res.status(400).json({
        success: false,
        message: 'cancelReason is required'
      });
    }

    console.log(`📥 [Refund API] Request: paymentKey=${paymentKey}, reason=${cancelReason}`);

    const result = await refundPayment({
      paymentKey,
      cancelReason,
      cancelAmount,
      skipPolicy: skipPolicy || false
    });

    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ [Refund API] Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '환불 처리 중 오류가 발생했습니다.'
    });
  }
};
