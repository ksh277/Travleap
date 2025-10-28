/**
 * 예약 조회 API
 * GET /api/bookings?user_id=xxx - 사용자별 예약 조회
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required'
      });
    }

    console.log('📖 [Bookings] 예약 조회 요청:', user_id);

    // bookings 테이블 조회 + payments 테이블에서 shipping 정보 가져오기
    const result = await connection.execute(`
      SELECT
        b.*,
        l.title as listing_title,
        l.image_url as listing_image,
        l.category,
        p.notes as payment_notes
      FROM bookings b
      LEFT JOIN listings l ON b.listing_id = l.id
      LEFT JOIN payments p ON b.order_number = p.gateway_transaction_id
      WHERE b.user_id = ?
      ORDER BY b.created_at DESC
    `, [user_id]);

    // shipping 정보를 payment notes에서 추출해서 booking 객체에 추가
    const bookings = (result.rows || []).map(booking => {
      let shippingInfo = null;

      if (booking.payment_notes) {
        try {
          const notes = JSON.parse(booking.payment_notes);
          shippingInfo = notes.shippingInfo || null;
        } catch (e) {
          console.error('Failed to parse payment notes:', e);
        }
      }

      return {
        ...booking,
        // shipping 정보 추가
        shipping_name: shippingInfo?.name || null,
        shipping_phone: shippingInfo?.phone || null,
        shipping_zipcode: shippingInfo?.zipcode || null,
        shipping_address: shippingInfo?.address || null,
        shipping_address_detail: shippingInfo?.addressDetail || null,
        // payment_notes는 클라이언트에 노출하지 않음
        payment_notes: undefined
      };
    });

    console.log(`✅ [Bookings] 예약 ${bookings.length}건 조회 완료`);

    return res.status(200).json({
      success: true,
      data: bookings
    });

  } catch (error) {
    console.error('❌ [Bookings] API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '예약 조회에 실패했습니다.'
    });
  }
};
