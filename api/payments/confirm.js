/**
 * 결제 승인 API
 *
 * Toss Payments에서 결제 완료 후 우리 서버로 돌아왔을 때 호출
 * HOLD 상태의 예약을 CONFIRMED로 변경하고 결제 정보를 기록
 */

const { db } = require('../../utils/database');
const { tossPayments } = require('../../utils/toss-payments');
// const { notifyPartnerNewBooking } = require('../../utils/notification'); // TODO: 구현 필요

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
  try {
    console.log('💳 [결제 승인] 시작:', { paymentKey, orderId, amount });

    // 1. Toss Payments API로 결제 승인 요청
    const paymentResult = await tossPayments.approvePayment({
      paymentKey,
      orderId,
      amount
    });

    console.log('✅ [Toss Payments] 결제 승인 완료:', paymentResult);

    // 2. orderId로 예약 또는 주문 찾기
    // orderId는 booking_number (BK-...) 또는 ORDER_... 형식
    const isBooking = orderId.startsWith('BK-');
    const isOrder = orderId.startsWith('ORDER_');

    let bookingId = null;
    let orderId_num = null;
    let userId = null;

    if (isBooking) {
      // 예약 (단일 상품 결제)
      const bookings = await db.query(
        'SELECT * FROM bookings WHERE booking_number = ?',
        [orderId]
      );

      if (!bookings || bookings.length === 0) {
        throw new Error('예약을 찾을 수 없습니다.');
      }

      const booking = bookings[0];
      bookingId = booking.id;
      userId = booking.user_id;

      // ✅ 금액 검증 추가 (보안 강화)
      const expectedAmount = booking.total_amount || 0;
      if (amount !== expectedAmount) {
        console.error(`❌ [금액 검증 실패] 예상: ${expectedAmount}원, 실제: ${amount}원`);
        throw new Error(`AMOUNT_MISMATCH: 결제 금액이 일치하지 않습니다. (예상: ${expectedAmount.toLocaleString()}원, 실제: ${amount.toLocaleString()}원)`);
      }

      console.log(`✅ [금액 검증] ${amount.toLocaleString()}원 일치 확인`);

      // 3. 예약 상태 변경 (HOLD → CONFIRMED)
      // ✅ 배송 상태도 PENDING → READY로 변경 (결제 완료 = 배송 준비)
      await db.query(
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
      // 장바구니 주문은 payments 테이블의 gateway_transaction_id로 저장됨
      const orders = await db.query(
        'SELECT * FROM payments WHERE gateway_transaction_id = ?',
        [orderId]
      );

      if (!orders || orders.length === 0) {
        throw new Error('주문을 찾을 수 없습니다.');
      }

      const order = orders[0];
      orderId_num = order.id;
      userId = order.user_id;

      // ✅ 금액 검증 추가 (보안 강화)
      const expectedAmount = order.amount || 0;
      if (amount !== expectedAmount) {
        console.error(`❌ [금액 검증 실패] 예상: ${expectedAmount}원, 실제: ${amount}원`);
        throw new Error(`AMOUNT_MISMATCH: 결제 금액이 일치하지 않습니다. (예상: ${expectedAmount.toLocaleString()}원, 실제: ${amount.toLocaleString()}원)`);
      }

      console.log(`✅ [금액 검증] ${amount.toLocaleString()}원 일치 확인`);

      // 3. 주문 상태 변경 (pending → paid)
      await db.query(
        `UPDATE payments
         SET payment_status = 'paid',
             updated_at = NOW()
         WHERE id = ?`,
        [orderId_num]
      );

      console.log(`✅ [주문] 상태 변경: pending → paid (payment_id: ${orderId_num})`);

      // ✅ 쿠폰 사용 처리 (동시성 제어 포함)
      try {
        const notes = order.notes ? JSON.parse(order.notes) : null;
        if (notes && notes.couponCode) {
          console.log(`🎟️ [쿠폰] 쿠폰 사용 처리: ${notes.couponCode}`);

          // 🔒 FOR UPDATE 락으로 동시성 제어
          const couponCheck = await db.execute(`
            SELECT usage_limit, used_count
            FROM coupons
            WHERE code = ? AND is_active = TRUE
            FOR UPDATE
          `, [notes.couponCode.toUpperCase()]);

          if (couponCheck && couponCheck.length > 0) {
            const coupon = couponCheck[0];

            // 사용 한도 재확인 (FOR UPDATE 락 획득 후)
            if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
              console.error(`⚠️ [쿠폰] 사용 한도 초과: ${notes.couponCode} (${coupon.used_count}/${coupon.usage_limit})`);
              // 한도 초과해도 결제는 성공 처리 (쿠폰만 미적용)
            } else {
              // 쿠폰 사용 횟수 증가
              await db.execute(`
                UPDATE coupons
                SET used_count = used_count + 1,
                    updated_at = NOW()
                WHERE code = ?
              `, [notes.couponCode.toUpperCase()]);

              // 쿠폰 사용 기록 저장
              try {
                await db.execute(`
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
              const listings = await db.query(
                'SELECT partner_id FROM listings WHERE id = ?',
                [item.listingId]
              );
              if (listings && listings.length > 0 && listings[0].partner_id) {
                console.log(`📧 [알림] 파트너 ${listings[0].partner_id}에게 주문 알림: 상품 ${item.listingId}, 수량 ${item.quantity}`);
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

      await db.execute(
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
    } else if (isOrder) {
      // 장바구니 주문: 이미 UPDATE로 payment_key 등 저장했으므로 추가 UPDATE만 수행
      const normalizedMethod = normalizePaymentMethod(
        paymentResult.method,
        paymentResult.easyPay?.provider
      );

      await db.execute(
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
      try {
        // 사용자 정보 조회
        const userResult = await db.query('SELECT name, email, phone FROM users WHERE id = ?', [userId]);

        if (userResult.length > 0) {
          const user = userResult[0];

          // ✅ notes에서 원래 상품 금액(subtotal) 가져오기
          // 포인트 적립은 쿠폰/포인트 사용 전 원래 상품 금액 기준
          const notes = order.notes ? JSON.parse(order.notes) : null;
          const originalSubtotal = notes?.subtotal || 0;

          // 배송비 조회 (bookings 테이블에서) - 알림 발송용
          const bookingsResult = await db.query(`
            SELECT SUM(IFNULL(shipping_fee, 0)) as total_shipping_fee
            FROM bookings
            WHERE order_number = ?
          `, [orderId]);

          const shippingFee = (bookingsResult.length > 0 && bookingsResult[0].total_shipping_fee) || 0;

          // 포인트 적립 (2%, 원래 상품 금액 기준)
          const pointsToEarn = Math.floor(originalSubtotal * 0.02);

          if (pointsToEarn > 0) {
            const { earnPoints } = require('../../utils/points-system');
            await earnPoints(
              userId,
              pointsToEarn,
              `주문 적립 (주문번호: ${orderId})`,
              orderId,
              null,
              365 // 1년 후 만료
            );
            console.log(`✅ [포인트] ${pointsToEarn}P 적립 완료 (사용자 ${userId})`);

            // bookings 테이블에 적립 포인트 기록
            await db.execute(`
              UPDATE bookings
              SET points_earned = ?
              WHERE order_number = ?
            `, [pointsToEarn, orderId]);
          }

          // 결제 완료 알림 발송
          const { notifyPaymentCompleted } = require('../../utils/popup-notification');
          await notifyPaymentCompleted({
            orderId,
            userId,
            userEmail: user.email,
            userName: user.name,
            userPhone: user.phone,
            orderAmount: originalSubtotal,
            shippingFee
          });
          console.log(`✅ [알림] 결제 완료 알림 발송 (${user.email})`);

          // ✅ 청구 정보를 사용자 프로필에 저장 (shippingInfo가 있을 경우)
          const { Pool } = require('@neondatabase/serverless');
          const poolNeon = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL });

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
      } catch (pointsError) {
        console.warn('⚠️  [포인트/알림] 처리 실패 (계속 진행):', pointsError);
      }
    }

    // 5. 로그 기록 (예약일 경우만)
    if (bookingId) {
      try {
        await db.execute(
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
  try {
    console.log('❌ [결제 실패] 처리:', { orderId, reason });

    // orderId로 예약 또는 주문 찾기
    const isBooking = orderId.startsWith('BK-');
    const isOrder = orderId.startsWith('ORDER_');

    if (isBooking) {
      // 예약 상태를 CANCELLED로 변경
      await db.query(
        `UPDATE bookings
         SET status = 'cancelled',
             payment_status = 'failed',
             updated_at = NOW()
         WHERE booking_number = ?`,
        [orderId]
      );

      // 로그 기록
      const bookings = await db.query(
        'SELECT id FROM bookings WHERE booking_number = ?',
        [orderId]
      );

      if (bookings && bookings.length > 0) {
        try {
          await db.execute(
            `INSERT INTO booking_logs (booking_id, action, details, created_at)
             VALUES (?, ?, ?, NOW())`,
            [
              bookings[0].id,
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
      const payments = await db.query(
        `SELECT id, user_id, amount, notes
         FROM payments
         WHERE gateway_transaction_id = ?`,
        [orderId]
      );

      if (!payments || payments.length === 0) {
        console.warn(`⚠️ [주문 실패] 주문을 찾을 수 없음: ${orderId}`);
        return { success: true, message: '처리할 주문이 없습니다.' };
      }

      const payment = payments[0];
      const userId = payment.user_id;

      // 2. 해당 주문의 모든 bookings 조회 (재고 복구용)
      const bookings = await db.query(
        `SELECT id, listing_id, guests, selected_option_id
         FROM bookings
         WHERE order_number = ? AND status != 'cancelled'`,
        [orderId]
      );

      console.log(`📦 [주문 실패] ${bookings.length}개 예약 롤백 중...`);

      // 3. 각 booking에 대해 재고 복구
      for (const booking of bookings) {
        try {
          // 3-1. 옵션 재고 복구
          if (booking.selected_option_id) {
            await db.execute(`
              UPDATE product_options
              SET stock = stock + ?
              WHERE id = ? AND stock IS NOT NULL
            `, [booking.guests || 1, booking.selected_option_id]);

            console.log(`✅ [재고 복구] 옵션 재고 복구: option_id=${booking.selected_option_id}, +${booking.guests || 1}개`);
          }

          // 3-2. 상품 재고 복구
          if (booking.listing_id) {
            await db.execute(`
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
      await db.query(
        `UPDATE bookings
         SET status = 'cancelled',
             payment_status = 'failed',
             cancellation_reason = ?,
             updated_at = NOW()
         WHERE order_number = ?`,
        [reason || '결제 실패', orderId]
      );

      console.log(`✅ [예약 취소] ${bookings.length}개 예약 취소 완료`);

      // 5. 포인트 환불 (사용된 포인트가 있는 경우)
      try {
        const notes = payment.notes ? JSON.parse(payment.notes) : null;
        const pointsUsed = notes?.pointsUsed || 0;

        if (pointsUsed > 0 && userId) {
          const { refundPoints } = require('../../utils/points-system.js');

          const pointsRefundResult = await refundPoints(
            userId,
            pointsUsed,
            `결제 실패로 인한 포인트 환불 (주문번호: ${orderId})`,
            orderId
          );

          if (pointsRefundResult.success) {
            console.log(`✅ [포인트 환불] ${pointsUsed}P 환불 완료 (user_id: ${userId})`);
          } else {
            console.error(`❌ [포인트 환불] 실패:`, pointsRefundResult.message);
          }
        }
      } catch (pointsError) {
        console.error(`❌ [포인트 환불] 오류:`, pointsError);
        // 포인트 환불 실패해도 계속 진행
      }

      // 6. 주문 상태를 failed로 변경 (payments 테이블)
      await db.query(
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

// Export functions
module.exports = {
  confirmPayment,
  handlePaymentFailure
};
