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

    const { limit = 50, offset = 0 } = req.query;

    // 사용 내역 조회 (PlanetScale) - users JOIN 제거
    const historyResult = await connection.execute(`
      SELECT
        uc.id,
        uc.user_id,
        uc.coupon_code,
        uc.order_amount,
        uc.discount_amount,
        uc.final_amount,
        uc.used_at,
        c.name as coupon_name
      FROM user_coupons uc
      LEFT JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.used_partner_id = ?
        AND uc.status = 'USED'
      ORDER BY uc.used_at DESC
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
      data: historyWithNames,
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
  } finally {
    try {
      await poolNeon.end();
    } catch (e) {
      // ignore
    }
  }
}

module.exports = withPublicCors(withAuth(handler, { requireAuth: true, requirePartner: true }));
