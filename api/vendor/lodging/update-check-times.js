const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 숙박 상품의 체크인/체크아웃 시간 설정 API
 * PUT /api/vendor/lodging/update-check-times
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // JWT 토큰 검증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: '인증이 필요합니다.' });
    }

    const token = authHeader.substring(7);
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (err) {
      return res.status(401).json({ success: false, error: '유효하지 않은 토큰입니다.' });
    }

    const userId = decoded.userId || decoded.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: '사용자 정보를 찾을 수 없습니다.' });
    }

    const {
      listing_id,
      default_check_in_time,
      default_check_out_time
    } = req.body;

    if (!listing_id) {
      return res.status(400).json({
        success: false,
        error: '상품 ID가 필요합니다.'
      });
    }

    // 시간 형식 검증 (HH:MM 또는 HH:MM:SS)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    if (default_check_in_time && !timeRegex.test(default_check_in_time)) {
      return res.status(400).json({
        success: false,
        error: '체크인 시간 형식이 올바르지 않습니다. (예: 16:00 또는 16:00:00)'
      });
    }

    if (default_check_out_time && !timeRegex.test(default_check_out_time)) {
      return res.status(400).json({
        success: false,
        error: '체크아웃 시간 형식이 올바르지 않습니다. (예: 12:00 또는 12:00:00)'
      });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // 사용자의 vendor_id 조회
    const vendorResult = await connection.execute(
      `SELECT p.id as partner_id
       FROM partners p
       WHERE p.user_id = ? AND p.partner_type = 'lodging' AND p.is_active = 1
       LIMIT 1`,
      [userId]
    );

    if (!vendorResult.rows || vendorResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: '숙박 업체 정보를 찾을 수 없습니다.'
      });
    }

    const partnerId = vendorResult.rows[0].partner_id;

    // 상품 확인 및 권한 검증
    const listingResult = await connection.execute(
      `SELECT id, title, partner_id, default_check_in_time, default_check_out_time
       FROM listings
       WHERE id = ? AND category_id = 1857
       LIMIT 1`,
      [listing_id]
    );

    if (!listingResult.rows || listingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '상품을 찾을 수 없습니다.'
      });
    }

    const listing = listingResult.rows[0];

    if (listing.partner_id !== partnerId) {
      return res.status(403).json({
        success: false,
        error: '이 상품을 수정할 권한이 없습니다.'
      });
    }

    // 시간 업데이트
    const updates = [];
    const values = [];

    if (default_check_in_time) {
      updates.push('default_check_in_time = ?');
      values.push(default_check_in_time);
    }

    if (default_check_out_time) {
      updates.push('default_check_out_time = ?');
      values.push(default_check_out_time);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: '업데이트할 시간 정보가 없습니다.'
      });
    }

    updates.push('updated_at = NOW()');
    values.push(listing_id);

    await connection.execute(
      `UPDATE listings
       SET ${updates.join(', ')}
       WHERE id = ?`,
      values
    );

    // 업데이트된 정보 조회
    const updatedResult = await connection.execute(
      `SELECT id, title, default_check_in_time, default_check_out_time
       FROM listings
       WHERE id = ?`,
      [listing_id]
    );

    return res.status(200).json({
      success: true,
      message: '체크인/체크아웃 시간이 업데이트되었습니다.',
      data: updatedResult.rows[0]
    });

  } catch (error) {
    console.error('❌ [체크인/체크아웃 시간 업데이트 오류]:', error);
    return res.status(500).json({
      success: false,
      error: '업데이트 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};
