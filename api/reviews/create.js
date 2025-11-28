/**
 * 쿠폰 리뷰 작성 + 포인트 적립 API
 * POST /api/reviews/create
 *
 * Body: { user_coupon_id, rating, comment }
 *
 * 플로우:
 * 1. user_coupons 조회 (status='USED', review_submitted=FALSE)
 * 2. coupon_reviews 테이블에 리뷰 저장
 * 3. user_coupons.review_submitted = TRUE 업데이트
 * 4. Neon users.total_points += 500
 * 5. PlanetScale user_points에 이력 추가
 */

const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

const REVIEW_POINTS = 500; // 리뷰 작성 시 적립 포인트

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'POST 요청만 허용됩니다'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });
  const poolNeon = new Pool({
    connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
  });

  try {
    const userId = req.user?.id || req.user?.userId;
    const { user_coupon_id, rating, comment } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: '로그인이 필요합니다'
      });
    }

    if (!user_coupon_id) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_USER_COUPON_ID',
        message: '쿠폰 ID를 입력해주세요'
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_RATING',
        message: '평점은 1~5 사이의 숫자를 입력해주세요'
      });
    }

    // 1. 사용한 쿠폰 조회 (본인 것만, 리뷰 미작성)
    const userCouponResult = await connection.execute(`
      SELECT
        uc.id, uc.user_id, uc.used_partner_id, uc.coupon_code, uc.coupon_id,
        uc.status, uc.review_submitted,
        p.business_name as partner_name,
        c.name as coupon_name
      FROM user_coupons uc
      LEFT JOIN partners p ON uc.used_partner_id = p.id
      LEFT JOIN coupons c ON uc.coupon_id = c.id
      WHERE uc.id = ? AND uc.user_id = ?
      LIMIT 1
    `, [user_coupon_id, userId]);

    if (!userCouponResult.rows || userCouponResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'COUPON_NOT_FOUND',
        message: '쿠폰을 찾을 수 없습니다'
      });
    }

    const userCoupon = userCouponResult.rows[0];

    // 사용된 쿠폰인지 확인
    if (userCoupon.status !== 'USED') {
      return res.status(400).json({
        success: false,
        error: 'COUPON_NOT_USED',
        message: '사용된 쿠폰만 리뷰를 작성할 수 있습니다'
      });
    }

    // 이미 리뷰 작성했는지 확인
    if (userCoupon.review_submitted) {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_REVIEWED',
        message: '이미 리뷰를 작성했습니다'
      });
    }

    // 2. coupon_reviews에 리뷰 저장 (merchant_id, campaign_id는 기존 스키마 호환용)
    const partnerId = userCoupon.used_partner_id || 0;
    const couponId = userCoupon.coupon_id || 0;

    await connection.execute(`
      INSERT INTO coupon_reviews (
        user_coupon_id, user_id, merchant_id, campaign_id, partner_id, rating, comment, review_text, points_awarded
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [user_coupon_id, userId, partnerId, couponId, partnerId, rating, comment || '', comment || '', REVIEW_POINTS]);

    // 3. user_coupons.review_submitted = TRUE 업데이트
    await connection.execute(`
      UPDATE user_coupons
      SET review_submitted = TRUE, review_points_awarded = ?
      WHERE id = ?
    `, [REVIEW_POINTS, user_coupon_id]);

    // 4. Neon users.total_points 업데이트
    await poolNeon.query('BEGIN');

    const userResult = await poolNeon.query(
      'SELECT total_points FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    const currentPoints = userResult.rows?.[0]?.total_points || 0;
    const newBalance = currentPoints + REVIEW_POINTS;

    await poolNeon.query(
      'UPDATE users SET total_points = $1 WHERE id = $2',
      [newBalance, userId]
    );

    await poolNeon.query('COMMIT');

    // 5. PlanetScale user_points에 이력 추가
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1년 후 만료

    await connection.execute(`
      INSERT INTO user_points (
        user_id, points, point_type, reason, related_order_id, balance_after, expires_at, created_at
      ) VALUES (?, ?, 'earn', ?, ?, ?, ?, NOW())
    `, [
      userId,
      REVIEW_POINTS,
      `쿠폰 리뷰 작성 (${userCoupon.partner_name || '가맹점'})`,
      `REVIEW_${user_coupon_id}`,
      newBalance,
      expiresAt
    ]);

    console.log(`✅ [Review] 리뷰 작성 완료: userId=${userId}, couponId=${user_coupon_id}, points=+${REVIEW_POINTS}`);

    return res.status(201).json({
      success: true,
      message: '리뷰가 작성되었습니다. 500P가 적립되었습니다!',
      data: {
        points_earned: REVIEW_POINTS,
        new_balance: newBalance,
        partner_name: userCoupon.partner_name,
        coupon_name: userCoupon.coupon_name
      }
    });

  } catch (error) {
    console.error('❌ [Review Create] Error:', error);

    try {
      await poolNeon.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('❌ [Review Create] Rollback failed:', rollbackError);
    }

    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '리뷰 작성 중 오류가 발생했습니다'
    });
  } finally {
    try {
      await poolNeon.end();
    } catch (e) {
      // ignore
    }
  }
}

module.exports = withPublicCors(withAuth(handler, { requireAuth: true }));
