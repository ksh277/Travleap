/**
 * 파트너(가맹점) 리뷰 조회 API
 * GET /api/partners/[id]/reviews - 특정 파트너의 리뷰 목록 조회
 * POST /api/partners/[id]/reviews - 리뷰 작성 (일반 리뷰, 쿠폰 리뷰 아님)
 *
 * coupon_reviews 테이블과 partner_reviews 테이블을 UNION하여 조회
 */

const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, error: 'Partner ID is required' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });
  const poolNeon = new Pool({
    connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
  });

  try {
    if (req.method === 'GET') {
      // 리뷰 조회: coupon_reviews 테이블에서 해당 파트너 리뷰 가져오기
      const couponReviewsResult = await connection.execute(`
        SELECT
          cr.id,
          cr.user_id,
          cr.rating,
          cr.comment,
          cr.review_text,
          cr.created_at as date,
          cr.points_awarded,
          'coupon' as review_type
        FROM coupon_reviews cr
        WHERE cr.partner_id = ?
        ORDER BY cr.created_at DESC
        LIMIT 50
      `, [id]);

      const couponReviews = couponReviewsResult.rows || [];

      // Neon에서 유저 이름 가져오기
      const userIds = [...new Set(couponReviews.map(r => r.user_id))];
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
          console.warn('Neon user query failed, using defaults:', e.message);
        }
      }

      // 리뷰 데이터 포맷팅
      const formattedReviews = couponReviews.map(review => ({
        id: review.id.toString(),
        user_id: review.user_id,
        author: userNames[review.user_id] || '익명',
        rating: review.rating || 5,
        comment: review.comment || review.review_text || '',
        date: review.date,
        helpful: 0,
        verified: review.review_type === 'coupon', // 쿠폰 사용 리뷰는 인증됨
        review_type: review.review_type
      }));

      console.log(`✅ Partner Reviews API: 파트너 ${id}의 리뷰 ${formattedReviews.length}개 조회`);

      return res.status(200).json({
        success: true,
        data: formattedReviews,
        count: formattedReviews.length
      });

    } else if (req.method === 'POST') {
      // 일반 리뷰 작성 (쿠폰 리뷰가 아닌 직접 작성)
      const { user_id, rating, comment } = req.body;

      if (!user_id || !rating) {
        return res.status(400).json({
          success: false,
          error: 'user_id and rating are required'
        });
      }

      // partner_reviews 테이블이 없을 수 있으므로 coupon_reviews에 저장
      // (쿠폰 없이 작성한 리뷰)
      await connection.execute(`
        INSERT INTO coupon_reviews (
          user_id, partner_id, rating, comment, review_text, points_awarded, created_at
        ) VALUES (?, ?, ?, ?, ?, 0, NOW())
      `, [user_id, id, rating, comment || '', comment || '']);

      console.log(`✅ Partner Reviews API: 파트너 ${id}에 새 리뷰 작성 (user: ${user_id})`);

      return res.status(201).json({
        success: true,
        message: '리뷰가 등록되었습니다'
      });

    } else {
      return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('❌ Partner Reviews API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: '리뷰 처리 중 오류가 발생했습니다'
    });
  } finally {
    try {
      await poolNeon.end();
    } catch (e) {
      // ignore
    }
  }
};
