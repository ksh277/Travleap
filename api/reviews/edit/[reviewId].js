/**
 * 리뷰 수정/삭제 API
 * PUT /api/reviews/[reviewId] - 리뷰 수정 (본인만 가능)
 * DELETE /api/reviews/[reviewId] - 리뷰 삭제 (본인만 가능)
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { reviewId } = req.query;

  if (!reviewId) {
    return res.status(400).json({ success: false, error: 'reviewId is required' });
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    // PUT - 리뷰 수정
    if (req.method === 'PUT') {
      const { user_id, rating, title, comment_md } = req.body;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id is required'
        });
      }

      // 리뷰 소유자 확인
      const reviewResult = await connection.execute(
        'SELECT user_id, listing_id FROM reviews WHERE id = ?',
        [reviewId]
      );

      if (!reviewResult.rows || reviewResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '리뷰를 찾을 수 없습니다'
        });
      }

      const review = reviewResult.rows[0];
      if (review.user_id != user_id) {
        return res.status(403).json({
          success: false,
          error: '본인의 리뷰만 수정할 수 있습니다'
        });
      }

      // 리뷰 업데이트
      await connection.execute(
        `UPDATE reviews
         SET rating = COALESCE(?, rating),
             title = COALESCE(?, title),
             comment_md = COALESCE(?, comment_md),
             updated_at = NOW()
         WHERE id = ?`,
        [rating, title, comment_md, reviewId]
      );

      // 리스팅의 평균 평점 업데이트
      await connection.execute(`
        UPDATE listings
        SET
          rating_avg = (SELECT AVG(rating) FROM reviews WHERE listing_id = ?),
          rating_count = (SELECT COUNT(*) FROM reviews WHERE listing_id = ?)
        WHERE id = ?
      `, [review.listing_id, review.listing_id, review.listing_id]);

      return res.status(200).json({
        success: true,
        message: '리뷰가 수정되었습니다'
      });
    }

    // DELETE - 리뷰 삭제
    if (req.method === 'DELETE') {
      const { user_id } = req.query;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id is required'
        });
      }

      // 리뷰 소유자 확인
      const reviewResult = await connection.execute(
        'SELECT user_id, listing_id FROM reviews WHERE id = ?',
        [reviewId]
      );

      if (!reviewResult.rows || reviewResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '리뷰를 찾을 수 없습니다'
        });
      }

      const review = reviewResult.rows[0];
      if (review.user_id != user_id) {
        return res.status(403).json({
          success: false,
          error: '본인의 리뷰만 삭제할 수 있습니다'
        });
      }

      // 리뷰 삭제
      await connection.execute('DELETE FROM reviews WHERE id = ?', [reviewId]);

      // 리스팅의 평균 평점 업데이트
      await connection.execute(`
        UPDATE listings
        SET
          rating_avg = COALESCE((SELECT AVG(rating) FROM reviews WHERE listing_id = ?), 0),
          rating_count = (SELECT COUNT(*) FROM reviews WHERE listing_id = ?)
        WHERE id = ?
      `, [review.listing_id, review.listing_id, review.listing_id]);

      return res.status(200).json({
        success: true,
        message: '리뷰가 삭제되었습니다'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling review:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
