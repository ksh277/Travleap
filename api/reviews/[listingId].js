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

      const result = await connection.execute(`
        SELECT
          r.*,
          u.name as user_name,
          u.profile_image as user_profile_image
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.listing_id = ?
        ORDER BY ${orderBy}
        LIMIT ${limitNum} OFFSET ${offset}
      `, [listingId]);

      // 총 리뷰 수 및 평균 평점
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
        WHERE listing_id = ?
      `, [listingId]);

      const reviews = (result.rows || []).map(review => {
        let images = [];
        try {
          if (review.images) images = JSON.parse(review.images);
        } catch (e) {}

        return {
          ...review,
          images: Array.isArray(images) ? images : []
        };
      });

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
      const { user_id, rating, title, content, images } = req.body;

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

      const result = await connection.execute(`
        INSERT INTO reviews (listing_id, user_id, rating, title, content, images)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [listingId, user_id, rating, title || '', content, JSON.stringify(images || [])]);

      // 리스팅의 평균 평점 업데이트
      await connection.execute(`
        UPDATE listings
        SET
          rating_avg = (SELECT AVG(rating) FROM reviews WHERE listing_id = ?),
          rating_count = (SELECT COUNT(*) FROM reviews WHERE listing_id = ?)
        WHERE id = ?
      `, [listingId, listingId, listingId]);

      return res.status(201).json({
        success: true,
        data: { id: result.insertId }
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling reviews:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
