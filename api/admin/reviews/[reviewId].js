/**
 * 관리자 리뷰 삭제 API
 * DELETE /api/admin/reviews/[reviewId] - 관리자가 모든 리뷰 삭제 가능
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
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

    // DELETE - 관리자 리뷰 삭제 (권한 체크 없이 삭제 가능)
    if (req.method === 'DELETE') {
      console.log(`🗑️  [Admin] Deleting review ${reviewId}`);

      // 리뷰 정보 조회 (listing_id 가져오기)
      const reviewResult = await connection.execute(
        'SELECT listing_id FROM reviews WHERE id = ?',
        [reviewId]
      );

      if (!reviewResult || reviewResult.length === 0) {
        return res.status(404).json({
          success: false,
          error: '리뷰를 찾을 수 없습니다'
        });
      }

      const review = reviewResult[0];
      const listingId = review.listing_id;

      // 리뷰 삭제
      await connection.execute('DELETE FROM reviews WHERE id = ?', [reviewId]);
      console.log(`  ✅ Review ${reviewId} deleted`);

      // 리스팅의 평균 평점 업데이트 (숨겨진 리뷰 제외)
      await connection.execute(`
        UPDATE listings
        SET
          rating_avg = COALESCE((SELECT AVG(rating) FROM reviews WHERE listing_id = ? AND (is_hidden IS NULL OR is_hidden = FALSE)), 0),
          rating_count = (SELECT COUNT(*) FROM reviews WHERE listing_id = ? AND (is_hidden IS NULL OR is_hidden = FALSE))
        WHERE id = ?
      `, [listingId, listingId, listingId]);
      console.log(`  ✅ Updated listing ${listingId} rating`);

      return res.status(200).json({
        success: true,
        message: '리뷰가 삭제되었습니다'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling admin review deletion:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
