/**
 * 쿠폰 정산 관리 API
 * GET /api/admin/coupon-settlements - 가맹점별 쿠폰 사용/정산 내역 조회
 *
 * 쿠폰 정산 = 파트너가 고객에게 제공한 할인 금액 집계
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

  // 관리자 권한 확인 (withAuth에서 requireAdmin: true로 이미 확인됨)
  const adminRoles = ['admin', 'super_admin', 'md_admin'];
  if (!req.user || !adminRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      error: 'FORBIDDEN',
      message: '관리자 권한이 필요합니다'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const { start_date, end_date } = req.query;

    // 기간 조건
    let dateCondition = '';
    const params = [];

    if (start_date) {
      dateCondition += ' AND ucu.used_at >= ?';
      params.push(start_date);
    }
    if (end_date) {
      dateCondition += ' AND ucu.used_at <= ?';
      params.push(end_date + ' 23:59:59');
    }

    // 파트너별 쿠폰 사용 통계 (user_coupon_usage 테이블 사용)
    const settlementsResult = await connection.execute(`
      SELECT
        p.id as partner_id,
        p.business_name,
        p.services as category,
        p.contact_email as email,
        p.contact_phone as phone,
        COUNT(ucu.id) as usage_count,
        COALESCE(SUM(ucu.order_amount), 0) as total_order_amount,
        COALESCE(SUM(ucu.discount_amount), 0) as total_discount,
        COALESCE(SUM(ucu.final_amount), 0) as total_final_amount,
        MIN(ucu.used_at) as first_usage_date,
        MAX(ucu.used_at) as last_usage_date
      FROM partners p
      INNER JOIN user_coupon_usage ucu ON p.id = ucu.partner_id
      WHERE 1=1
        ${dateCondition}
      GROUP BY p.id, p.business_name, p.services, p.contact_email, p.contact_phone
      ORDER BY total_discount DESC
    `, params);

    // 전체 통계 (user_coupon_usage 테이블 사용)
    const statsResult = await connection.execute(`
      SELECT
        COUNT(DISTINCT ucu.partner_id) as total_partners,
        COUNT(ucu.id) as total_usage_count,
        COALESCE(SUM(ucu.order_amount), 0) as total_order_amount,
        COALESCE(SUM(ucu.discount_amount), 0) as total_discount,
        COALESCE(SUM(ucu.final_amount), 0) as total_final_amount
      FROM user_coupon_usage ucu
      WHERE 1=1
        ${dateCondition}
    `, params);

    const settlements = settlementsResult.rows || [];
    const stats = statsResult.rows?.[0] || {
      total_partners: 0,
      total_usage_count: 0,
      total_order_amount: 0,
      total_discount: 0,
      total_final_amount: 0
    };

    console.log(`✅ [Admin Coupon Settlements] ${settlements.length}개 파트너 정산 조회`);

    return res.status(200).json({
      success: true,
      data: settlements,
      stats: {
        total_partners: parseInt(stats.total_partners) || 0,
        total_usage_count: parseInt(stats.total_usage_count) || 0,
        total_order_amount: parseInt(stats.total_order_amount) || 0,
        total_discount: parseInt(stats.total_discount) || 0,
        total_final_amount: parseInt(stats.total_final_amount) || 0
      }
    });

  } catch (error) {
    console.error('❌ [Admin Coupon Settlements] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '쿠폰 정산 조회 중 오류가 발생했습니다'
    });
  }
}

module.exports = withPublicCors(withAuth(handler, { requireAuth: true, requireAdmin: true }));
