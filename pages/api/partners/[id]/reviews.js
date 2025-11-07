import { query } from '../../../../lib/db';
import { withAuth } from '../../../../lib/auth';

/**
 * Partner Reviews API
 * GET: Fetch all reviews for a partner
 * POST: Submit a new review for a partner
 */
async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, message: '가맹점 ID가 필요합니다.' });
  }

  try {
    if (req.method === 'GET') {
      // Fetch reviews for this partner
      const reviews = await query(
        `SELECT
          pr.id,
          pr.user_id,
          pr.rating,
          pr.comment,
          pr.created_at as date,
          pr.helpful_count as helpful,
          pr.verified,
          COALESCE(nu.name, '익명') as author
        FROM partner_reviews pr
        LEFT JOIN neon_users nu ON pr.user_id = nu.id
        WHERE pr.partner_id = ?
        ORDER BY pr.created_at DESC`,
        [id]
      );

      return res.status(200).json({
        success: true,
        data: reviews,
      });

    } else if (req.method === 'POST') {
      // Submit new review
      const { user_id, rating, comment } = req.body;

      if (!user_id || !rating || !comment) {
        return res.status(400).json({
          success: false,
          message: '모든 필드를 입력해주세요.',
        });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: '평점은 1~5 사이여야 합니다.',
        });
      }

      // Check if user has already reviewed this partner
      const existingReview = await query(
        'SELECT id FROM partner_reviews WHERE partner_id = ? AND user_id = ?',
        [id, user_id]
      );

      if (existingReview && existingReview.length > 0) {
        return res.status(400).json({
          success: false,
          message: '이미 리뷰를 작성하셨습니다.',
        });
      }

      // Insert new review
      await query(
        `INSERT INTO partner_reviews (
          partner_id,
          user_id,
          rating,
          comment,
          helpful_count,
          verified,
          created_at
        ) VALUES (?, ?, ?, ?, 0, false, NOW())`,
        [id, user_id, rating, comment]
      );

      // Update partner's average rating
      const ratingStats = await query(
        `SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
        FROM partner_reviews
        WHERE partner_id = ?`,
        [id]
      );

      if (ratingStats && ratingStats.length > 0) {
        await query(
          `UPDATE partners
          SET rating = ?, review_count = ?
          WHERE id = ?`,
          [ratingStats[0].avg_rating, ratingStats[0].review_count, id]
        );
      }

      return res.status(200).json({
        success: true,
        message: '리뷰가 등록되었습니다.',
      });

    } else {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed',
      });
    }

  } catch (error) {
    console.error('Partner reviews API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message,
    });
  }
}

// Export with auth wrapper - GET is public, POST requires auth
export default async function (req, res) {
  if (req.method === 'POST') {
    // POST requires authentication
    return withAuth(handler, { requireAuth: true })(req, res);
  } else {
    // GET is public
    return handler(req, res);
  }
}
