/**
 * 결제 승인 API
 *
 * Toss Payments에서 결제 완료 후 우리 서버로 돌아왔을 때 호출
 * HOLD 상태의 예약을 CONFIRMED로 변경하고 결제 정보를 기록
 */

const { connect } = require('@planetscale/database');
// const { notifyPartnerNewBooking } = require('../../utils/notification'); // TODO: 구현 필요

// Toss Payments 설정
const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY;
const TOSS_API_BASE = 'https://api.tosspayments.com/v1';

// 환경변수 확인 및 디버깅
console.log('🔑 [Toss] Secret Key exists:', !!TOSS_SECRET_KEY);
if (!TOSS_SECRET_KEY) {
  console.error('❌ TOSS_SECRET_KEY not found in environment variables');
}

/**
 * Toss Payments API - 결제 승인
 */
async function approveTossPayment({ paymentKey, orderId, amount }) {
  try {
    console.log('💳 Toss Payments 결제 승인 요청:', { paymentKey, orderId, amount });

    const response = await fetch(`${TOSS_API_BASE}/payments/confirm`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ paymentKey, orderId, amount })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Toss Payments 승인 실패:', error);
      throw new Error(`결제 승인 실패: ${error.message || response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Toss Payments 승인 성공:', result);
    return result;

  } catch (error) {
    console.error('❌ 결제 승인 중 오류:', error);
    throw error;
  }
}

/**
 * Toss Payments API - 결제 취소
 */
async function cancelTossPayment(paymentKey, cancelReason) {
  try {
    console.log(`🚫 결제 취소 요청: ${paymentKey} (사유: ${cancelReason})`);

    const response = await fetch(`${TOSS_API_BASE}/payments/${paymentKey}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(TOSS_SECRET_KEY + ':').toString('base64')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ cancelReason })
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
 * Toss Payments method 값을 DB ENUM으로 변환
 *
 * Toss API method 값:
 * - "카드" (card)
 * - "가상계좌" (virtual_account)
 * - "계좌이체" (transfer)
 * - "휴대폰" (mobile_phone)
 * - "간편결제" (easy_payment) - 카카오페이, 네이버페이 등
 *
 * DB ENUM: 'card', 'bank_transfer', 'kakaopay', 'naverpay', 'samsung_pay'
 */
function normalizePaymentMethod(tossMethod, easyPayProvider = null) {
  // Toss method를 소문자로 변환
  const method = (tossMethod || '').toLowerCase();

  // 직접 매칭
  if (method === 'card' || method === '카드') {
    return 'card';
  }

  if (method === 'transfer' || method === '계좌이체' || method === 'bank_transfer') {
    return 'bank_transfer';
  }

  // 간편결제는 provider로 구분
  if (method === 'easy_payment' || method === '간편결제') {
    const provider = (easyPayProvider || '').toLowerCase();

    if (provider.includes('kakao') || provider.includes('카카오')) {
      return 'kakaopay';
    }
    if (provider.includes('naver') || provider.includes('네이버')) {
      return 'naverpay';
    }
    if (provider.includes('samsung') || provider.includes('삼성')) {
      return 'samsung_pay';
    }

    // 기본값: 카드로 처리
    return 'card';
  }

  // 가상계좌는 계좌이체로 처리
  if (method === 'virtual_account' || method === '가상계좌') {
    return 'bank_transfer';
  }

  // 알 수 없는 경우 기본값: card
  console.warn(`⚠️  알 수 없는 결제 수단: ${tossMethod}, 기본값 'card' 사용`);
  return 'card';
}

/**
 * 결제 승인 처리
 *
 * 1. Toss Payments API로 결제 승인 요청
 * 2. 결제 정보 검증
 * 3. 예약/주문 상태 변경 (HOLD → CONFIRMED 또는 pending → confirmed)
 * 4. 결제 정보 기록 (payments 테이블)
 * 5. 로그 기록
 *
 * @param {Object} params
 * @param {string} params.paymentKey - Toss Payments 결제 키
 * @param {string} params.orderId - 주문 ID (booking_number 또는 order_id)
 * @param {number} params.amount - 결제 금액
 */
async function confirmPayment({ paymentKey, orderId, amount }) {
  // ⚠️ 트랜잭션 외부 변수 (롤백 시 필요)
  let tossApproved = false;
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('💳 [결제 승인] 시작:', { paymentKey, orderId, amount });

    // 🔒 Idempotency 체크: 이미 처리된 paymentKey인지 확인
    const existingPayment = await connection.execute(
      'SELECT id, booking_id, order_id, payment_key, amount FROM payments WHERE payment_key = ? AND payment_status = "paid"',
      [paymentKey]
    );

    if (existingPayment && existingPayment.rows && existingPayment.rows.length > 0) {
      const existing = existingPayment.rows[0];
      console.log(`✅ [Idempotency] Payment already processed: ${paymentKey}`);

      return {
        success: true,
        message: '결제가 이미 처리되었습니다. (중복 요청 방지)',
        bookingId: existing.booking_id,
        orderId: existing.order_id,
        paymentKey: existing.payment_key,
        amount: existing.amount,
        idempotent: true
      };
    }

    console.log('✅ [Idempotency] 신규 결제 요청 확인');

    // 1. Toss Payments API로 결제 승인 요청 (트랜잭션 외부)
    const paymentResult = await approveTossPayment({
      paymentKey,
      orderId,
      amount
    });

    tossApproved = true; // 승인 완료 플래그
    console.log('✅ [Toss Payments] 결제 승인 완료:', paymentResult);

    // 🔒 DB 작업 시작
    console.log('🔒 [Database] DB 작업 시작');

    // 2. orderId로 예약 또는 주문 찾기
    // orderId는 booking_number (BK-...) 또는 ORDER_... 형식
    const isBooking = orderId.startsWith('BK-');
    const isOrder = orderId.startsWith('ORDER_');

    let bookingId = null;
    let orderId_num = null;
    let userId = null;
    let order = null; // 장바구니 주문 정보 (isOrder일 때 사용)

    if (isBooking) {
      // 예약 (단일 상품 결제)
      const bookings = await connection.execute(
        'SELECT * FROM bookings WHERE booking_number = ?',
        [orderId]
      );

      if (!bookings || !bookings.rows || bookings.rows.length === 0) {
        throw new Error('예약을 찾을 수 없습니다.');
      }

      const booking = bookings.rows[0];
      bookingId = booking.id;
      userId = booking.user_id;

      // ✅ 금액 검증 추가 (보안 강화)
      // ⚠️ DECIMAL 타입과 INT 타입 비교 문제 해결: 숫자로 변환 후 오차 허용
      const expectedAmount = parseFloat(booking.total_amount || 0);
      const actualAmount = parseFloat(amount);
      const difference = Math.abs(expectedAmount - actualAmount);

      // 1원 이하 오차 허용 (부동소수점 연산 및 타입 변환 오차)
      if (difference > 1) {
        console.error(`❌ [금액 검증 실패] 예상: ${expectedAmount}원, 실제: ${actualAmount}원, 차이: ${difference}원`);
        throw new Error(`AMOUNT_MISMATCH: 결제 금액이 일치하지 않습니다. (예상: ${expectedAmount}원, 실제: ${actualAmount}원)`);
      }

      console.log(`✅ [금액 검증] ${actualAmount}원 일치 확인 (차이: ${difference}원)`);

      // 3. 예약 상태 변경 (HOLD → CONFIRMED)
      // ✅ 배송 상태도 PENDING → READY로 변경 (결제 완료 = 배송 준비)
      await connection.execute(
        `UPDATE bookings
         SET status = 'confirmed',
             payment_status = 'paid',
             delivery_status = IF(delivery_status IS NOT NULL, 'READY', delivery_status),
             updated_at = NOW()
         WHERE id = ?`,
        [bookingId]
      );

      console.log(`✅ [예약] 상태 변경: HOLD → CONFIRMED + 배송준비 (booking_id: ${bookingId})`);

      // 파트너에게 새 예약 알림 전송
      // TODO: notifyPartnerNewBooking 구현 후 주석 해제
      // try {
      //   await notifyPartnerNewBooking(bookingId);
      //   console.log('✅ [알림] 파트너에게 새 예약 알림 전송 완료');
      // } catch (notifyError) {
      //   console.warn('⚠️  [알림] 파트너 알림 전송 실패 (계속 진행):', notifyError);
      // }
      console.log(`📧 [알림] TODO: 파트너 ${bookingId} 알림 전송 구현 필요`);

    } else if (isOrder) {
      // 주문 (장바구니 결제)
      // 🔧 카테고리별로 분리된 payments를 모두 조회
      const orders = await connection.execute(
        'SELECT * FROM payments WHERE gateway_transaction_id = ? ORDER BY id ASC',
        [orderId]
      );

      if (!orders || !orders.rows || orders.rows.length === 0) {
        throw new Error('주문을 찾을 수 없습니다.');
      }

      const allPayments = orders.rows; // 모든 카테고리 payments
      console.log(`📦 [Orders] ${allPayments.length}개 카테고리 payments 조회됨`);

      // 첫 번째 payment를 기준으로 사용 (쿠폰/포인트 정보 포함)
      order = allPayments[0];
      orderId_num = order.id;
      userId = order.user_id;

      // ✅ 금액 검증: 모든 payments의 합계가 Toss 결제 금액과 일치하는지 확인
      const totalExpectedAmount = allPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      const actualAmount = parseFloat(amount);
      const difference = Math.abs(totalExpectedAmount - actualAmount);

      // 1원 이하 오차 허용 (부동소수점 연산 및 타입 변환 오차)
      if (difference > 1) {
        console.error(`❌ [금액 검증 실패] 예상: ${totalExpectedAmount}원 (${allPayments.length}개 카테고리), 실제: ${actualAmount}원, 차이: ${difference}원`);
        throw new Error(`AMOUNT_MISMATCH: 결제 금액이 일치하지 않습니다. (예상: ${totalExpectedAmount}원, 실제: ${actualAmount}원)`);
      }

      console.log(`✅ [금액 검증] ${actualAmount}원 일치 확인 (${allPayments.length}개 카테고리, 차이: ${difference}원)`);

      // 3. 모든 카테고리 payments의 상태 변경 (pending → paid)
      for (const payment of allPayments) {
        await connection.execute(
          `UPDATE payments
           SET payment_status = 'paid',
               updated_at = NOW()
           WHERE id = ?`,
          [payment.id]
        );
        console.log(`✅ [주문] payment_id=${payment.id} 상태 변경: pending → paid`);
      }

      // ✅ 포인트 차감을 쿠폰 사용보다 먼저 처리 (Problem #33 해결)
      // 포인트 차감 실패 시 쿠폰이 소진되지 않도록 순서 변경
      const notes = order.notes ? JSON.parse(order.notes) : null;
      const pointsUsed = notes?.pointsUsed || 0;

      if (pointsUsed > 0 && userId) {
        // ✅ Neon PostgreSQL Pool (users 테이블용)
        const { Pool } = require('@neondatabase/serverless');
        const poolNeon = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL });

        try {
          console.log(`💰 [Points] 포인트 차감 시작: ${pointsUsed}P (user_id: ${userId})`);

          // 1. 트랜잭션 시작 (FOR UPDATE를 위해 필수)
          await poolNeon.query('BEGIN');

          // 2. 현재 포인트 조회 (동시성 제어를 위해 FOR UPDATE)
          const userResult = await poolNeon.query(`
            SELECT total_points FROM users WHERE id = $1 FOR UPDATE
          `, [userId]);

          if (userResult && userResult.rows && userResult.rows.length > 0) {
            const currentPoints = userResult.rows[0].total_points || 0;

            // 3. 포인트 부족 체크 (동시 사용으로 인한 부족 가능)
            if (currentPoints < pointsUsed) {
              console.error(`❌ [Points] 포인트 부족: 현재 ${currentPoints}P, 필요 ${pointsUsed}P`);
              throw new Error(`포인트가 부족합니다. (보유: ${currentPoints}P, 사용: ${pointsUsed}P)`);
            }

            const newBalance = currentPoints - pointsUsed;

            // 4. 포인트 내역 추가 (PlanetScale - user_points 테이블)
            await connection.execute(`
              INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after, created_at)
              VALUES (?, ?, 'use', ?, ?, ?, NOW())
            `, [userId, -pointsUsed, `주문 결제 (주문번호: ${orderId})`, orderId, newBalance]);

            // 5. 사용자 포인트 업데이트 (Neon - users 테이블)
            await poolNeon.query(`
              UPDATE users SET total_points = $1 WHERE id = $2
            `, [newBalance, userId]);

            // 6. 트랜잭션 커밋
            await poolNeon.query('COMMIT');

            console.log(`✅ [Points] 포인트 차감 완료: -${pointsUsed}P (잔액: ${newBalance}P)`);
          }
        } catch (pointsError) {
          console.error('❌ [Points] 포인트 차감 실패:', pointsError);
          // 롤백
          try {
            await poolNeon.query('ROLLBACK');
          } catch (rollbackError) {
            console.error('❌ [Points] 롤백 실패:', rollbackError);
          }
          // 포인트 차감 실패는 결제 실패로 처리
          throw new Error(`포인트 차감 실패: ${pointsError.message}`);
        } finally {
          // ✅ Connection pool 정리 (에러 발생해도 반드시 실행)
          await poolNeon.end();
        }
      }

      // ✅ 쿠폰 사용 처리 (포인트 차감 성공 후 실행 - Problem #33 해결)
      try {
        if (notes && notes.couponCode) {
          console.log(`🎟️ [쿠폰] 쿠폰 사용 처리: ${notes.couponCode}`);

          // 🔒 FOR UPDATE 락으로 동시성 제어
          const couponCheck = await connection.execute(`
            SELECT usage_limit, used_count
            FROM coupons
            WHERE code = ? AND is_active = TRUE
            FOR UPDATE
          `, [notes.couponCode.toUpperCase()]);

          if (couponCheck && couponCheck.rows && couponCheck.rows.length > 0) {
            const coupon = couponCheck.rows[0];

            // 사용 한도 재확인 (FOR UPDATE 락 획득 후)
            if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
              console.error(`⚠️ [쿠폰] 사용 한도 초과: ${notes.couponCode} (${coupon.used_count}/${coupon.usage_limit})`);
              // 한도 초과해도 결제는 성공 처리 (쿠폰만 미적용)
            } else {
              // 🔒 쿠폰 사용 횟수 증가 (동시성 제어: used_count < usage_limit 조건 추가)
              const updateResult = await connection.execute(`
                UPDATE coupons
                SET used_count = used_count + 1,
                    updated_at = NOW()
                WHERE code = ?
                  AND (usage_limit IS NULL OR used_count < usage_limit)
              `, [notes.couponCode.toUpperCase()]);

              // affectedRows 확인으로 동시성 충돌 감지
              if (updateResult.affectedRows === 0) {
                console.error(`⚠️ [쿠폰] 사용 한도 초과 (동시성 충돌): ${notes.couponCode} - 다른 사용자가 먼저 사용했을 수 있습니다.`);
                // 한도 초과해도 결제는 성공 처리 (쿠폰만 미적용)
              } else {
                // 쿠폰 사용 기록 저장
                try {
                  await connection.execute(`
                    INSERT INTO coupon_usage (
                      coupon_code, user_id, order_id, used_at
                    ) VALUES (?, ?, ?, NOW())
                  `, [notes.couponCode.toUpperCase(), userId, orderId]);
                } catch (usageError) {
                  // coupon_usage 테이블이 없으면 무시
                  console.log('⚠️ [쿠폰] coupon_usage 테이블 없음, 스킵');
                }

                console.log(`✅ [쿠폰] 쿠폰 사용 완료: ${notes.couponCode}`);
              }
            }
          }
        }
      } catch (couponError) {
        console.error('⚠️ [쿠폰] 사용 처리 실패 (계속 진행):', couponError);
      }

      // 장바구니 주문: notes 필드에서 items 추출하여 각 파트너에게 알림
      try {
        const notes = order.notes ? JSON.parse(order.notes) : null;
        if (notes && notes.items && Array.isArray(notes.items)) {
          console.log(`📦 [주문] ${notes.items.length}개 상품의 파트너에게 알림 전송 중...`);
          for (const item of notes.items) {
            if (item.listingId) {
              const listings = await connection.execute(
                'SELECT partner_id FROM listings WHERE id = ?',
                [item.listingId]
              );
              if (listings && listings.rows && listings.rows.length > 0 && listings.rows[0].partner_id) {
                console.log(`📧 [알림] 파트너 ${listings.rows[0].partner_id}에게 주문 알림: 상품 ${item.listingId}, 수량 ${item.quantity}`);
                // TODO: 실제 알림 전송 (이메일/SMS/푸시)
              }
            }
          }
        }
      } catch (notifyError) {
        console.warn('⚠️  [알림] 장바구니 주문 파트너 알림 실패 (계속 진행):', notifyError);
      }

    } else {
      throw new Error('올바르지 않은 주문 번호 형식입니다.');
    }

    // 4. 결제 정보 기록 (payments 테이블)
    // ✅ 단일 예약(BK-)만 INSERT, 장바구니(ORDER_)는 이미 UPDATE 완료
    if (isBooking) {
      // ✅ created_at, updated_at은 NOW()를 사용하여 DB에서 직접 생성 (타임존 문제 방지)
      // ✅ payment_method는 Toss API 값을 DB ENUM과 호환되도록 변환
      const normalizedMethod = normalizePaymentMethod(
        paymentResult.method,
        paymentResult.easyPay?.provider
      );

      await connection.execute(
        `INSERT INTO payments (
          user_id, booking_id, order_id, payment_key, order_id_str, amount,
          payment_method, payment_status, approved_at, receipt_url,
          card_company, card_number, card_installment,
          virtual_account_number, virtual_account_bank, virtual_account_due_date,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          userId,
          bookingId,
          orderId_num,
          paymentKey,
          orderId,
          paymentResult.totalAmount,
          normalizedMethod,  // ✅ 변환된 payment_method 사용
          'paid',  // ✅ payment_status ENUM: 'pending', 'paid', 'failed', 'refunded'
          paymentResult.approvedAt || null,
          paymentResult.receipt?.url || null,
          paymentResult.card?.company || null,
          paymentResult.card?.number || null,
          paymentResult.card?.installmentPlanMonths || 0,
          paymentResult.virtualAccount?.accountNumber || null,
          paymentResult.virtualAccount?.bank || null,
          paymentResult.virtualAccount?.dueDate || null
        ]
      );

      console.log('✅ [결제 기록] payments 테이블에 저장 완료');

      // ✅ 단일 예약에서도 청구 정보를 사용자 프로필에 저장
      try {
        const { Pool } = require('@neondatabase/serverless');
        const poolNeon = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL });

        // bookings 테이블에서 shipping 정보 가져오기
        const bookingResult = await connection.execute(
          'SELECT guest_phone, shipping_zipcode, shipping_address, shipping_address_detail FROM bookings WHERE id = ?',
          [bookingId]
        );

        if (bookingResult && bookingResult.rows && bookingResult.rows.length > 0) {
          const bookingData = bookingResult.rows[0];

          // 청구 정보가 있으면 사용자 프로필에 저장
          if (bookingData.guest_phone || bookingData.shipping_address) {
            await poolNeon.query(`
              UPDATE users
              SET phone = COALESCE(NULLIF($1, ''), phone),
                  postal_code = COALESCE(NULLIF($2, ''), postal_code),
                  address = COALESCE(NULLIF($3, ''), address),
                  detail_address = COALESCE(NULLIF($4, ''), detail_address),
                  updated_at = NOW()
              WHERE id = $5
            `, [
              bookingData.guest_phone,
              bookingData.shipping_zipcode,
              bookingData.shipping_address,
              bookingData.shipping_address_detail,
              userId
            ]);
            console.log(`✅ [사용자 정보] 단일 예약 청구 정보 업데이트 완료 (user_id: ${userId})`);
          }
        }
      } catch (updateError) {
        console.warn('⚠️  [사용자 정보] 업데이트 실패 (계속 진행):', updateError);
      }

    } else if (isOrder) {
      // 장바구니 주문: 이미 UPDATE로 payment_key 등 저장했으므로 추가 UPDATE만 수행
      const normalizedMethod = normalizePaymentMethod(
        paymentResult.method,
        paymentResult.easyPay?.provider
      );

      await connection.execute(
        `UPDATE payments
         SET payment_key = ?,
             payment_method = ?,
             approved_at = ?,
             receipt_url = ?,
             card_company = ?,
             card_number = ?,
             card_installment = ?,
             virtual_account_number = ?,
             virtual_account_bank = ?,
             virtual_account_due_date = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [
          paymentKey,
          normalizedMethod,
          paymentResult.approvedAt || null,
          paymentResult.receipt?.url || null,
          paymentResult.card?.company || null,
          paymentResult.card?.number || null,
          paymentResult.card?.installmentPlanMonths || 0,
          paymentResult.virtualAccount?.accountNumber || null,
          paymentResult.virtualAccount?.bank || null,
          paymentResult.virtualAccount?.dueDate || null,
          orderId_num
        ]
      );

      console.log('✅ [결제 기록] payments 테이블 업데이트 완료 (장바구니 주문)');
    }

    // 4.5. 포인트 적립 (팝업 상품 주문인 경우)
    if (isOrder) {
      // ✅ Neon PostgreSQL Pool (users 테이블용)
      const { Pool } = require('@neondatabase/serverless');
      const poolNeon = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL });

      try {
        // 트랜잭션 시작 (FOR UPDATE를 위해 필수)
        await poolNeon.query('BEGIN');

        // 사용자 정보 조회 (Neon - users 테이블)
        // ✅ FOR UPDATE 추가: 동시성 제어 (포인트 적립 중 다른 트랜잭션 차단)
        const userResult = await poolNeon.query('SELECT name, email, phone, total_points FROM users WHERE id = $1 FOR UPDATE', [userId]);

        if (userResult.rows && userResult.rows.length > 0) {
          const user = userResult.rows[0];

          // ✅ notes에서 원래 상품 금액(subtotal) 가져오기
          // 포인트 적립은 쿠폰/포인트 사용 전 원래 상품 금액 기준
          const notes = order.notes ? JSON.parse(order.notes) : null;
          const originalSubtotal = notes?.subtotal || 0;

          // 배송비 조회 (PlanetScale - bookings 테이블)
          const bookingsResult = await connection.execute(`
            SELECT SUM(IFNULL(shipping_fee, 0)) as total_shipping_fee
            FROM bookings
            WHERE order_number = ?
          `, [orderId]);

          const shippingFee = (bookingsResult.rows && bookingsResult.rows.length > 0 && bookingsResult.rows[0].total_shipping_fee) || 0;

          // 💰 포인트 적립 (2%, 원래 상품 금액 기준, 배송비 제외)
          try {
            const pointsToEarn = Math.floor(originalSubtotal * 0.02);
            if (pointsToEarn > 0) {
              console.log(`💰 [포인트] 포인트 적립 시작: ${pointsToEarn}P (user_id: ${userId})`);

              const currentPoints = user.total_points || 0;
              const newBalance = currentPoints + pointsToEarn;
              const expiresAt = new Date();
              expiresAt.setDate(expiresAt.getDate() + 365); // 1년 후 만료

              // 1. 포인트 내역 추가 (PlanetScale - user_points 테이블)
              await connection.execute(`
                INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after, expires_at, created_at)
                VALUES (?, ?, 'earn', ?, ?, ?, ?, NOW())
              `, [userId, pointsToEarn, `주문 적립 (주문번호: ${orderId})`, orderId, newBalance, expiresAt]);

              // 2. 사용자 포인트 업데이트 (Neon - users 테이블)
              await poolNeon.query(`
                UPDATE users SET total_points = $1 WHERE id = $2
              `, [newBalance, userId]);

              console.log(`✅ [포인트] ${pointsToEarn}P 적립 완료 (사용자 ${userId}, 잔액: ${newBalance}P)`);

              // 3. bookings 테이블에 적립 포인트 기록 (선택사항)
              try {
                await connection.execute(`
                  UPDATE bookings
                  SET points_earned = ?
                  WHERE order_number = ?
                `, [pointsToEarn, orderId]);
              } catch (bookingUpdateError) {
                console.warn('⚠️  [포인트] bookings 테이블 업데이트 실패 (계속 진행)');
              }
            }
          } catch (pointsError) {
            console.error('❌ [포인트] 포인트 적립 실패 (계속 진행):', pointsError);
            // 포인트 적립 실패해도 결제는 성공 처리
          }

          // 📧 결제 완료 알림 발송
          try {
            console.log(`📧 [알림] 결제 완료 알림 발송 시작: ${user.email}`);

            // items 정보 파싱
            let productName = '상품';
            let itemCount = 0;
            if (notes && notes.items && Array.isArray(notes.items)) {
              itemCount = notes.items.length;
              const firstItem = notes.items[0];
              const firstItemName = firstItem.title || firstItem.name || '';
              productName = itemCount > 1
                ? `${firstItemName} 외 ${itemCount - 1}개`
                : firstItemName;
            }

            // 알림 데이터 준비
            const notificationData = {
              customerName: user.name || '고객',
              customerEmail: user.email,
              customerPhone: user.phone || notes?.shippingInfo?.phone || null,
              orderNumber: orderId,
              orderDate: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
              productName: productName,
              quantity: itemCount,
              subtotal: originalSubtotal,
              deliveryFee: shippingFee,
              couponDiscount: notes?.couponDiscount || 0,
              pointsUsed: notes?.pointsUsed || 0,
              totalAmount: order.amount,
              pointsEarned: Math.floor(originalSubtotal * 0.02), // 2% 적립
              shippingName: notes?.shippingInfo?.name || null,
              shippingPhone: notes?.shippingInfo?.phone || null,
              shippingAddress: notes?.shippingInfo
                ? `${notes.shippingInfo.address} ${notes.shippingInfo.addressDetail || ''}`
                : null
            };

            // 알림 API 호출
            const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/notifications/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'payment_success',
                data: notificationData
              })
            });

            const notificationResult = await notificationResponse.json();

            if (notificationResult.success) {
              console.log(`✅ [알림] 결제 완료 알림 발송 완료: ${user.email}`);
            } else {
              console.error(`⚠️ [알림] 알림 발송 일부 실패:`, notificationResult);
            }
          } catch (notifyError) {
            console.error('❌ [알림] 결제 완료 알림 발송 실패 (계속 진행):', notifyError);
            // 알림 실패해도 결제는 성공 처리
          }

          // ✅ 청구 정보를 사용자 프로필에 저장 (shippingInfo가 있을 경우)
          if (notes && notes.shippingInfo) {
            try {
              await poolNeon.query(`
                UPDATE users
                SET phone = COALESCE(NULLIF($1, ''), phone),
                    postal_code = COALESCE(NULLIF($2, ''), postal_code),
                    address = COALESCE(NULLIF($3, ''), address),
                    detail_address = COALESCE(NULLIF($4, ''), detail_address),
                    updated_at = NOW()
                WHERE id = $5
              `, [
                notes.shippingInfo.phone,
                notes.shippingInfo.zipcode,
                notes.shippingInfo.address,
                notes.shippingInfo.addressDetail,
                userId
              ]);
              console.log(`✅ [사용자 정보] 청구 정보 업데이트 완료 (user_id: ${userId})`);
            } catch (updateError) {
              console.warn('⚠️  [사용자 정보] 업데이트 실패 (계속 진행):', updateError);
            }
          }
        }

        // 트랜잭션 커밋
        await poolNeon.query('COMMIT');
      } catch (pointsError) {
        console.error('❌ [포인트/알림] 처리 실패 (계속 진행):', pointsError);
        // 롤백 시도
        try {
          await poolNeon.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('❌ [포인트] 롤백 실패:', rollbackError);
        }
        // 포인트/알림 처리 실패해도 결제는 성공 처리
      } finally {
        // ✅ Connection pool 정리 (에러 발생해도 반드시 실행)
        await poolNeon.end();
      }

      // ✅ 결제 완료 후 장바구니 비우기
      try {
        console.log(`🛒 [장바구니] 결제 완료, 장바구니 삭제 중... (user_id: ${userId})`);

        await connection.execute(`
          DELETE FROM cart_items
          WHERE user_id = ?
        `, [userId]);

        console.log(`✅ [장바구니] 장바구니 삭제 완료`);
      } catch (cartError) {
        console.error('❌ [장바구니] 삭제 실패 (계속 진행):', cartError);
        // 장바구니 삭제 실패해도 결제는 성공 처리
      }
    }

    // 5. 로그 기록 (예약일 경우만)
    if (bookingId) {
      try {
        await connection.execute(
          `INSERT INTO booking_logs (booking_id, action, details, created_at)
           VALUES (?, ?, ?, NOW())`,
          [
            bookingId,
            'PAYMENT_CONFIRMED',
            JSON.stringify({
              paymentKey,
              amount: paymentResult.totalAmount,
              method: paymentResult.method
            })
          ]
        );
        console.log('✅ [로그] booking_logs 기록 완료');
      } catch (logError) {
        console.warn('⚠️  [로그] booking_logs 기록 실패 (계속 진행):', logError);
      }
    }

    // 🔒 트랜잭션 커밋 - 모든 DB 작업 성공
    console.log('✅ [Transaction] DB 트랜잭션 커밋 완료');

    // 성공 응답
    return {
      success: true,
      message: '결제가 완료되었습니다.',
      bookingId,
      orderId: orderId_num,
      paymentKey,
      receiptUrl: paymentResult.receipt?.url || null,
      amount: paymentResult.totalAmount
    };

  } catch (error) {
    console.error('❌ [결제 승인] 실패:', error);

    // 🔒 트랜잭션 롤백 (connection이 존재하면)
    if (connection) {
      try {
        // PlanetScale does not support rollback
      } catch (rollbackError) {
        console.error('❌ [Transaction] 롤백 실패:', rollbackError);
      }
    }

    // 🔒 Toss Payments 취소 (Toss API 승인은 되었지만 DB 작업 실패)
    if (tossApproved && paymentKey) {
      try {
        console.log('🔄 [Toss Payments] 자동 취소 시도:', paymentKey);
        await cancelTossPayment(
          paymentKey,
          '시스템 오류로 인한 자동 취소'
        );
        console.log('✅ [Toss Payments] 자동 취소 완료');
      } catch (cancelError) {
        console.error('❌ [Toss Payments] 자동 취소 실패:', cancelError);
        console.error('⚠️  [긴급] 수동 환불 필요! paymentKey:', paymentKey);

        // ✅ 관리자 알림 저장 (Problem #32 해결)
        try {
          await connection.execute(`
            INSERT INTO admin_notifications (
              type,
              priority,
              title,
              message,
              metadata,
              created_at
            ) VALUES (?, ?, ?, ?, ?, NOW())
          `, [
            'PAYMENT_CANCEL_FAILED',
            'CRITICAL',
            '🚨 Toss 결제 자동 취소 실패 - 긴급 조치 필요',
            `결제 승인은 완료되었으나 DB 작업 실패로 자동 취소를 시도했지만 실패했습니다. 고객에게 결제 금액이 청구되었으나 시스템에는 주문이 생성되지 않았습니다. 즉시 수동 환불 처리가 필요합니다.`,
            JSON.stringify({
              paymentKey,
              orderId,
              amount,
              orderName,
              error: cancelError.message,
              timestamp: new Date().toISOString(),
              actionRequired: '관리자 페이지에서 해당 paymentKey로 수동 환불 처리 필요'
            })
          ]);
          console.log('✅ [Admin Alert] 관리자 알림 저장 완료');
        } catch (alertError) {
          // admin_notifications 테이블이 없으면 무시
          console.error('⚠️  [Admin Alert] 알림 저장 실패 (계속 진행):', alertError.message);
          console.error('⚠️  ⚠️  ⚠️  [CRITICAL] 수동 환불 필요! paymentKey:', paymentKey, 'orderId:', orderId, 'amount:', amount);
        }
      }
    }

    // Toss Payments API 에러의 경우 더 자세한 정보 반환
    if (error.message) {
      return {
        success: false,
        message: error.message,
        code: error.code || 'PAYMENT_CONFIRM_FAILED'
      };
    }

    return {
      success: false,
      message: '결제 승인 중 오류가 발생했습니다.',
      code: 'PAYMENT_CONFIRM_ERROR'
    };
  } finally {
    // ℹ️ PlanetScale connection은 자동으로 관리되므로 명시적 해제 불필요
    console.log('✅ [Connection] 결제 처리 완료');
  }
}

/**
 * 결제 실패 처리
 *
 * 사용자가 결제를 취소하거나 실패했을 때 호출
 *
 * @param {string} orderId - 주문 ID
 * @param {string} reason - 실패 사유
 */
async function handlePaymentFailure(orderId, reason) {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('❌ [결제 실패] 처리:', { orderId, reason });

    // orderId로 예약 또는 주문 찾기
    const isBooking = orderId.startsWith('BK-');
    const isOrder = orderId.startsWith('ORDER_');

    if (isBooking) {
      // 예약 상태를 CANCELLED로 변경
      await connection.execute(
        `UPDATE bookings
         SET status = 'cancelled',
             payment_status = 'failed',
             updated_at = NOW()
         WHERE booking_number = ?`,
        [orderId]
      );

      // 로그 기록
      const bookings = await connection.execute(
        'SELECT id FROM bookings WHERE booking_number = ?',
        [orderId]
      );

      if (bookings && bookings.rows && bookings.rows.length > 0) {
        try {
          await connection.execute(
            `INSERT INTO booking_logs (booking_id, action, details, created_at)
             VALUES (?, ?, ?, NOW())`,
            [
              bookings.rows[0].id,
              'PAYMENT_FAILED',
              JSON.stringify({ reason })
            ]
          );
        } catch (logError) {
          console.warn('⚠️  [로그] booking_logs 기록 실패:', logError);
        }
      }

      console.log('✅ [예약] 결제 실패 처리 완료');

    } else if (isOrder) {
      // 장바구니 주문 실패 처리: 재고 복구 + 포인트 환불 + 예약 취소
      console.log(`🔄 [주문 실패] 롤백 시작: ${orderId}`);

      // 1. 주문 정보 조회 (payment record)
      const payments = await connection.execute(
        `SELECT id, user_id, amount, notes
         FROM payments
         WHERE gateway_transaction_id = ?`,
        [orderId]
      );

      if (!payments || !payments.rows || payments.rows.length === 0) {
        console.warn(`⚠️ [주문 실패] 주문을 찾을 수 없음: ${orderId}`);
        return { success: true, message: '처리할 주문이 없습니다.' };
      }

      const payment = payments.rows[0];
      const userId = payment.user_id;

      // 2. 해당 주문의 모든 bookings 조회 (재고 복구용)
      const bookings = await connection.execute(
        `SELECT id, listing_id, guests, selected_option_id
         FROM bookings
         WHERE order_number = ? AND status != 'cancelled'`,
        [orderId]
      );

      console.log(`📦 [주문 실패] ${bookings.rows.length}개 예약 롤백 중...`);

      // 3. 각 booking에 대해 재고 복구
      for (const booking of bookings.rows) {
        try {
          // 3-1. 옵션 재고 복구
          if (booking.selected_option_id) {
            await connection.execute(`
              UPDATE product_options
              SET stock = stock + ?
              WHERE id = ? AND stock IS NOT NULL
            `, [booking.guests || 1, booking.selected_option_id]);

            console.log(`✅ [재고 복구] 옵션 재고 복구: option_id=${booking.selected_option_id}, +${booking.guests || 1}개`);
          }

          // 3-2. 상품 재고 복구
          if (booking.listing_id) {
            await connection.execute(`
              UPDATE listings
              SET stock = stock + ?
              WHERE id = ? AND stock IS NOT NULL
            `, [booking.guests || 1, booking.listing_id]);

            console.log(`✅ [재고 복구] 상품 재고 복구: listing_id=${booking.listing_id}, +${booking.guests || 1}개`);
          }
        } catch (stockError) {
          console.error(`❌ [재고 복구] 실패 (booking_id=${booking.id}):`, stockError);
          // 재고 복구 실패해도 계속 진행
        }
      }

      // 4. bookings 상태 변경 (cancelled)
      await connection.execute(
        `UPDATE bookings
         SET status = 'cancelled',
             payment_status = 'failed',
             cancellation_reason = ?,
             updated_at = NOW()
         WHERE order_number = ?`,
        [reason || '결제 실패', orderId]
      );

      console.log(`✅ [예약 취소] ${bookings.rows.length}개 예약 취소 완료`);

      // 5. 포인트 환불 체크
      // ⚠️ 주의: 결제 실패 시점에는 포인트가 아직 차감되지 않았음
      //    (포인트는 confirmPayment에서 결제 확정 후에만 차감됨)
      //    따라서 결제 실패 시에는 포인트 환불이 불필요
      const notes = payment.notes ? JSON.parse(payment.notes) : null;
      const pointsUsed = notes?.pointsUsed || 0;

      if (pointsUsed > 0) {
        console.log(`ℹ️  [포인트] 사용 예정이었던 포인트: ${pointsUsed}P (차감되지 않았으므로 환불 불필요)`);
      }

      // 6. 주문 상태를 failed로 변경 (payments 테이블)
      await connection.execute(
        `UPDATE payments
         SET payment_status = 'failed',
             updated_at = NOW()
         WHERE gateway_transaction_id = ?`,
        [orderId]
      );

      console.log('✅ [주문] 결제 실패 처리 완료 (재고 복구 + 포인트 환불)');
    }

    return {
      success: true,
      message: '결제 실패가 처리되었습니다.'
    };

  } catch (error) {
    console.error('❌ [결제 실패 처리] 오류:', error);
    return {
      success: false,
      message: '결제 실패 처리 중 오류가 발생했습니다.'
    };
  }
}

/**
 * Vercel Serverless Function Handler
 * HTTP POST /api/payments/confirm
 */
module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method Not Allowed. Use POST.'
    });
  }

  try {
    const { paymentKey, orderId, amount } = req.body;

    if (!paymentKey || !orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: '필수 파라미터가 누락되었습니다. (paymentKey, orderId, amount)'
      });
    }

    // ✅ 금액 파싱: 쉼표 제거 후 숫자로 변환
    const parsedAmount = typeof amount === 'string'
      ? parseInt(amount.replace(/,/g, ''))  // 쉼표 제거
      : parseInt(amount);

    console.log(`💳 [Request] 결제 승인 요청: ${orderId}, 금액: ${amount} → ${parsedAmount}원`);

    // 결제 승인 처리
    const result = await confirmPayment({
      paymentKey,
      orderId,
      amount: parsedAmount
    });

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }

  } catch (error) {
    console.error('❌ [API Handler] 결제 확인 실패:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '서버 오류가 발생했습니다.'
    });
  }
};

// Export helper functions for internal use
module.exports.confirmPayment = confirmPayment;
module.exports.handlePaymentFailure = handlePaymentFailure;
