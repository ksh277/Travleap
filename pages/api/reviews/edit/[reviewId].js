const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { reviewId } = req.query;
  const { user_id } = req.query;

  if (!reviewId || isNaN(Number(reviewId))) {
    return res.status(400).json({ success: false, error: 'Invalid review ID' });
  }

  if (!user_id || isNaN(Number(user_id))) {
    return res.status(400).json({ success: false, error: 'User ID required' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 리뷰 존재 여부 및 소유권 확인
    const checkResult = await connection.execute(`
      SELECT id, user_id, listing_id FROM reviews WHERE id = ?
    `, [Number(reviewId)]);

    if (!checkResult.rows || checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '리뷰를 찾을 수 없습니다.'
      });
    }

    const review = checkResult.rows[0];

    // 본인 리뷰만 삭제 가능
    if (Number(review.user_id) !== Number(user_id)) {
      return res.status(403).json({
        success: false,
        error: '본인의 리뷰만 삭제할 수 있습니다.'
      });
    }

    const listingId = review.listing_id;

    // 리뷰 삭제
    await connection.execute(`
      DELETE FROM reviews WHERE id = ?
    `, [Number(reviewId)]);

    // listing의 평균 rating 업데이트
    await connection.execute(`
      UPDATE listings
      SET
        rating_avg = COALESCE((
          SELECT AVG(rating) FROM reviews WHERE listing_id = ?
        ), 0),
        rating_count = (
          SELECT COUNT(*) FROM reviews WHERE listing_id = ?
        )
      WHERE id = ?
    `, [listingId, listingId, listingId]);

    return res.status(200).json({
      success: true,
      message: '리뷰가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
