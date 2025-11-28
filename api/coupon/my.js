/**
 * 내 쿠폰 조회 API
 * GET /api/coupon/my
 *
 * 로그인한 사용자의 쿠폰 목록 조회
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
    const userId = req.user?.id || req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: '로그인이 필요합니다'
      });
    }

    const { status } = req.query; // 선택적 필터: ISSUED, USED, EXPIRED

    let query = `
      SELECT
        uc.id as user_coupon_id,
        uc.coupon_code,
        uc.status,
        uc.issued_at,
        uc.expires_at,
        uc.used_at,
        uc.used_partner_id,
        uc.order_amount,
        uc.discount_amount,
        uc.final_amount,
        uc.review_submitted,
        c.code as campaign_code,
        c.name as coupon_name,
        c.description as coupon_description,
        c.default_discount_type as discount_type,
        c.default_discount_value as discount_value,
        c.default_max_discount as max_discount,
        p.business_name as used_partner_name
      FROM user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      LEFT JOIN partners p ON uc.used_partner_id = p.id
      WHERE uc.user_id = ?
    `;

    const params = [userId];

    if (status) {
      query += ' AND uc.status = ?';
      params.push(status.toUpperCase());
    }

    query += ' ORDER BY uc.issued_at DESC';

    const result = await connection.execute(query, params);

    // 만료된 쿠폰 상태 업데이트
    const now = new Date();
    const coupons = (result.rows || []).map(coupon => {
      if (coupon.status === 'ISSUED' && coupon.expires_at && new Date(coupon.expires_at) < now) {
        // 만료 상태로 표시 (DB 업데이트는 별도 처리)
        return { ...coupon, status: 'EXPIRED' };
      }
      return coupon;
    });

    return res.status(200).json({
      success: true,
      data: coupons,
      count: coupons.length
    });

  } catch (error) {
    console.error('❌ [My Coupons] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '쿠폰 조회 중 오류가 발생했습니다'
    });
  }
}

module.exports = withPublicCors(withAuth(handler, { requireAuth: true }));
