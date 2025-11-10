/**
 * 교환 정보 조회 API
 *
 * GET /api/exchange/:exchangeId
 *
 * 기능:
 * - 교환 결제 정보 조회
 * - 원본 주문 정보 조회
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { exchangeId } = req.query;

    if (!exchangeId) {
      return res.status(400).json({
        success: false,
        message: 'exchangeId는 필수입니다.'
      });
    }

    // PlanetScale 연결
    const connection = connect({ url: process.env.DATABASE_URL });

    // 교환 정보 조회
    const exchangeResult = await connection.execute(`
      SELECT
        ep.id,
        ep.original_payment_id,
        ep.original_booking_id,
        ep.user_id,
        ep.amount,
        ep.payment_status,
        ep.exchange_reason,
        ep.created_at
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

    // 원본 주문 정보 조회
    let orderInfo = {
      orderNumber: '',
      productName: '주문 상품',
      shippingAddress: ''
    };

    if (exchange.original_booking_id) {
      // 단일 상품 주문
      const bookingResult = await connection.execute(`
        SELECT
          b.booking_number,
          b.shipping_address,
          b.shipping_address_detail,
          b.shipping_zipcode,
          l.title as product_name
        FROM bookings b
        INNER JOIN listings l ON b.listing_id = l.id
        WHERE b.id = ?
        LIMIT 1
      `, [exchange.original_booking_id]);

      if (bookingResult.rows && bookingResult.rows.length > 0) {
        const booking = bookingResult.rows[0];
        orderInfo.orderNumber = booking.booking_number;
        orderInfo.productName = booking.product_name;
        orderInfo.shippingAddress = `[${booking.shipping_zipcode || ''}] ${booking.shipping_address || ''} ${booking.shipping_address_detail || ''}`.trim();
      }
    } else {
      // 장바구니 주문
      const paymentResult = await connection.execute(`
        SELECT
          p.gateway_transaction_id as order_number,
          p.notes
        FROM payments p
        WHERE p.id = ?
        LIMIT 1
      `, [exchange.original_payment_id]);

      if (paymentResult.rows && paymentResult.rows.length > 0) {
        const payment = paymentResult.rows[0];
        orderInfo.orderNumber = payment.order_number;

        // notes에서 상품명 및 배송지 추출
        if (payment.notes) {
          try {
            const notesData = typeof payment.notes === 'string' ? JSON.parse(payment.notes) : payment.notes;

            if (notesData.items && Array.isArray(notesData.items)) {
              const popupItems = notesData.items.filter(item => item.category === '팝업');
              if (popupItems.length > 0) {
                orderInfo.productName = popupItems.map(item => `${item.title || item.name} x${item.quantity || 1}`).join(', ');
              }
            }

            if (notesData.shippingInfo) {
              const s = notesData.shippingInfo;
              orderInfo.shippingAddress = `[${s.zipcode || ''}] ${s.address || ''} ${s.addressDetail || ''}`.trim();
            }
          } catch (e) {
            console.error('❌ notes 파싱 실패:', e);
          }
        }
      }
    }

    // 고객 정보 조회 (Neon PostgreSQL)
    const { db: neonDb } = require('../../utils/neon-db.cjs');
    const userResult = await neonDb.query(
      'SELECT name, email FROM users WHERE id = $1 LIMIT 1',
      [exchange.user_id]
    );

    let customerName = '고객님';
    let customerEmail = '';

    if (userResult.rows && userResult.rows.length > 0) {
      customerName = userResult.rows[0].name || '고객님';
      customerEmail = userResult.rows[0].email || '';
    }

    // 응답
    return res.status(200).json({
      success: true,
      data: {
        id: exchange.id,
        originalOrderNumber: orderInfo.orderNumber,
        productName: orderInfo.productName,
        exchangeReason: exchange.exchange_reason,
        amount: exchange.amount,
        paymentStatus: exchange.payment_status,
        customerName,
        customerEmail,
        shippingAddress: orderInfo.shippingAddress,
        createdAt: exchange.created_at
      }
    });

  } catch (error) {
    console.error('❌ [Exchange Info] API error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '교환 정보 조회 중 오류가 발생했습니다.'
    });
  }
};
