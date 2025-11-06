/**
 * 특정 주문의 상세 정보 디버깅 API
 * GET /api/admin/debug-order?order_number=DER_1761922261162_7787
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const { order_number } = req.query;

    if (!order_number) {
      return res.status(400).json({ error: 'order_number 파라미터가 필요합니다' });
    }

    console.log(`🔍 [Debug] 주문번호 조회: ${order_number}`);

    // 1. payments 테이블에서 조회
    const paymentsResult = await connection.execute(`
      SELECT
        p.id,
        p.user_id,
        p.amount,
        p.payment_status,
        p.payment_key,
        p.gateway_transaction_id,
        p.notes,
        p.booking_id,
        p.created_at
      FROM payments p
      WHERE p.gateway_transaction_id = ?
         OR p.gateway_transaction_id LIKE ?
         OR p.payment_key = ?
      LIMIT 5
    `, [order_number, `%${order_number}%`, order_number]);

    console.log(`📊 [Debug] payments 결과:`, paymentsResult.rows?.length || 0, '건');

    // 2. bookings 테이블에서 order_number로 조회
    const bookingsResult = await connection.execute(`
      SELECT
        b.id,
        b.booking_number,
        b.order_number,
        b.listing_id,
        b.user_id,
        b.status,
        b.delivery_status,
        b.guests,
        b.shipping_name,
        b.shipping_phone,
        b.shipping_address,
        b.shipping_address_detail,
        b.shipping_zipcode,
        b.created_at
      FROM bookings b
      WHERE b.order_number = ?
         OR b.order_number LIKE ?
         OR b.booking_number = ?
      ORDER BY b.created_at DESC
      LIMIT 10
    `, [order_number, `%${order_number}%`, order_number]);

    console.log(`📦 [Debug] bookings 결과:`, bookingsResult.rows?.length || 0, '건');

    // 3. payments에 booking_id가 있으면 해당 booking도 조회
    let linkedBookings = [];
    if (paymentsResult.rows && paymentsResult.rows.length > 0) {
      for (const payment of paymentsResult.rows) {
        if (payment.booking_id) {
          const linkedResult = await connection.execute(`
            SELECT
              b.id,
              b.booking_number,
              b.order_number,
              b.shipping_name,
              b.shipping_phone,
              b.shipping_address,
              b.shipping_address_detail,
              b.shipping_zipcode
            FROM bookings b
            WHERE b.id = ?
          `, [payment.booking_id]);

          if (linkedResult.rows && linkedResult.rows.length > 0) {
            linkedBookings.push(linkedResult.rows[0]);
          }
        }
      }
    }

    console.log(`🔗 [Debug] payment.booking_id로 찾은 bookings:`, linkedBookings.length, '건');

    // 4. notes 파싱
    const notesData = paymentsResult.rows?.map(p => {
      try {
        return p.notes ? JSON.parse(p.notes) : null;
      } catch (e) {
        return { error: 'JSON 파싱 실패', raw: p.notes };
      }
    });

    return res.status(200).json({
      search_query: order_number,
      timestamp: new Date().toISOString(),
      results: {
        payments: paymentsResult.rows || [],
        bookings: bookingsResult.rows || [],
        linked_bookings: linkedBookings,
        notes_parsed: notesData
      },
      diagnosis: {
        has_payments: (paymentsResult.rows?.length || 0) > 0,
        has_bookings: (bookingsResult.rows?.length || 0) > 0,
        has_shipping_in_bookings: bookingsResult.rows?.some(b =>
          b.shipping_name || b.shipping_phone || b.shipping_address
        ) || false,
        has_shipping_in_notes: notesData?.some(n =>
          n?.shippingInfo?.name || n?.shippingInfo?.phone || n?.shippingInfo?.address
        ) || false
      }
    });

  } catch (error) {
    console.error('❌ [Debug] 에러:', error);
    return res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
};
