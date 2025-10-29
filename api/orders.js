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
            special_requests,
            shipping_fee,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
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
          item.adults || 1,
          item.children || 0,
          item.infants || 0,
          JSON.stringify(item.selectedOption || {}),
          item.category === '팝업' ? (deliveryFee || 0) / items.length : 0
        ]);

        console.log(`✅ [Orders] bookings 생성: ${bookingNumber}, listing ${item.listingId}`);

        // ✅ 재고 차감 (옵션 또는 상품 레벨)
        try {
          const stockQuantity = item.quantity || 1;

          if (item.selectedOption && item.selectedOption.id) {
            // 옵션 재고 차감
            await connection.execute(`
              UPDATE product_options
              SET stock = stock - ?
              WHERE id = ? AND stock IS NOT NULL AND stock >= ?
            `, [stockQuantity, item.selectedOption.id, stockQuantity]);

            console.log(`✅ [Orders] 옵션 재고 차감: option_id=${item.selectedOption.id}, -${stockQuantity}개`);
          } else {
            // 상품 레벨 재고 차감 (stock_enabled=1인 경우만)
            await connection.execute(`
              UPDATE listings
              SET stock = stock - ?
              WHERE id = ? AND stock_enabled = 1 AND stock IS NOT NULL AND stock >= ?
            `, [stockQuantity, item.listingId, stockQuantity]);

            console.log(`✅ [Orders] 상품 재고 차감: listing_id=${item.listingId}, -${stockQuantity}개`);
          }
        } catch (stockError) {
          console.error(`❌ [Orders] 재고 차감 실패:`, stockError);
          // 재고 차감 실패 시 트랜잭션 롤백
          throw stockError;
        }
      }

      // 포인트 차감 처리
      if (pointsUsed && pointsUsed > 0) {
        try {
          // ✅ 직접 DB 쿼리로 포인트 차감 (TypeScript import 문제 회피)
          // 1. 현재 포인트 조회
          const userResult = await connection.execute(
            'SELECT total_points FROM users WHERE id = ?',
            [userId]
          );

          if (userResult.rows && userResult.rows.length > 0) {
            const currentPoints = userResult.rows[0].total_points || 0;
            const newBalance = currentPoints - pointsUsed;

            // 2. 포인트 내역 추가
            await connection.execute(`
              INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after, created_at)
              VALUES (?, ?, 'use', ?, ?, ?, NOW())
            `, [userId, -pointsUsed, `주문 결제 (주문번호: ${orderNumber})`, orderNumber, newBalance]);

            // 3. 사용자 포인트 업데이트
            await connection.execute(
              'UPDATE users SET total_points = ? WHERE id = ?',
              [newBalance, userId]
            );

            console.log(`✅ [Orders] 포인트 차감 완료: ${pointsUsed}P (잔액: ${newBalance}P)`);
          }
        } catch (pointsError) {
          console.error('❌ [Orders] 포인트 차감 실패:', pointsError);
          // 포인트 차감 실패 시 롤백
          throw pointsError;
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
