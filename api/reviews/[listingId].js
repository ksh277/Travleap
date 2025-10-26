const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { listingId } = req.query;

  if (!listingId) {
    return res.status(400).json({ success: false, error: 'listingId is required' });
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    if (req.method === 'GET') {
      // 리뷰 조회
      const { page = '1', limit = '10', sortBy = 'recent' } = req.query;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      let orderBy = 'r.created_at DESC';
      if (sortBy === 'rating_high') orderBy = 'r.rating DESC, r.created_at DESC';
      if (sortBy === 'rating_low') orderBy = 'r.rating ASC, r.created_at DESC';
      if (sortBy === 'helpful') orderBy = 'r.helpful_count DESC, r.created_at DESC';

      const result = await connection.execute(
        `SELECT
          r.*,
          u.name as user_name,
          u.email as user_email
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.listing_id = ? AND (r.is_hidden IS NULL OR r.is_hidden = FALSE)
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?`,
        [listingId, limitNum, offset]
      );

      // 총 리뷰 수 및 평균 평점 (숨겨진 리뷰 제외)
      const statsResult = await connection.execute(`
        SELECT
          COUNT(*) as total_count,
          AVG(rating) as average_rating,
          SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as rating_5_count,
          SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as rating_4_count,
          SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as rating_3_count,
          SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as rating_2_count,
          SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as rating_1_count
        FROM reviews
        WHERE listing_id = ? AND (is_hidden IS NULL OR is_hidden = FALSE)
      `, [listingId]);

      const reviews = result || [];

      const stats = statsResult.rows?.[0] || {
        total_count: 0,
        average_rating: 0,
        rating_5_count: 0,
        rating_4_count: 0,
        rating_3_count: 0,
        rating_2_count: 0,
        rating_1_count: 0
      };

      return res.status(200).json({
        success: true,
        data: reviews,
        stats: {
          total: parseInt(stats.total_count) || 0,
          average: parseFloat(stats.average_rating) || 0,
          distribution: {
            5: parseInt(stats.rating_5_count) || 0,
            4: parseInt(stats.rating_4_count) || 0,
            3: parseInt(stats.rating_3_count) || 0,
            2: parseInt(stats.rating_2_count) || 0,
            1: parseInt(stats.rating_1_count) || 0
          }
        },
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: parseInt(stats.total_count) || 0
        }
      });
    }

    if (req.method === 'POST') {
      // 리뷰 작성
      const { user_id, rating, title, content, images, booking_id } = req.body;

      if (!user_id || !rating || !content) {
        return res.status(400).json({
          success: false,
          error: 'user_id, rating, and content are required'
        });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: 'Rating must be between 1 and 5'
        });
      }

      // ✅ 1. 중복 리뷰 방지 (같은 사용자가 같은 상품에 이미 리뷰를 작성했는지)
      const existingReview = await connection.execute(
        'SELECT id FROM reviews WHERE listing_id = ? AND user_id = ?',
        [listingId, user_id]
      );

      if (existingReview && existingReview.length > 0) {
        return res.status(400).json({
          success: false,
          error: '이미 이 상품에 대한 리뷰를 작성하셨습니다. 기존 리뷰를 수정해주세요.'
        });
      }

      // ✅ 2. 예약 검증 (booking_id가 있으면 실제 예약했는지 확인)
      if (booking_id) {
        const bookingCheck = await connection.execute(
          'SELECT id, user_id FROM bookings WHERE id = ? AND listing_id = ?',
          [booking_id, listingId]
        );

        if (!bookingCheck || bookingCheck.length === 0) {
          return res.status(400).json({
            success: false,
            error: '유효하지 않은 예약입니다.'
          });
        }

        if (bookingCheck[0].user_id != user_id) {
          return res.status(403).json({
            success: false,
            error: '본인의 예약에만 리뷰를 작성할 수 있습니다.'
          });
        }
      }

      // ✅ 3. 이미지 JSON 변환
      const imagesJson = images && images.length > 0 ? JSON.stringify(images) : null;

      const result = await connection.execute(`
        INSERT INTO reviews (listing_id, user_id, rating, title, comment_md, review_images, booking_id, review_type, is_verified, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'listing', TRUE, NOW(), NOW())
      `, [listingId, user_id, rating, title || '', content, imagesJson, booking_id || null]);

      // 리스팅의 평균 평점 업데이트 (숨겨진 리뷰 제외)
      await connection.execute(`
        UPDATE listings
        SET
          rating_avg = (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE listing_id = ? AND (is_hidden IS NULL OR is_hidden = FALSE)),
          rating_count = (SELECT COUNT(*) FROM reviews WHERE listing_id = ? AND (is_hidden IS NULL OR is_hidden = FALSE))
        WHERE id = ?
      `, [listingId, listingId, listingId]);

      return res.status(201).json({
        success: true,
        data: { id: result.insertId },
        message: '리뷰가 성공적으로 등록되었습니다'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling reviews:', error);
    console.error('Error stack:', error.stack);
    console.error('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack?.substring(0, 200)
    });
  }
};
