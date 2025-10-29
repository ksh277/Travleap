/**
 * 주문 관리 API
 * GET /api/orders - 모든 주문 조회
 * POST /api/orders - 장바구니 주문 생성
 */

const { connect } = require('@planetscale/database');

function generateOrderNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORDER_${timestamp}_${random}`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  // GET: 주문 목록 조회
  if (req.method === 'GET') {
    try {
      const result = await connection.execute(
        `SELECT * FROM orders ORDER BY created_at DESC`
      );

      return res.status(200).json({
        success: true,
        data: result.rows || []
      });
    } catch (error) {
      console.error('Orders GET API error:', error);
      return res.status(200).json({
        success: true,
        data: []
      });
    }
  }

  // POST: 장바구니 주문 생성
  if (req.method === 'POST') {
    try {
      const {
        userId,
        items,
        subtotal,
        deliveryFee,
        couponDiscount,
        couponCode,
        pointsUsed,
        total,
        status,
        paymentMethod,
        shippingInfo
      } = req.body;

      console.log('🛒 [Orders] 주문 생성 요청:', {
        userId,
        itemCount: items?.length,
        subtotal,
        deliveryFee,
        couponDiscount,
        couponCode,
        pointsUsed,
        total,
        hasShipping: !!shippingInfo
      });

      // 필수 파라미터 검증
      if (!userId || !items || items.length === 0 || total === undefined) {
        return res.status(400).json({
          success: false,
          error: '필수 파라미터가 누락되었습니다.'
        });
      }

      // 🔒 금액 검증 (보안: 클라이언트 조작 방지)
      // ⚠️ CRITICAL: 클라이언트가 보낸 subtotal을 절대 믿지 말 것!
      // items 배열에서 서버가 직접 재계산
      let serverCalculatedSubtotal = 0;

      for (const item of items) {
        if (!item.price || !item.quantity || item.price < 0 || item.quantity <= 0) {
          return res.status(400).json({
            success: false,
            error: 'INVALID_ITEM',
            message: '잘못된 상품 정보입니다.'
          });
        }

        // 옵션 가격이 있으면 포함
        const itemPrice = item.price || 0;
        const optionPrice = item.selectedOption?.price || 0;
        const totalItemPrice = (itemPrice + optionPrice) * item.quantity;

        serverCalculatedSubtotal += totalItemPrice;
      }

      console.log(`🔒 [Orders] 서버 측 subtotal 재계산: ${serverCalculatedSubtotal}원 (클라이언트: ${subtotal}원)`);

      // 클라이언트가 보낸 subtotal과 서버 계산이 다르면 거부
      if (Math.abs(serverCalculatedSubtotal - (subtotal || 0)) > 1) {
        console.error(`❌ [Orders] Subtotal 조작 감지!
          - 클라이언트 subtotal: ${subtotal}원
          - 서버 계산 subtotal: ${serverCalculatedSubtotal}원
          - 차이: ${Math.abs(serverCalculatedSubtotal - (subtotal || 0))}원`);

        return res.status(400).json({
          success: false,
          error: 'SUBTOTAL_TAMPERED',
          message: '상품 금액이 조작되었습니다. 페이지를 새로고침해주세요.'
        });
      }

      const serverDeliveryFee = deliveryFee || 0;
      const serverCouponDiscount = couponDiscount || 0;

      // 🔒 포인트 사용 검증 (음수/NaN 방지)
      let serverPointsUsed = parseInt(pointsUsed) || 0;
      if (isNaN(serverPointsUsed) || serverPointsUsed < 0) {
        console.warn(`⚠️ [Orders] 잘못된 pointsUsed 값 감지: ${pointsUsed}, 0으로 처리`);
        serverPointsUsed = 0;
      }

      // 서버 측 최종 금액 계산 (서버가 재계산한 subtotal 사용)
      const expectedTotal = serverCalculatedSubtotal - serverCouponDiscount + serverDeliveryFee - serverPointsUsed;

      // 1원 이하 오차 허용 (부동소수점 연산 오차)
      if (Math.abs(expectedTotal - total) > 1) {
        console.error(`❌ [Orders] 최종 금액 불일치 감지:
          - 클라이언트 total: ${total}원
          - 서버 계산: ${expectedTotal}원
          - 차이: ${Math.abs(expectedTotal - total)}원
          - serverSubtotal: ${serverCalculatedSubtotal}
          - deliveryFee: ${serverDeliveryFee}
          - couponDiscount: ${serverCouponDiscount}
          - pointsUsed: ${serverPointsUsed}`);

        return res.status(400).json({
          success: false,
          error: 'AMOUNT_MISMATCH',
          message: `금액이 일치하지 않습니다. 페이지를 새로고침해주세요.`,
          expected: expectedTotal,
          received: total
        });
      }

      console.log(`✅ [Orders] 금액 검증 통과: ${total.toLocaleString()}원`);

      const orderNumber = generateOrderNumber();

      // ✅ 트랜잭션 시작 (데이터 일관성 보장)
      await connection.execute('START TRANSACTION');

      try {
        // payments 테이블에 주문 생성 (장바구니 주문)
        // ✅ gateway_transaction_id에 ORDER_xxx 저장
        const insertResult = await connection.execute(`
        INSERT INTO payments (
          user_id,
          amount,
          payment_status,
          payment_method,
          gateway_transaction_id,
          notes,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        userId,
        total,
        'pending',
        paymentMethod || 'card',
        orderNumber,
        JSON.stringify({
          items,
          subtotal,
          deliveryFee: deliveryFee || 0,
          couponDiscount: couponDiscount || 0,
          couponCode: couponCode || null,
          pointsUsed: pointsUsed || 0,
          shippingInfo: shippingInfo || null
        })
      ]);

      console.log('✅ [Orders] payments 테이블 저장 완료, insertId:', insertResult.insertId);

      // bookings 테이블에 각 상품별 예약 생성
      for (const item of items) {
        const bookingNumber = `BK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // ✅ 실제 주문 수량 계산
        // 🔒 CRITICAL: 재고 차감 로직(line 202)과 정확히 동일한 계산식 사용!
        // 재고 복구 시 이 값을 사용하므로 일치해야 함
        const actualQuantity = item.quantity || 1;

        await connection.execute(`
          INSERT INTO bookings (
            user_id,
            listing_id,
            booking_number,
            order_number,
            total_amount,
            status,
            payment_status,
            start_date,
            end_date,
            adults,
            children,
            infants,
            guests,
            selected_option_id,
            special_requests,
            shipping_fee,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
          userId,
          item.listingId,
          bookingNumber,
          orderNumber,
          item.subtotal || item.price * item.quantity, // ✅ subtotal 사용 (옵션 가격 포함)
          status || 'pending',
          'pending',
          item.selectedDate || null,
          item.selectedDate || null,
          item.adults || 0,
          item.children || 0,
          item.infants || 0,
          actualQuantity, // ✅ 실제 주문 수량 (재고 차감/복구에 사용)
          item.selectedOption?.id || null, // ✅ 옵션 ID 저장 (재고 복구에 사용)
          JSON.stringify(item.selectedOption || {}),
          item.category === '팝업' ? (deliveryFee || 0) / items.length : 0
        ]);

        console.log(`✅ [Orders] bookings 생성: ${bookingNumber}, listing ${item.listingId}`);

        // ✅ 재고 차감 (옵션 또는 상품 레벨) - 재고 부족 시 명확한 에러
        const stockQuantity = item.quantity || 1;
        const itemName = item.title || item.name || `상품 ID ${item.listingId}`;

        if (item.selectedOption && item.selectedOption.id) {
          // 옵션 재고 확인 (FOR UPDATE로 락 획득)
          const stockCheck = await connection.execute(`
            SELECT stock, option_name FROM product_options
            WHERE id = ?
            FOR UPDATE
          `, [item.selectedOption.id]);

          if (!stockCheck.rows || stockCheck.rows.length === 0) {
            throw new Error(`옵션을 찾을 수 없습니다: ${itemName} - ${item.selectedOption.name || 'Unknown'}`);
          }

          const currentStock = stockCheck.rows[0].stock;
          const optionName = stockCheck.rows[0].option_name || item.selectedOption.name;

          // 재고 NULL이면 무제한 재고로 간주
          if (currentStock !== null && currentStock < stockQuantity) {
            throw new Error(`재고 부족: ${itemName} (${optionName}) - 현재 재고 ${currentStock}개, 주문 수량 ${stockQuantity}개`);
          }

          // 재고 차감 (동시성 제어: stock >= ? 조건 추가)
          const updateResult = await connection.execute(`
            UPDATE product_options
            SET stock = stock - ?
            WHERE id = ? AND stock IS NOT NULL AND stock >= ?
          `, [stockQuantity, item.selectedOption.id, stockQuantity]);

          // affectedRows 확인으로 동시성 충돌 감지
          if (updateResult.affectedRows === 0) {
            throw new Error(`재고 차감 실패 (동시성 충돌 또는 재고 부족): ${itemName} (${optionName}) - 다른 사용자가 먼저 구매했을 수 있습니다.`);
          }

          console.log(`✅ [Orders] 옵션 재고 차감: ${itemName} (${optionName}), -${stockQuantity}개 (남은 재고: ${currentStock - stockQuantity}개)`);

        } else {
          // 상품 레벨 재고 확인 (stock_enabled=1인 경우만)
          const stockCheck = await connection.execute(`
            SELECT stock, stock_enabled, title FROM listings
            WHERE id = ?
            FOR UPDATE
          `, [item.listingId]);

          if (!stockCheck.rows || stockCheck.rows.length === 0) {
            throw new Error(`상품을 찾을 수 없습니다: ${itemName}`);
          }

          const listing = stockCheck.rows[0];
          const currentStock = listing.stock;
          const stockEnabled = listing.stock_enabled;
          const title = listing.title || itemName;

          // 재고 관리가 활성화되어 있고, 재고가 부족한 경우
          if (stockEnabled && currentStock !== null && currentStock < stockQuantity) {
            throw new Error(`재고 부족: ${title} - 현재 재고 ${currentStock}개, 주문 수량 ${stockQuantity}개`);
          }

          // 재고 차감 (stock_enabled=1이고 stock이 NOT NULL인 경우만)
          if (stockEnabled && currentStock !== null) {
            // 동시성 제어: stock >= ? 조건 추가
            const updateResult = await connection.execute(`
              UPDATE listings
              SET stock = stock - ?
              WHERE id = ? AND stock >= ?
            `, [stockQuantity, item.listingId, stockQuantity]);

            // affectedRows 확인으로 동시성 충돌 감지
            if (updateResult.affectedRows === 0) {
              throw new Error(`재고 차감 실패 (동시성 충돌 또는 재고 부족): ${title} - 다른 사용자가 먼저 구매했을 수 있습니다.`);
            }

            console.log(`✅ [Orders] 상품 재고 차감: ${title}, -${stockQuantity}개 (남은 재고: ${currentStock - stockQuantity}개)`);
          } else {
            console.log(`ℹ️ [Orders] 재고 관리 비활성화: ${title} (재고 차감 스킵)`);
          }
        }
      }

      // 🔒 포인트 사용 검증 (차감은 결제 확정 후 confirmPayment에서 수행)
      if (pointsUsed && pointsUsed > 0) {
        // ✅ Neon PostgreSQL Pool 사용 (users 테이블은 Neon에 있음)
        const { Pool } = require('@neondatabase/serverless');
        const poolNeon = new Pool({
          connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
        });

        try {
          // 현재 포인트 조회 및 충분한지 검증만 수행 (Neon - users 테이블)
          const userResult = await poolNeon.query(
            'SELECT total_points FROM users WHERE id = $1',
            [userId]
          );

          if (userResult.rows && userResult.rows.length > 0) {
            const currentPoints = userResult.rows[0].total_points || 0;

            if (currentPoints < pointsUsed) {
              throw new Error(`포인트가 부족합니다. (보유: ${currentPoints}P, 사용 요청: ${pointsUsed}P)`);
            }

            console.log(`✅ [Orders] 포인트 사용 가능 확인: ${pointsUsed}P (현재 잔액: ${currentPoints}P)`);
            console.log(`ℹ️ [Orders] 포인트 차감은 결제 확정 후 수행됩니다.`);
          } else {
            throw new Error('사용자를 찾을 수 없습니다.');
          }
        } catch (pointsError) {
          console.error('❌ [Orders] 포인트 검증 실패:', pointsError);
          throw pointsError;
        } finally {
          // ✅ Connection pool 정리 (에러 발생해도 반드시 실행)
          await poolNeon.end();
        }
      }

      // ✅ 트랜잭션 커밋
      await connection.execute('COMMIT');
      console.log('✅ [Orders] 트랜잭션 커밋 완료');

      return res.status(200).json({
        success: true,
        data: {
          orderNumber,
          orderId: Number(insertResult.insertId) || 0,
          total
        },
        message: '주문이 생성되었습니다.'
      });

    } catch (transactionError) {
      // ✅ 트랜잭션 롤백
      await connection.execute('ROLLBACK');
      console.error('❌ [Orders] 트랜잭션 롤백:', transactionError);
      throw transactionError;
    }

    } catch (error) {
      console.error('❌ [Orders] POST API error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || '주문 생성에 실패했습니다.'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
};
