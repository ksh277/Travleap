/**
 * 파트너 쿠폰북 통계 API
 * GET /api/partner/coupon-book-stats
 *
 * 쿠폰북 참여 파트너(is_coupon_partner=1)의 쿠폰 사용 통계
 * - 발급된 쿠폰 수
 * - 사용된 쿠폰 수
 * - 리뷰 수 및 평균 평점
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
    const userId = req.user?.userId || req.user?.id;
    const partnerId = req.user?.partnerId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: '로그인이 필요합니다'
      });
    }

    if (!partnerId) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: '파트너 계정이 아닙니다'
      });
    }

    // 1. 파트너 정보 확인 (쿠폰북 참여 여부)
    const partnerResult = await connection.execute(`
      SELECT id, business_name, is_coupon_partner,
             coupon_discount_type, coupon_discount_value, coupon_max_discount, coupon_min_order
      FROM partners
      WHERE id = ?
    `, [partnerId]);

    if (!partnerResult.rows || partnerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NOT_FOUND',
        message: '파트너 정보를 찾을 수 없습니다'
      });
    }

    const partner = partnerResult.rows[0];

    if (!partner.is_coupon_partner) {
      return res.status(200).json({
        success: true,
        data: {
          isParticipating: false,
          message: '쿠폰북에 참여하지 않은 가맹점입니다'
        }
      });
    }

    // 2. 이 파트너에서 발급된 쿠폰북 쿠폰 통계
    const couponStats = await connection.execute(`
      SELECT
        COUNT(*) as total_issued,
        SUM(CASE WHEN status = 'USED' THEN 1 ELSE 0 END) as total_used,
        SUM(CASE WHEN status = 'ISSUED' THEN 1 ELSE 0 END) as total_active,
        SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END) as total_expired
      FROM user_coupons
      WHERE claim_source = 'coupon_book' AND used_partner_id = ?
    `, [partnerId]);

    const stats = couponStats.rows[0] || {
      total_issued: 0,
      total_used: 0,
      total_active: 0,
      total_expired: 0
    };

    // 3. 리뷰 통계
    const reviewStats = await connection.execute(`
      SELECT
        COUNT(*) as review_count,
        COALESCE(AVG(rating), 0) as avg_rating,
        SUM(points_awarded) as total_points_awarded
      FROM coupon_reviews
      WHERE partner_id = ?
    `, [partnerId]);

    const reviews = reviewStats.rows[0] || {
      review_count: 0,
      avg_rating: 0,
      total_points_awarded: 0
    };

    // 4. 기간별 통계 (오늘, 이번 주, 이번 달)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const periodStats = await connection.execute(`
      SELECT
        SUM(CASE WHEN used_at >= ? THEN 1 ELSE 0 END) as today_used,
        SUM(CASE WHEN used_at >= ? THEN 1 ELSE 0 END) as week_used,
        SUM(CASE WHEN used_at >= ? THEN 1 ELSE 0 END) as month_used
      FROM user_coupons
      WHERE claim_source = 'coupon_book' AND used_partner_id = ? AND status = 'USED'
    `, [todayStart, weekStart, monthStart, partnerId]);

    const periods = periodStats.rows[0] || {
      today_used: 0,
      week_used: 0,
      month_used: 0
    };

    // 5. 최근 사용 내역 (5건)
    const recentUsage = await connection.execute(`
      SELECT uc.id, uc.coupon_code, uc.used_at,
             cr.rating, cr.comment
      FROM user_coupons uc
      LEFT JOIN coupon_reviews cr ON uc.id = cr.user_coupon_id
      WHERE uc.claim_source = 'coupon_book' AND uc.used_partner_id = ? AND uc.status = 'USED'
      ORDER BY uc.used_at DESC
      LIMIT 5
    `, [partnerId]);

    // 6. 할인 정보 텍스트 생성
    let discountText = '';
    if (partner.coupon_discount_type === 'percent') {
      discountText = `${partner.coupon_discount_value}% 할인`;
      if (partner.coupon_max_discount) {
        discountText += ` (최대 ${Number(partner.coupon_max_discount).toLocaleString()}원)`;
      }
    } else if (partner.coupon_discount_value) {
      discountText = `${Number(partner.coupon_discount_value).toLocaleString()}원 할인`;
    }

    console.log(`✅ [Partner Coupon Book Stats] Partner ${partnerId}: ${stats.total_used}/${stats.total_issued} used, ${reviews.review_count} reviews`);

    return res.status(200).json({
      success: true,
      data: {
        isParticipating: true,
        partner: {
          id: partner.id,
          name: partner.business_name,
          discountText
        },
        stats: {
          totalIssued: parseInt(stats.total_issued) || 0,
          totalUsed: parseInt(stats.total_used) || 0,
          totalActive: parseInt(stats.total_active) || 0,
          totalExpired: parseInt(stats.total_expired) || 0,
          usageRate: stats.total_issued > 0
            ? Math.round((parseInt(stats.total_used) / parseInt(stats.total_issued)) * 100)
            : 0
        },
        reviews: {
          count: parseInt(reviews.review_count) || 0,
          avgRating: parseFloat(reviews.avg_rating) || 0,
          totalPointsAwarded: parseInt(reviews.total_points_awarded) || 0
        },
        periods: {
          today: parseInt(periods.today_used) || 0,
          week: parseInt(periods.week_used) || 0,
          month: parseInt(periods.month_used) || 0
        },
        recentUsage: recentUsage.rows || []
      }
    });

  } catch (error) {
    console.error('❌ [Partner Coupon Book Stats] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '통계 조회 중 오류가 발생했습니다'
    });
  }
}

module.exports = withPublicCors(withAuth(handler, { requireAuth: true }));
