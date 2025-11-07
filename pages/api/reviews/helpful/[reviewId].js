import { query } from '../../../../lib/db';
import { withAuth } from '../../../../lib/auth';

/**
 * Review Helpful API
 * POST: Mark a review as helpful
 */
async function handler(req, res) {
  const { reviewId } = req.query;
  const { user_id } = req.body;

  if (!reviewId || !user_id) {
    return res.status(400).json({
      success: false,
      message: '리뷰 ID와 사용자 ID가 필요합니다.',
    });
  }

  try {
    // Check if user already marked this review as helpful
    const existingHelpful = await query(
      'SELECT id FROM review_helpful WHERE review_id = ? AND user_id = ?',
      [reviewId, user_id]
    );

    if (existingHelpful && existingHelpful.length > 0) {
      // Already marked - remove it (toggle)
      await query(
        'DELETE FROM review_helpful WHERE review_id = ? AND user_id = ?',
        [reviewId, user_id]
      );

      // Decrement helpful count
      await query(
        'UPDATE partner_reviews SET helpful_count = helpful_count - 1 WHERE id = ?',
        [reviewId]
      );

      return res.status(200).json({
        success: true,
        message: '좋아요가 취소되었습니다.',
        action: 'removed',
      });

    } else {
      // Not marked yet - add it
      await query(
        'INSERT INTO review_helpful (review_id, user_id, created_at) VALUES (?, ?, NOW())',
        [reviewId, user_id]
      );

      // Increment helpful count
      await query(
        'UPDATE partner_reviews SET helpful_count = helpful_count + 1 WHERE id = ?',
        [reviewId]
      );

      return res.status(200).json({
        success: true,
        message: '좋아요가 반영되었습니다.',
        action: 'added',
      });
    }

  } catch (error) {
    console.error('Review helpful API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message,
    });
  }
}

// Export with auth wrapper - requires authentication
export default withAuth(handler, { requireAuth: true });
