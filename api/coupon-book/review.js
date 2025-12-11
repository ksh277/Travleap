/**
 * 쿠폰북 - 사용 후 리뷰 작성 API
 * POST /api/coupon-book/review
 *
 * 쿠폰 사용 후 리뷰 작성 및 100포인트 지급
 */

const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const REVIEW_POINTS = 100; // 리뷰 작성 시 지급 포인트

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  // 인증 확인
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }

  let userId;
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    userId = decoded.userId;
  } catch (err) {
    return res.status(401).json({ success: false, error: '유효하지 않은 토큰입니다.' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });
  const poolNeon = new Pool({
    connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
  });

  try {
    const { userCouponId, rating, comment } = req.body;

    if (!userCouponId) {
      return res.status(400).json({
        success: false,
        error: '쿠폰 ID가 필요합니다.'
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: '평점을 선택해주세요 (1-5)'
      });
    }

    // 1. 해당 쿠폰이 사용자 소유이고, USED 상태인지 확인
    const couponResult = await connection.execute(`
      SELECT uc.id, uc.coupon_code, uc.status, uc.used_partner_id, uc.used_at,
             p.business_name as partner_name
      FROM user_coupons uc
      LEFT JOIN partners p ON uc.used_partner_id = p.id
      WHERE uc.id = ? AND uc.user_id = ? AND uc.claim_source = 'coupon_book'
    `, [userCouponId, userId]);

    if (!couponResult.rows || couponResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '쿠폰을 찾을 수 없습니다.'
      });
    }

    const coupon = couponResult.rows[0];

    if (coupon.status !== 'USED') {
      return res.status(400).json({
        success: false,
        error: '사용 완료된 쿠폰만 리뷰를 작성할 수 있습니다.'
      });
    }

    // 2. 이미 리뷰를 작성했는지 확인
    const existingReview = await connection.execute(`
      SELECT id FROM coupon_reviews
      WHERE user_coupon_id = ? AND user_id = ?
    `, [userCouponId, userId]);

    if (existingReview.rows && existingReview.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: '이미 이 쿠폰에 대한 리뷰를 작성하셨습니다.'
      });
    }

    // 3. 리뷰 저장
    await connection.execute(`
      INSERT INTO coupon_reviews (
        user_id, partner_id, user_coupon_id, rating, comment, review_text,
        points_awarded, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      userId,
      coupon.used_partner_id,
      userCouponId,
      rating,
      comment || '',
      comment || '',
      REVIEW_POINTS
    ]);

    // 4. 포인트 지급 (Neon PostgreSQL)
    // 4-1. user_points에 기록 추가
    const currentBalanceResult = await poolNeon.query(
      'SELECT total_points FROM users WHERE id = $1',
      [userId]
    );
    const currentBalance = currentBalanceResult.rows[0]?.total_points || 0;
    const newBalance = currentBalance + REVIEW_POINTS;

    // 포인트 만료일 (1년 후)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await poolNeon.query(`
      INSERT INTO user_points (
        user_id, points, point_type, reason, balance_after, expires_at, created_at
      ) VALUES ($1, $2, 'earn', $3, $4, $5, NOW())
    `, [
      userId,
      REVIEW_POINTS,
      `쿠폰 리뷰 작성 (${coupon.partner_name || '가맹점'})`,
      newBalance,
      expiresAt
    ]);

    // 4-2. users 테이블의 total_points 업데이트
    await poolNeon.query(
      'UPDATE users SET total_points = $1 WHERE id = $2',
      [newBalance, userId]
    );

    // 5. user_coupons에 리뷰 작성 완료 표시 (review_submitted 필드가 있다면)
    try {
      await connection.execute(`
        UPDATE user_coupons SET review_submitted = 1 WHERE id = ?
      `, [userCouponId]);
    } catch (e) {
      // review_submitted 컬럼이 없을 수 있으므로 무시
    }

    console.log(`✅ [Coupon Review] User ${userId} 리뷰 작성 완료 (partner: ${coupon.used_partner_id}, points: ${REVIEW_POINTS})`);

    return res.status(201).json({
      success: true,
      message: '리뷰가 등록되었습니다!',
      data: {
        pointsAwarded: REVIEW_POINTS,
        newTotalPoints: newBalance,
        partnerName: coupon.partner_name
      }
    });

  } catch (error) {
    console.error('❌ [Coupon Review] Error:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다.'
    });
  } finally {
    try {
      await poolNeon.end();
    } catch (e) {
      // ignore
    }
  }
};
