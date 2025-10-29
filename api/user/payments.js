/**
 * 사용자 결제 내역 조회 API
 * GET /api/user/payments?userId=123
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // x-user-id 헤더에서 userId 읽기 (쿼리 파라미터도 fallback)
    const userId = req.headers['x-user-id'] || req.query.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required (x-user-id header or userId query param)'
      });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // 결제 내역 조회 (최신순, 숨김 처리된 내역 제외)
    const result = await connection.execute(`
      SELECT
        p.id,
        p.booking_id,
        p.order_id,
        p.order_id_str,
        p.gateway_transaction_id,
        p.amount,
        p.payment_method,
        p.payment_status,
        p.payment_key,
        p.approved_at,
        p.receipt_url,
        p.card_company,
        p.card_number,
        p.created_at,
        p.notes,
        p.refund_amount,
        p.refund_reason,
        p.refunded_at,
        b.booking_number,
        b.listing_id,
        b.start_date,
        b.end_date,
        b.selected_option_id,
        b.guests,
        b.adults,
        b.children,
        b.infants,
        l.title as listing_title,
        l.category,
        l.images as listing_images
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      LEFT JOIN listings l ON b.listing_id = l.id
      WHERE p.user_id = ?
        AND (p.hidden_from_user IS NULL OR p.hidden_from_user = 0)
      ORDER BY p.created_at DESC
      LIMIT 50
    `, [parseInt(userId)]);

    return res.status(200).json({
      success: true,
      data: result.rows || []
    });

  } catch (error) {
    console.error('❌ [User Payments] API error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || '결제 내역 조회에 실패했습니다.'
    });
  }
};
