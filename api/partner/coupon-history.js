/**
 * 파트너 쿠폰 사용 내역 API
 * GET /api/partner/coupon-history
 *
 * 파트너가 처리한 쿠폰 사용 내역 조회
 */

const { connect } = require('@planetscale/database');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'GET 요청만 허용됩니다'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const partnerId = req.user?.partnerId;

    if (!partnerId) {
      return res.status(403).json({
        success: false,
        error: 'PARTNER_REQUIRED',
        message: '파트너 계정으로 로그인해주세요'
      });
    }

    const { limit = 50, offset = 0 } = req.query;

    // 사용 내역 조회
    const historyResult = await connection.execute(`
      SELECT
        uc.id,
        uc.coupon_code,
        uc.order_amount,
        uc.discount_amount,
        uc.final_amount,
        uc.used_at,
        u.name as customer_name,
        c.name as coupon_name
      FROM user_coupons uc
      LEFT JOIN users u ON uc.user_id = u.id
      LEFT JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.used_partner_id = ?
        AND uc.status = 'USED'
      ORDER BY uc.used_at DESC
      LIMIT ? OFFSET ?
    `, [partnerId, parseInt(limit), parseInt(offset)]);

    // 통계 조회
    const statsResult = await connection.execute(`
      SELECT
        COUNT(*) as total_count,
        COALESCE(SUM(discount_amount), 0) as total_discount
      FROM user_coupons
      WHERE used_partner_id = ?
        AND status = 'USED'
    `, [partnerId]);

    const stats = statsResult.rows?.[0] || { total_count: 0, total_discount: 0 };

    return res.status(200).json({
      success: true,
      data: historyResult.rows || [],
      totalCount: parseInt(stats.total_count) || 0,
      totalDiscount: parseInt(stats.total_discount) || 0
    });

  } catch (error) {
    console.error('❌ [Partner Coupon History] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '사용 내역 조회 중 오류가 발생했습니다'
    });
  }
}

module.exports = withPublicCors(withAuth(handler, { requireAuth: true, requirePartner: true }));
