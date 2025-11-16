/**
 * 통합 결제 승인 API
 * POST /api/payments/confirm
 *
 * 기능:
 * - Toss Payments 결제 승인
 * - payments 테이블 업데이트
 * - bookings/rentcar_bookings 상태 업데이트
 * - 포인트 적립 (결제 금액의 1%)
 *
 * 지원 카테고리: 팝업, 투어, 숙박, 관광지, 이벤트, 체험, 음식점, 렌트카
 */

const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { paymentKey, orderId, amount } = req.body;

    console.log(`💳 [Payments Confirm] 결제 승인 요청:`, {
      paymentKey,
      orderId,
      amount
    });

    if (!paymentKey || !orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: '필수 파라미터가 누락되었습니다.'
      });
    }

    // 1. Toss Payments 결제 승인
    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      throw new Error('TOSS_SECRET_KEY가 설정되지 않았습니다.');
    }

    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

    console.log(`💳 [Payments Confirm] Toss API 호출 중...`);

    const confirmResponse = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paymentKey,
        orderId,
        amount: parseInt(amount)
      })
    });

    const confirmData = await confirmResponse.json();

    if (!confirmResponse.ok) {
      console.error('❌ [Payments Confirm] Toss 승인 실패:', confirmData);
      return res.status(400).json({
        success: false,
        message: confirmData.message || '결제 승인에 실패했습니다.',
        error: confirmData
      });
    }

    console.log(`✅ [Payments Confirm] Toss 승인 성공: ${paymentKey}`);

    // PlanetScale DB 연결
    const connection = connect({ url: process.env.DATABASE_URL });

    // 2. orderId 파싱하여 주문 유형 판별
    let isCartOrder = orderId.startsWith('ORDER_');
    let isRentcarOrder = orderId.startsWith('RC');

    let userId = null;
    let bookingId = null;
    let receiptUrl = confirmData.receipt?.url || null;

    if (isRentcarOrder) {
      // 렌트카 주문 처리
      console.log(`🚗 [Payments Confirm] 렌트카 주문 처리: ${orderId}`);

      const rentcarResult = await connection.execute(
        `SELECT id, user_id, total_krw FROM rentcar_bookings WHERE booking_number = ? LIMIT 1`,
        [orderId]
      );

      if (!rentcarResult.rows || rentcarResult.rows.length === 0) {
        throw new Error('렌트카 예약을 찾을 수 없습니다.');
      }

      const booking = rentcarResult.rows[0];
      userId = booking.user_id;
      bookingId = booking.id;

      // rentcar_bookings 상태 업데이트
      await connection.execute(
        `UPDATE rentcar_bookings
         SET payment_status = 'paid',
             payment_key = ?,
             approved_at = NOW(),
             status = 'confirmed',
             updated_at = NOW()
         WHERE booking_number = ?`,
        [paymentKey, orderId]
      );

      console.log(`✅ [Payments Confirm] 렌트카 예약 상태 업데이트 완료: ${orderId}`);

    } else if (isCartOrder) {
      // 장바구니 주문 처리
      console.log(`🛒 [Payments Confirm] 장바구니 주문 처리: ${orderId}`);

      // payments 테이블 업데이트
      const paymentResult = await connection.execute(
        `SELECT id, user_id, amount FROM payments WHERE gateway_transaction_id = ? LIMIT 1`,
        [orderId]
      );

      if (!paymentResult.rows || paymentResult.rows.length === 0) {
        throw new Error('주문 정보를 찾을 수 없습니다.');
      }

      const payment = paymentResult.rows[0];
      userId = payment.user_id;

      await connection.execute(
        `UPDATE payments
         SET payment_status = 'paid',
             payment_key = ?,
             approved_at = NOW(),
             updated_at = NOW()
         WHERE gateway_transaction_id = ?`,
        [paymentKey, orderId]
      );

      // bookings 상태 업데이트 (order_number로 연결된 모든 booking)
      await connection.execute(
        `UPDATE bookings
         SET status = 'confirmed',
             updated_at = NOW()
         WHERE order_number = ?`,
        [orderId]
      );

      console.log(`✅ [Payments Confirm] 장바구니 주문 상태 업데이트 완료: ${orderId}`);

    } else {
      // 단일 상품 주문 처리 (기존 BOOKING_xxx 형식)
      console.log(`📦 [Payments Confirm] 단일 상품 주문 처리: ${orderId}`);

      const bookingResult = await connection.execute(
        `SELECT b.id, b.user_id, p.id as payment_id
         FROM bookings b
         LEFT JOIN payments p ON p.booking_id = b.id
         WHERE b.booking_number = ?
         LIMIT 1`,
        [orderId]
      );

      if (!bookingResult.rows || bookingResult.rows.length === 0) {
        throw new Error('예약 정보를 찾을 수 없습니다.');
      }

      const booking = bookingResult.rows[0];
      userId = booking.user_id;
      bookingId = booking.id;

      // payments 테이블 업데이트
      if (booking.payment_id) {
        await connection.execute(
          `UPDATE payments
           SET payment_status = 'paid',
               payment_key = ?,
               approved_at = NOW(),
               updated_at = NOW()
           WHERE id = ?`,
          [paymentKey, booking.payment_id]
        );
      }

      // bookings 상태 업데이트
      await connection.execute(
        `UPDATE bookings
         SET status = 'confirmed',
             updated_at = NOW()
         WHERE booking_number = ?`,
        [orderId]
      );

      console.log(`✅ [Payments Confirm] 단일 상품 주문 상태 업데이트 완료: ${orderId}`);
    }

    // 3. 포인트 처리 (차감 + 적립, Neon DB)
    if (userId && amount > 0) {
      const poolNeon = new Pool({
        connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
      });

      try {
        // 3-1. 포인트 사용(차감) 처리 - notes에서 pointsUsed 확인
        let pointsUsed = 0;

        if (isCartOrder || !isRentcarOrder) {
          // 장바구니 주문이나 단일 상품 주문에서 notes 확인
          let notes = null;

          if (isCartOrder) {
            // 장바구니: payments 테이블에서 notes 조회
            const paymentResult = await connection.execute(
              `SELECT notes FROM payments WHERE gateway_transaction_id = ? LIMIT 1`,
              [orderId]
            );
            if (paymentResult.rows && paymentResult.rows.length > 0) {
              notes = paymentResult.rows[0].notes;
            }
          } else {
            // 단일 상품: bookings 테이블에서 payment 조회
            const bookingResult = await connection.execute(
              `SELECT p.notes FROM payments p
               INNER JOIN bookings b ON p.booking_id = b.id
               WHERE b.booking_number = ? LIMIT 1`,
              [orderId]
            );
            if (bookingResult.rows && bookingResult.rows.length > 0) {
              notes = bookingResult.rows[0].notes;
            }
          }

          // notes에서 pointsUsed 추출
          if (notes) {
            try {
              const notesData = typeof notes === 'string' ? JSON.parse(notes) : notes;
              pointsUsed = notesData.pointsUsed || 0;

              if (pointsUsed > 0) {
                // 포인트 차감: Neon DB에서 사용자 잔액 업데이트
                await poolNeon.query('BEGIN');

                try {
                  // 현재 포인트 조회 (FOR UPDATE로 Lock)
                  const userResult = await poolNeon.query(
                    `SELECT total_points FROM users WHERE id = $1 FOR UPDATE`,
                    [userId]
                  );

                  if (userResult.rows && userResult.rows.length > 0) {
                    const currentPoints = userResult.rows[0].total_points || 0;

                    // 🔒 CRITICAL: Race Condition 방지를 위한 재검증
                    if (currentPoints < pointsUsed) {
                      await poolNeon.query('ROLLBACK');
                      console.error(`❌ [Payments Confirm] 포인트 부족 (Race Condition): 보유=${currentPoints}P, 사용=${pointsUsed}P`);
                      // 포인트 부족은 결제 실패로 처리하지 않음 (수동 환불 필요)
                      return;
                    }

                    const newBalance = currentPoints - pointsUsed;

                    // 1. Neon users 테이블 포인트 차감
                    await poolNeon.query(
                      `UPDATE users SET total_points = $1 WHERE id = $2`,
                      [newBalance, userId]
                    );

                    // 2. Neon points_ledger에 기록
                    await poolNeon.query(
                      `INSERT INTO points_ledger (user_id, amount, description, transaction_type, related_order_id, created_at)
                       VALUES ($1, $2, $3, $4, $5, NOW())`,
                      [userId, -pointsUsed, `결제 완료 - 포인트 사용 (주문번호: ${orderId})`, 'used', orderId]
                    );

                    // 3. 🔧 FIX: PlanetScale user_points에도 기록
                    await connection.execute(`
                      INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after, created_at)
                      VALUES (?, ?, 'use', ?, ?, ?, NOW())
                    `, [userId, -pointsUsed, `결제 완료 - 포인트 사용 (주문번호: ${orderId})`, orderId, newBalance]);

                    await poolNeon.query('COMMIT');

                    console.log(`💰 [Payments Confirm] 포인트 차감 완료: user_id=${userId}, points=-${pointsUsed} (잔액: ${currentPoints}P → ${newBalance}P)`);
                  } else {
                    await poolNeon.query('ROLLBACK');
                    console.error(`❌ [Payments Confirm] 사용자를 찾을 수 없음: user_id=${userId}`);
                  }
                } catch (deductError) {
                  await poolNeon.query('ROLLBACK');
                  throw deductError;
                }
              }
            } catch (notesError) {
              console.error('❌ [Payments Confirm] notes 파싱 실패:', notesError.message);
            }
          }
        }

        // 3-2. 포인트 적립 (결제 금액의 2%)
        const pointsToEarn = Math.floor(amount * 0.02); // 2% 적립

        if (pointsToEarn > 0 && userId) {
          try {
            await poolNeon.query('BEGIN');

            // 현재 포인트 조회 (FOR UPDATE로 Lock - Race Condition 방지)
            const userResult = await poolNeon.query(
              `SELECT total_points FROM users WHERE id = $1 FOR UPDATE`,
              [userId]
            );

            if (userResult.rows && userResult.rows.length > 0) {
              const currentPoints = userResult.rows[0].total_points || 0;
              const newBalance = currentPoints + pointsToEarn;

              // 1. Neon users 테이블 업데이트
              await poolNeon.query(
                `UPDATE users SET total_points = $1 WHERE id = $2`,
                [newBalance, userId]
              );

              // 2. Neon points_ledger 기록
              await poolNeon.query(
                `INSERT INTO points_ledger (user_id, amount, description, transaction_type, related_order_id, created_at)
                 VALUES ($1, $2, $3, $4, $5, NOW())`,
                [userId, pointsToEarn, `결제 완료 적립 (주문번호: ${orderId})`, 'earned', orderId]
              );

              // 3. 🔧 CRITICAL FIX: PlanetScale user_points 기록
              await connection.execute(`
                INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after, created_at)
                VALUES (?, ?, 'earn', ?, ?, ?, NOW())
              `, [userId, pointsToEarn, `결제 완료 적립 (주문번호: ${orderId})`, orderId, newBalance]);

              await poolNeon.query('COMMIT');

              console.log(`🎁 [Payments Confirm] 포인트 적립 완료: user_id=${userId}, points=+${pointsToEarn}, balance=${currentPoints}P → ${newBalance}P`);
            } else {
              await poolNeon.query('ROLLBACK');
              console.error(`❌ [Payments Confirm] 사용자를 찾을 수 없음: user_id=${userId}`);
            }
          } catch (earnError) {
            await poolNeon.query('ROLLBACK');
            console.error('❌ [Payments Confirm] 포인트 적립 실패:', earnError);
            // 적립 실패는 결제 성공에 영향 없음 (수동 처리 필요)
          }
        }

        await poolNeon.end();

      } catch (pointsError) {
        console.error('❌ [Payments Confirm] 포인트 처리 실패:', pointsError.message);
        // 포인트 처리 실패는 결제 성공에 영향 없음 (수동 처리 필요)
        try {
          await poolNeon.end();
        } catch (e) {}
      }
    }

    console.log(`✅ [Payments Confirm] 모든 처리 완료: ${orderId}`);

    return res.status(200).json({
      success: true,
      message: '결제가 완료되었습니다.',
      bookingId,
      receiptUrl,
      orderId
    });

  } catch (error) {
    console.error('❌ [Payments Confirm] 오류:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '결제 처리 중 오류가 발생했습니다.'
    });
  }
};
