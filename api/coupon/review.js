/**
 * 연동 쿠폰 후기 작성 API
 * POST /api/coupon/review
 *
 * 쿠폰 사용 후 후기 작성 및 포인트 지급
 * - integrated_coupon_reviews 테이블에 저장
 * - 후기 포인트 지급 (기본 500P)
 */

const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');
const { withAuth } = require('../../utils/auth-middleware.cjs');
const { withPublicCors } = require('../../utils/cors-middleware.cjs');

// 후기 포인트 (환경변수로 설정 가능)
const REVIEW_POINTS = parseInt(process.env.COUPON_REVIEW_POINTS || '500');

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'METHOD_NOT_ALLOWED',
      message: 'POST 요청만 허용됩니다'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });
  const poolNeon = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL });

  try {
    const userId = req.user?.userId || req.user?.id;
    const {
      usage_id,      // integrated_coupon_usage.id
      rating,        // 1-5
      content,       // 후기 내용 (10글자 이상)
      images = []    // 이미지 URL 배열
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: '로그인이 필요합니다'
      });
    }

    if (!usage_id) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_USAGE_ID',
        message: '쿠폰 사용 내역 ID가 필요합니다'
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_RATING',
        message: '평점은 1-5 사이여야 합니다'
      });
    }

    if (!content || content.length < 10) {
      return res.status(400).json({
        success: false,
        error: 'CONTENT_TOO_SHORT',
        message: '후기는 10글자 이상 작성해주세요'
      });
    }

    // 1. 쿠폰 사용 내역 확인
    const usageResult = await connection.execute(`
      SELECT icu.*, cm.user_id as coupon_owner_id, p.business_name
      FROM integrated_coupon_usage icu
      JOIN coupon_master cm ON icu.coupon_id = cm.id
      JOIN partners p ON icu.merchant_id = p.id
      WHERE icu.id = ?
    `, [usage_id]);

    if (!usageResult.rows || usageResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'USAGE_NOT_FOUND',
        message: '쿠폰 사용 내역을 찾을 수 없습니다'
      });
    }

    const usage = usageResult.rows[0];

    // 본인 확인
    if (usage.coupon_owner_id !== userId && usage.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: '본인의 쿠폰 사용 내역만 후기를 작성할 수 있습니다'
      });
    }

    // 이미 후기 작성 여부 확인
    if (usage.review_submitted === 1) {
      return res.status(400).json({
        success: false,
        error: 'ALREADY_REVIEWED',
        message: '이미 후기를 작성했습니다'
      });
    }

    // 2. 후기 저장
    const reviewResult = await connection.execute(`
      INSERT INTO integrated_coupon_reviews (
        user_id, merchant_id, coupon_usage_id, rating, content, images,
        points_awarded, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      userId,
      usage.merchant_id,
      usage_id,
      rating,
      content,
      JSON.stringify(images)
    ]);

    const reviewId = reviewResult.insertId;

    // 3. 쿠폰 사용 내역 업데이트
    await connection.execute(`
      UPDATE integrated_coupon_usage
      SET review_id = ?, review_submitted = 1, review_points_awarded = ?
      WHERE id = ?
    `, [reviewId, REVIEW_POINTS, usage_id]);

    // 4. 포인트 지급 (Neon PostgreSQL)
    let newBalance = 0;
    try {
      await poolNeon.query('BEGIN');

      // 현재 포인트 조회
      const userResult = await poolNeon.query(
        'SELECT total_points FROM users WHERE id = $1 FOR UPDATE',
        [userId]
      );

      const currentPoints = userResult.rows?.[0]?.total_points || 0;
      newBalance = currentPoints + REVIEW_POINTS;

      // 포인트 내역 추가 (PlanetScale)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 365);

      await connection.execute(`
        INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after, expires_at, created_at)
        VALUES (?, ?, 'earn', ?, ?, ?, ?, NOW())
      `, [
        userId,
        REVIEW_POINTS,
        `쿠폰 후기 작성 포인트 (가맹점: ${usage.business_name})`,
        String(usage_id),
        newBalance,
        expiresAt
      ]);

      // 사용자 포인트 업데이트 (Neon)
      await poolNeon.query(
        'UPDATE users SET total_points = $1 WHERE id = $2',
        [newBalance, userId]
      );

      // 후기에 포인트 기록
      await connection.execute(
        'UPDATE integrated_coupon_reviews SET points_awarded = ? WHERE id = ?',
        [REVIEW_POINTS, reviewId]
      );

      await poolNeon.query('COMMIT');

      console.log(`✅ [Coupon Review] 후기 작성 완료 + ${REVIEW_POINTS}P 지급 (user=${userId}, usage=${usage_id})`);

    } catch (pointsError) {
      console.error('❌ [Coupon Review] 포인트 지급 실패:', pointsError);
      await poolNeon.query('ROLLBACK');
      // 포인트 지급 실패해도 후기는 저장됨
    }

    return res.status(200).json({
      success: true,
      message: '후기가 작성되었습니다',
      data: {
        review_id: reviewId,
        merchant_name: usage.business_name,
        rating,
        points_awarded: REVIEW_POINTS,
        new_balance: newBalance
      }
    });

  } catch (error) {
    console.error('❌ [Coupon Review] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVER_ERROR',
      message: '후기 작성 중 오류가 발생했습니다'
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
