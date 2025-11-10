/**
 * 교환 배송비 결제 완료 처리 API
 *
 * GET /api/exchange/payment-success?paymentKey=xxx&orderId=xxx&amount=xxx
 *
 * 기능:
 * - Toss Payments 결제 승인
 * - exchange_payments 업데이트
 * - 기존 주문 상태 변경 (exchanged)
 * - 새 주문 생성
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { paymentKey, orderId, amount } = req.query;

    console.log(`💳 [Exchange Payment] 결제 완료 콜백:`, {
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

    // exchangeId 추출 (orderId = "EXCHANGE_{exchangeId}")
    const exchangeId = orderId.replace('EXCHANGE_', '');

    // PlanetScale 연결
    const connection = connect({ url: process.env.DATABASE_URL });

    // 1. exchange_payments 정보 조회
    const exchangeResult = await connection.execute(`
      SELECT
        ep.id,
        ep.original_payment_id,
        ep.original_booking_id,
        ep.user_id,
        ep.amount,
        ep.payment_status,
        ep.exchange_reason
      FROM exchange_payments ep
      WHERE ep.id = ?
      LIMIT 1
    `, [exchangeId]);

    if (!exchangeResult.rows || exchangeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '교환 정보를 찾을 수 없습니다.'
      });
    }

    const exchange = exchangeResult.rows[0];

    // 이미 결제 완료된 경우
    if (exchange.payment_status === 'paid') {
      console.log(`⚠️ [Exchange Payment] 이미 결제 완료됨: ${exchangeId}`);
      return res.redirect(`/exchange-payment?exchangeId=${exchangeId}&status=already-paid`);
    }

    // 2. Toss Payments 결제 승인
    const secretKey = process.env.TOSS_SECRET_KEY;
    if (!secretKey) {
      throw new Error('TOSS_SECRET_KEY가 설정되지 않았습니다.');
    }

    const authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;

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
      console.error('❌ [Exchange Payment] Toss 승인 실패:', confirmData);
      throw new Error(confirmData.message || '결제 승인에 실패했습니다.');
    }

    console.log(`✅ [Exchange Payment] Toss 승인 성공: ${paymentKey}`);

    // 3. exchange_payments 업데이트 (결제 완료)
    await connection.execute(`
      UPDATE exchange_payments
      SET payment_key = ?,
          payment_status = 'paid',
          paid_at = NOW(),
          updated_at = NOW()
      WHERE id = ?
    `, [paymentKey, exchangeId]);

    console.log(`✅ [Exchange Payment] exchange_payments 업데이트 완료`);

    // 4. 원본 주문 정보 조회
    let originalOrder = null;

    if (exchange.original_booking_id) {
      // 단일 상품 주문
      const bookingResult = await connection.execute(`
        SELECT
          b.id as booking_id,
          b.booking_number,
          b.listing_id,
          b.user_id,
          b.num_adults,
          b.shipping_name,
          b.shipping_phone,
          b.shipping_address,
          b.shipping_address_detail,
          b.shipping_zipcode,
          b.shipping_memo,
          l.title as product_name,
          l.price as product_price
        FROM bookings b
        INNER JOIN listings l ON b.listing_id = l.id
        WHERE b.id = ?
        LIMIT 1
      `, [exchange.original_booking_id]);

      if (bookingResult.rows && bookingResult.rows.length > 0) {
        originalOrder = bookingResult.rows[0];
        originalOrder.isCart = false;
      }
    } else {
      // 장바구니 주문
      const paymentResult = await connection.execute(`
        SELECT
          p.id as payment_id,
          p.user_id,
          p.amount,
          p.notes,
          p.gateway_transaction_id as order_number
        FROM payments p
        WHERE p.id = ?
        LIMIT 1
      `, [exchange.original_payment_id]);

      if (paymentResult.rows && paymentResult.rows.length > 0) {
        originalOrder = paymentResult.rows[0];
        originalOrder.isCart = true;
      }
    }

    if (!originalOrder) {
      throw new Error('원본 주문 정보를 찾을 수 없습니다.');
    }

    // 5. 기존 주문 상태 변경 (exchanged)
    if (!originalOrder.isCart) {
      await connection.execute(`
        UPDATE bookings
        SET status = 'exchanged',
            updated_at = NOW()
        WHERE id = ?
      `, [originalOrder.booking_id]);
    } else {
      // 장바구니 주문의 경우 notes 업데이트
      const currentNotes = originalOrder.notes ? (typeof originalOrder.notes === 'string' ? JSON.parse(originalOrder.notes) : originalOrder.notes) : {};
      currentNotes.exchangeStatus = 'completed';
      currentNotes.exchangedAt = new Date().toISOString();

      await connection.execute(`
        UPDATE payments
        SET notes = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [JSON.stringify(currentNotes), originalOrder.payment_id]);
    }

    console.log(`✅ [Exchange Payment] 기존 주문 상태 변경 완료 (exchanged)`);

    // 6. 새 주문 생성
    let newBookingId = null;
    let newPaymentId = null;

    if (!originalOrder.isCart) {
      // 단일 상품 주문: 새 booking 생성
      const newBookingNumber = `B${Date.now()}`;

      const insertBookingResult = await connection.execute(`
        INSERT INTO bookings (
          booking_number,
          listing_id,
          user_id,
          num_adults,
          shipping_name,
          shipping_phone,
          shipping_address,
          shipping_address_detail,
          shipping_zipcode,
          shipping_memo,
          status,
          payment_status,
          delivery_status,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'paid', 'pending', NOW())
      `, [
        newBookingNumber,
        originalOrder.listing_id,
        originalOrder.user_id,
        originalOrder.num_adults || 1,
        originalOrder.shipping_name,
        originalOrder.shipping_phone,
        originalOrder.shipping_address,
        originalOrder.shipping_address_detail,
        originalOrder.shipping_zipcode,
        originalOrder.shipping_memo || `[교환] ${exchange.exchange_reason}`
      ]);

      // 새로 생성된 booking ID 조회
      const newBookingResult = await connection.execute(`
        SELECT id FROM bookings WHERE booking_number = ? LIMIT 1
      `, [newBookingNumber]);

      if (newBookingResult.rows && newBookingResult.rows.length > 0) {
        newBookingId = newBookingResult.rows[0].id;
      }

      // 새 payment 생성
      const insertPaymentResult = await connection.execute(`
        INSERT INTO payments (
          booking_id,
          user_id,
          amount,
          payment_key,
          payment_status,
          notes,
          created_at
        ) VALUES (?, ?, 0, ?, 'paid', ?, NOW())
      `, [
        newBookingId,
        originalOrder.user_id,
        paymentKey,
        JSON.stringify({ type: 'exchange', originalBookingId: originalOrder.booking_id, exchangeId })
      ]);

      // 새로 생성된 payment ID 조회
      const newPaymentResult = await connection.execute(`
        SELECT id FROM payments WHERE booking_id = ? AND payment_key = ? LIMIT 1
      `, [newBookingId, paymentKey]);

      if (newPaymentResult.rows && newPaymentResult.rows.length > 0) {
        newPaymentId = newPaymentResult.rows[0].id;
      }

      console.log(`✅ [Exchange Payment] 새 주문 생성 완료: booking_id=${newBookingId}, payment_id=${newPaymentId}`);
    } else {
      // 장바구니 주문: 현재는 단순하게 notes에만 기록 (추후 개선 필요)
      console.log(`⚠️ [Exchange Payment] 장바구니 교환 주문은 수동 처리 필요`);
    }

    // 7. exchange_payments에 새 주문 ID 업데이트
    if (newBookingId && newPaymentId) {
      await connection.execute(`
        UPDATE exchange_payments
        SET new_booking_id = ?,
            new_payment_id = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [newBookingId, newPaymentId, exchangeId]);
    }

    console.log(`✅ [Exchange Payment] 교환 처리 완료: ${exchangeId}`);

    // 8. 성공 페이지로 리다이렉트
    return res.redirect(`/exchange-payment?exchangeId=${exchangeId}&status=success`);

  } catch (error) {
    console.error('❌ [Exchange Payment] API error:', error);

    // 실패 페이지로 리다이렉트
    return res.redirect(`/exchange-payment?status=error&message=${encodeURIComponent(error.message)}`);
  }
};
