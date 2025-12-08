/**
 * 파트너 쿠폰 사용 내역 API
 * GET /api/partner/coupon-history
 *
 * 파트너가 처리한 쿠폰 사용 내역 조회
 */

const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');
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
  const poolNeon = new Pool({
    connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
  });

  try {
    const partnerId = req.user?.partnerId;

    if (!partnerId) {
      return res.status(403).json({
        success: false,
        error: 'PARTNER_REQUIRED',
        message: '파트너 계정으로 로그인해주세요'
      });
    }

    const { limit = 50, offset = 0, period = 'all' } = req.query;

    // 기간별 필터링을 위한 날짜 계산
    let dateFilter = '';
    let dateParams = [];
    if (period === 'today') {
      dateFilter = 'AND DATE(ucu.used_at) = CURDATE()';
    } else if (period === 'week') {
      dateFilter = 'AND ucu.used_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    } else if (period === 'month') {
      dateFilter = 'AND ucu.used_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)';
    }

    // 사용 내역 조회 (PlanetScale) - user_coupon_usage 테이블 사용
    const historyResult = await connection.execute(`
      SELECT
        ucu.id,
        ucu.user_id,
        uc.coupon_code,
        ucu.order_amount,
        ucu.discount_amount,
        ucu.final_amount,
        ucu.used_at,
        c.name as coupon_name
      FROM user_coupon_usage ucu
      LEFT JOIN user_coupons uc ON ucu.user_coupon_id = uc.id
      LEFT JOIN coupons c ON uc.coupon_id = c.id
      WHERE ucu.partner_id = ? ${dateFilter}
      ORDER BY ucu.used_at DESC
      LIMIT ? OFFSET ?
    `, [partnerId, parseInt(limit), parseInt(offset)]);

    // 유저 이름 조회 (Neon)
    const records = historyResult.rows || [];
    const userIds = [...new Set(records.map(r => r.user_id).filter(Boolean))];
    let userNames = {};

    if (userIds.length > 0) {
      try {
        const userResult = await poolNeon.query(
          `SELECT id, name FROM users WHERE id = ANY($1)`,
          [userIds]
        );
        userNames = userResult.rows.reduce((acc, user) => {
          acc[user.id] = user.name;
          return acc;
        }, {});
      } catch (e) {
        console.warn('⚠️ [Partner Coupon History] Neon user query failed:', e.message);
      }
    }

    // 유저 이름 매핑
    const historyWithNames = records.map(record => ({
      ...record,
      customer_name: userNames[record.user_id] || '고객'
    }));

    // 기간별 통계 조회 (user_coupon_usage 테이블 사용)
    const statsResult = await connection.execute(`
      SELECT
        COUNT(*) as total_count,
        COALESCE(SUM(discount_amount), 0) as total_discount,
        COALESCE(SUM(order_amount), 0) as total_order,
        COALESCE(AVG(discount_amount), 0) as avg_discount,
        COALESCE(AVG(order_amount), 0) as avg_order
      FROM user_coupon_usage
      WHERE partner_id = ? ${dateFilter}
    `, [partnerId]);

    const stats = statsResult.rows?.[0] || { total_count: 0, total_discount: 0, total_order: 0, avg_discount: 0, avg_order: 0 };

    // 전체 기간 통계 (항상 반환)
    const allTimeStatsResult = await connection.execute(`
      SELECT
        COUNT(*) as total_count,
        COALESCE(SUM(discount_amount), 0) as total_discount,
        COALESCE(SUM(order_amount), 0) as total_order
      FROM user_coupon_usage
      WHERE partner_id = ?
    `, [partnerId]);

    const allTimeStats = allTimeStatsResult.rows?.[0] || { total_count: 0, total_discount: 0, total_order: 0 };

    // 오늘 통계
    const todayStatsResult = await connection.execute(`
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(discount_amount), 0) as discount
      FROM user_coupon_usage
      WHERE partner_id = ? AND DATE(used_at) = CURDATE()
    `, [partnerId]);

    const todayStats = todayStatsResult.rows?.[0] || { count: 0, discount: 0 };

    // 이번주 통계
    const weekStatsResult = await connection.execute(`
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(discount_amount), 0) as discount
      FROM user_coupon_usage
      WHERE partner_id = ? AND used_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    `, [partnerId]);

    const weekStats = weekStatsResult.rows?.[0] || { count: 0, discount: 0 };

    // 이번달 통계
    const monthStatsResult = await connection.execute(`
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(discount_amount), 0) as discount
      FROM user_coupon_usage
      WHERE partner_id = ? AND used_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `, [partnerId]);

    const monthStats = monthStatsResult.rows?.[0] || { count: 0, discount: 0 };

    return res.status(200).json({
      success: true,
      data: historyWithNames,
      totalCount: parseInt(stats.total_count) || 0,
      totalDiscount: parseInt(stats.total_discount) || 0,
      totalOrder: parseInt(stats.total_order) || 0,
      avgDiscount: Math.round(parseFloat(stats.avg_discount)) || 0,
      avgOrder: Math.round(parseFloat(stats.avg_order)) || 0,
      allTime: {
        count: parseInt(allTimeStats.total_count) || 0,
        discount: parseInt(allTimeStats.total_discount) || 0,
        order: parseInt(allTimeStats.total_order) || 0
      },
      today: {
        count: parseInt(todayStats.count) || 0,
        discount: parseInt(todayStats.discount) || 0
      },
      week: {
        count: parseInt(weekStats.count) || 0,
        discount: parseInt(weekStats.discount) || 0
      },
      month: {
        count: parseInt(monthStats.count) || 0,
        discount: parseInt(monthStats.discount) || 0
      }
    });

  } catch (error) {
    console.error('❌ [Partner Coupon History] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '사용 내역 조회 중 오류가 발생했습니다'
    });
  } finally {
    try {
      await poolNeon.end();
    } catch (e) {
      // ignore
    }
  }
}

module.exports = withPublicCors(withAuth(handler, { requireAuth: true, requirePartner: true }));
