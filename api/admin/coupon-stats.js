/**
 * 관리자 쿠폰 통계 API
 * GET /api/admin/coupon-stats
 *
 * 전체 쿠폰 통계를 조회:
 * - 전체 쿠폰 발급 수
 * - 전체 쿠폰 사용 수
 * - 쿠폰별 사용 통계
 * - 가맹점별 쿠폰 사용 통계
 * - 전체 할인금액 합계
 * - 기간별 통계
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
  // req.user.role이 'admin', 'super_admin', 'md_admin'인지 확인
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
    const { period, start_date, end_date, category } = req.query;

    // 기간 필터 설정 (user_coupon_usage 테이블 기준)
    let dateFilter = '';
    let dateParams = [];

    if (start_date && end_date) {
      dateFilter = 'AND ucu.used_at BETWEEN ? AND ?';
      dateParams = [start_date, end_date];
    } else if (period) {
      const now = new Date();
      let startDate;

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = null;
      }

      if (startDate) {
        dateFilter = 'AND ucu.used_at >= ?';
        dateParams = [startDate.toISOString()];
      }
    }

    // 카테고리 필터
    let categoryFilter = '';
    let categoryParams = [];
    if (category && category !== 'all') {
      categoryFilter = 'AND p.services = ?';
      categoryParams = [category];
    }

    // 1. 전체 통계 (user_coupon_usage 테이블 기반)
    const overallResult = await connection.execute(`
      SELECT
        (SELECT COUNT(*) FROM user_coupons WHERE coupon_code IS NOT NULL) as total_issued,
        (SELECT COUNT(*) FROM user_coupon_usage) as total_used,
        (SELECT COALESCE(SUM(discount_amount), 0) FROM user_coupon_usage) as total_discount_amount,
        (SELECT COALESCE(SUM(order_amount), 0) FROM user_coupon_usage) as total_order_amount,
        (SELECT COUNT(DISTINCT partner_id) FROM user_coupon_usage WHERE partner_id IS NOT NULL) as active_partners
    `);

    const overall = overallResult.rows?.[0] || {
      total_issued: 0,
      total_used: 0,
      total_discount_amount: 0,
      total_order_amount: 0,
      active_partners: 0
    };

    // 2. 쿠폰(캠페인)별 통계 (user_coupon_usage 테이블 기반)
    const couponStatsResult = await connection.execute(`
      SELECT
        c.id,
        c.code,
        c.name,
        c.discount_type,
        c.discount_value,
        c.is_active,
        (SELECT COUNT(*) FROM user_coupons WHERE coupon_id = c.id AND coupon_code IS NOT NULL) as issued_count,
        COALESCE(ucu_stats.used_count, 0) as used_count,
        COALESCE(ucu_stats.total_discount, 0) as total_discount,
        COALESCE(ucu_stats.total_orders, 0) as total_orders
      FROM coupons c
      LEFT JOIN (
        SELECT
          uc.coupon_id,
          COUNT(ucu.id) as used_count,
          SUM(ucu.discount_amount) as total_discount,
          SUM(ucu.order_amount) as total_orders
        FROM user_coupons uc
        INNER JOIN user_coupon_usage ucu ON uc.id = ucu.user_coupon_id
        GROUP BY uc.coupon_id
      ) ucu_stats ON c.id = ucu_stats.coupon_id
      ORDER BY used_count DESC
      LIMIT 20
    `);

    // 3. 가맹점별 통계 (user_coupon_usage 테이블 기반)
    const partnerStatsQuery = `
      SELECT
        p.id,
        p.business_name,
        p.services as category,
        p.total_coupon_usage,
        p.total_discount_given,
        COUNT(ucu.id) as usage_count,
        COALESCE(SUM(ucu.discount_amount), 0) as discount_amount,
        COALESCE(SUM(ucu.order_amount), 0) as order_amount
      FROM partners p
      LEFT JOIN user_coupon_usage ucu ON p.id = ucu.partner_id ${dateFilter} ${categoryFilter}
      WHERE p.is_coupon_partner = 1 AND p.status = 'approved'
      GROUP BY p.id, p.business_name, p.services, p.total_coupon_usage, p.total_discount_given
      ORDER BY usage_count DESC
      LIMIT 50
    `;

    const partnerStatsResult = await connection.execute(
      partnerStatsQuery,
      [...dateParams, ...categoryParams]
    );

    // 4. 일별 통계 (최근 30일, user_coupon_usage 테이블 기반)
    const dailyStatsResult = await connection.execute(`
      SELECT
        DATE(used_at) as date,
        COUNT(*) as usage_count,
        COALESCE(SUM(discount_amount), 0) as discount_amount,
        COALESCE(SUM(order_amount), 0) as order_amount
      FROM user_coupon_usage
      WHERE used_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(used_at)
      ORDER BY date DESC
    `);

    // 5. 카테고리별 통계 (user_coupon_usage 테이블 기반)
    const categoryStatsResult = await connection.execute(`
      SELECT
        COALESCE(p.services, 'unknown') as category,
        COUNT(ucu.id) as usage_count,
        COALESCE(SUM(ucu.discount_amount), 0) as discount_amount,
        COALESCE(SUM(ucu.order_amount), 0) as order_amount,
        COUNT(DISTINCT p.id) as partner_count
      FROM user_coupon_usage ucu
      LEFT JOIN partners p ON ucu.partner_id = p.id
      GROUP BY p.services
      ORDER BY usage_count DESC
    `);

    // 6. 최근 사용 내역 (최근 50건, user_coupon_usage 테이블 기반)
    const recentUsageResult = await connection.execute(`
      SELECT
        ucu.id,
        uc.coupon_code,
        ucu.order_amount,
        ucu.discount_amount,
        ucu.final_amount,
        ucu.used_at,
        c.code as campaign_code,
        c.name as coupon_name,
        p.business_name as partner_name,
        p.services as partner_category
      FROM user_coupon_usage ucu
      LEFT JOIN user_coupons uc ON ucu.user_coupon_id = uc.id
      LEFT JOIN coupons c ON uc.coupon_id = c.id
      LEFT JOIN partners p ON ucu.partner_id = p.id
      ORDER BY ucu.used_at DESC
      LIMIT 50
    `);

    console.log(`✅ [Admin] 쿠폰 통계 조회 완료`);

    // 쿠폰 통계에 프론트엔드 호환 필드 추가
    const couponStats = (couponStatsResult.rows || []).map(c => ({
      ...c,
      default_discount_type: c.discount_type === 'percentage' ? 'PERCENT' : 'AMOUNT',
      default_discount_value: c.discount_value
    }));

    return res.status(200).json({
      success: true,
      data: {
        overall: {
          total_issued: parseInt(overall.total_issued) || 0,
          total_used: parseInt(overall.total_used) || 0,
          total_discount_amount: parseInt(overall.total_discount_amount) || 0,
          total_order_amount: parseInt(overall.total_order_amount) || 0,
          active_partners: parseInt(overall.active_partners) || 0,
          usage_rate: overall.total_issued > 0
            ? Math.round((overall.total_used / overall.total_issued) * 100)
            : 0
        },
        coupon_stats: couponStats,
        partner_stats: partnerStatsResult.rows || [],
        daily_stats: dailyStatsResult.rows || [],
        category_stats: categoryStatsResult.rows || [],
        recent_usage: recentUsageResult.rows || []
      }
    });

  } catch (error) {
    console.error('❌ [Admin Coupon Stats] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '통계 조회 중 오류가 발생했습니다'
    });
  }
}

module.exports = withPublicCors(withAuth(handler, { requireAuth: true, requireMDAdmin: true }));
