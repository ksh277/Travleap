const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // GET: 주문 목록 조회
    if (req.method === 'GET') {
      const result = await connection.execute(`
        SELECT
          b.*,
          l.title as listing_title,
          l.category,
          p.notes as payment_notes
        FROM bookings b
        LEFT JOIN listings l ON b.listing_id = l.id
        LEFT JOIN payments p ON b.order_number = p.gateway_transaction_id
        ORDER BY b.created_at DESC
      `);

      // customer_info와 shipping 정보 추출
      const bookings = (result.rows || []).map(booking => {
        let customerInfo = {};
        let shippingInfo = null;

        // customer_info 파싱
        try {
          if (booking.customer_info) {
            customerInfo = typeof booking.customer_info === 'string'
              ? JSON.parse(booking.customer_info)
              : booking.customer_info;
          }
        } catch (e) {
          console.error('customer_info 파싱 오류:', e);
        }

        // payment_notes에서 shippingInfo 추출
        try {
          if (booking.payment_notes) {
            const notes = typeof booking.payment_notes === 'string'
              ? JSON.parse(booking.payment_notes)
              : booking.payment_notes;
            shippingInfo = notes.shippingInfo || null;
          }
        } catch (e) {
          console.error('payment_notes 파싱 오류:', e);
        }

        return {
          ...booking,
          user_name: customerInfo.name || customerInfo.customer_name || 'Unknown',
          user_email: customerInfo.email || customerInfo.customer_email || '',
          // 배송 정보 추가
          shipping_name: shippingInfo?.name || null,
          shipping_phone: shippingInfo?.phone || null,
          shipping_zipcode: shippingInfo?.zipcode || null,
          shipping_address: shippingInfo?.address || null,
          shipping_address_detail: shippingInfo?.addressDetail || null,
          // payment_notes는 클라이언트에 노출하지 않음
          payment_notes: undefined
        };
      });

      return res.status(200).json({
        success: true,
        data: bookings
      });
    }

    // DELETE: 주문 삭제
    if (req.method === 'DELETE') {
      const { bookingId, orderId } = req.query;
      const id = bookingId || orderId;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'bookingId or orderId is required'
        });
      }

      console.log(`🗑️ [DELETE] 주문 삭제 요청 (ID: ${id})`);

      // 주문 삭제
      const result = await connection.execute(
        'DELETE FROM bookings WHERE id = ?',
        [id]
      );

      if (result.rowsAffected === 0) {
        return res.status(404).json({
          success: false,
          error: '주문을 찾을 수 없습니다.'
        });
      }

      console.log(`✅ 주문 삭제 완료 (ID: ${id})`);

      return res.status(200).json({
        success: true,
        message: '주문이 성공적으로 삭제되었습니다.'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('Error in orders API:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '서버 오류가 발생했습니다.'
    });
  }
};
