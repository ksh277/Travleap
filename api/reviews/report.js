const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });
    const { review_id, reporter_user_id, reason, description } = req.body;

    if (!review_id || !reporter_user_id || !reason) {
      return res.status(400).json({
        success: false,
        error: 'review_id, reporter_user_id, and reason are required'
      });
    }

    // 유효한 reason인지 확인
    const validReasons = ['spam', 'offensive', 'fake', 'inappropriate', 'other'];
    if (!validReasons.includes(reason)) {
      return res.status(400).json({
        success: false,
        error: `reason must be one of: ${validReasons.join(', ')}`
      });
    }

    // 리뷰가 존재하는지 확인
    const reviewCheck = await connection.execute(
      'SELECT id FROM reviews WHERE id = ?',
      [review_id]
    );

    if (!reviewCheck || reviewCheck.length === 0) {
      return res.status(404).json({
        success: false,
        error: '리뷰를 찾을 수 없습니다.'
      });
    }

    // 이미 신고했는지 확인
    const existingReport = await connection.execute(
      'SELECT id FROM review_reports WHERE review_id = ? AND reporter_user_id = ?',
      [review_id, reporter_user_id]
    );

    if (existingReport && existingReport.length > 0) {
      return res.status(400).json({
        success: false,
        error: '이미 이 리뷰를 신고하셨습니다.'
      });
    }

    // 신고 저장
    const result = await connection.execute(`
      INSERT INTO review_reports (review_id, reporter_user_id, reason, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'pending', NOW(), NOW())
    `, [review_id, reporter_user_id, reason, description || null]);

    return res.status(201).json({
      success: true,
      data: { id: result.insertId },
      message: '신고가 접수되었습니다. 검토 후 조치하겠습니다.'
    });
  } catch (error) {
    console.error('Error reporting review:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
