const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
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

    if (req.method === 'POST') {
      // 도움됨 추가
      const { user_id } = req.body;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id is required'
        });
      }

      // 리뷰 존재 확인
      const reviewCheck = await connection.execute(
        'SELECT id FROM reviews WHERE id = ?',
        [reviewId]
      );

      if (!reviewCheck || reviewCheck.length === 0) {
        return res.status(404).json({
          success: false,
          error: '리뷰를 찾을 수 없습니다.'
        });
      }

      // 이미 도움됨을 눌렀는지 확인
      const existingHelpful = await connection.execute(
        'SELECT id FROM review_helpful WHERE review_id = ? AND user_id = ?',
        [reviewId, user_id]
      );

      if (existingHelpful && existingHelpful.length > 0) {
        return res.status(400).json({
          success: false,
          error: '이미 이 리뷰에 도움됨을 표시하셨습니다.'
        });
      }

      // 도움됨 추가
      await connection.execute(`
        INSERT INTO review_helpful (review_id, user_id, created_at)
        VALUES (?, ?, NOW())
      `, [reviewId, user_id]);

      // reviews 테이블의 helpful_count 업데이트
      await connection.execute(`
        UPDATE reviews
        SET helpful_count = (SELECT COUNT(*) FROM review_helpful WHERE review_id = ?)
        WHERE id = ?
      `, [reviewId, reviewId]);

      return res.status(201).json({
        success: true,
        message: '도움됨이 추가되었습니다.'
      });
    }

    if (req.method === 'DELETE') {
      // 도움됨 취소
      const { user_id } = req.query;

      if (!user_id) {
        return res.status(400).json({
          success: false,
          error: 'user_id is required'
        });
      }

      // 도움됨 삭제
      await connection.execute(
        'DELETE FROM review_helpful WHERE review_id = ? AND user_id = ?',
        [reviewId, user_id]
      );

      // reviews 테이블의 helpful_count 업데이트
      await connection.execute(`
        UPDATE reviews
        SET helpful_count = (SELECT COUNT(*) FROM review_helpful WHERE review_id = ?)
        WHERE id = ?
      `, [reviewId, reviewId]);

      return res.status(200).json({
        success: true,
        message: '도움됨이 취소되었습니다.'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Error handling helpful:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
