const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { listingId } = req.query;

  if (!listingId || isNaN(Number(listingId))) {
    return res.status(400).json({ success: false, error: 'Invalid listing ID' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  // GET: 특정 listing의 리뷰 가져오기
  if (req.method === 'GET') {
    try {
      const result = await connection.execute(`
        SELECT
          r.*,
          u.name as user_name,
          u.email as user_email
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.listing_id = ?
        ORDER BY r.created_at DESC
      `, [Number(listingId)]);

      return res.status(200).json({
        success: true,
        data: result.rows || []
      });
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  // POST: 리뷰 작성
  if (req.method === 'POST') {
    try {
      const { user_id, rating, title, content, images } = req.body;

      // 필수 필드 검증
      if (!user_id || !rating || !content) {
        return res.status(400).json({
          success: false,
          error: '필수 정보가 누락되었습니다.'
        });
      }

      // rating 유효성 검증
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: '별점은 1~5 사이여야 합니다.'
        });
      }

      // 리뷰 삽입
      const insertResult = await connection.execute(`
        INSERT INTO reviews (
          listing_id,
          user_id,
          rating,
          title,
          comment_md,
          review_images,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
      `, [
        Number(listingId),
        Number(user_id),
        Number(rating),
        title || '',
        content,
        JSON.stringify(images || [])
      ]);

      // 방금 생성된 리뷰 가져오기
      const newReviewResult = await connection.execute(`
        SELECT
          r.*,
          u.name as user_name,
          u.email as user_email
        FROM reviews r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.id = ?
      `, [insertResult.insertId]);

      const newReview = newReviewResult.rows[0];

      // listing의 평균 rating 업데이트
      await connection.execute(`
        UPDATE listings
        SET
          rating_avg = (
            SELECT AVG(rating) FROM reviews WHERE listing_id = ?
          ),
          rating_count = (
            SELECT COUNT(*) FROM reviews WHERE listing_id = ?
          )
        WHERE id = ?
      `, [Number(listingId), Number(listingId), Number(listingId)]);

      return res.status(201).json({
        success: true,
        data: newReview,
        message: '리뷰가 작성되었습니다.'
      });
    } catch (error) {
      console.error('Error creating review:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
