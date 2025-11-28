/**
 * 파트너 예약 조회 API
 * GET /api/partner/reservations
 *
 * 파트너의 예약 목록 조회
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

    const { status, limit = 50, offset = 0 } = req.query;

    // 예약 조회 쿼리 빌드
    let whereClause = 'WHERE r.vendor_id = ?';
    const params = [partnerId];

    if (status && status !== 'all') {
      whereClause += ' AND r.status = ?';
      params.push(status);
    }

    params.push(parseInt(limit), parseInt(offset));

    // 예약 목록 조회 (PlanetScale)
    const reservationsResult = await connection.execute(`
      SELECT
        r.id,
        r.user_id,
        r.vendor_id,
        r.listing_id,
        r.check_in_date,
        r.check_out_date,
        r.guests,
        r.total_price,
        r.status,
        r.special_requests,
        r.contact_phone,
        r.contact_email,
        r.created_at,
        l.title as listing_title
      FROM reservations r
      LEFT JOIN listings l ON r.listing_id = l.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `, params);

    // 유저 이름 조회 (Neon)
    const records = reservationsResult.rows || [];
    const userIds = [...new Set(records.map(r => r.user_id).filter(Boolean))];
    let userNames = {};

    if (userIds.length > 0) {
      try {
        const userResult = await poolNeon.query(
          `SELECT id, name, email FROM users WHERE id = ANY($1)`,
          [userIds]
        );
        userNames = userResult.rows.reduce((acc, user) => {
          acc[user.id] = { name: user.name, email: user.email };
          return acc;
        }, {});
      } catch (e) {
        console.warn('⚠️ [Partner Reservations] Neon user query failed:', e.message);
      }
    }

    // 유저 정보 매핑
    const reservationsWithUsers = records.map(record => ({
      ...record,
      customer_name: userNames[record.user_id]?.name || '고객',
      customer_email: userNames[record.user_id]?.email || record.contact_email
    }));

    // 통계 조회
    const statsResult = await connection.execute(`
      SELECT
        COUNT(*) as total_count,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        COALESCE(SUM(CASE WHEN status = 'confirmed' THEN total_price ELSE 0 END), 0) as total_revenue
      FROM reservations
      WHERE vendor_id = ?
    `, [partnerId]);

    const stats = statsResult.rows?.[0] || {
      total_count: 0,
      pending_count: 0,
      confirmed_count: 0,
      cancelled_count: 0,
      total_revenue: 0
    };

    console.log(`✅ [Partner Reservations] ${records.length}개 예약 조회 (partner=${partnerId})`);

    return res.status(200).json({
      success: true,
      data: reservationsWithUsers,
      stats: {
        total_count: parseInt(stats.total_count) || 0,
        pending_count: parseInt(stats.pending_count) || 0,
        confirmed_count: parseInt(stats.confirmed_count) || 0,
        cancelled_count: parseInt(stats.cancelled_count) || 0,
        total_revenue: parseInt(stats.total_revenue) || 0
      }
    });

  } catch (error) {
    console.error('❌ [Partner Reservations] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '예약 조회 중 오류가 발생했습니다'
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
