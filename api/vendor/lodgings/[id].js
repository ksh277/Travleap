/**
 * 숙박 벤더 - 개별 숙소 관리 API
 * PUT /api/vendor/lodgings/:id - 숙소 수정
 * DELETE /api/vendor/lodgings/:id - 숙소 삭제
 */

const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // JWT 토큰 검증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    } catch (error) {
      return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
    }

    if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: '벤더 권한이 필요합니다.' });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // URL에서 숙소 ID 추출
    const lodgingId = req.url.split('/').pop();

    if (!lodgingId || isNaN(lodgingId)) {
      return res.status(400).json({ success: false, message: '유효하지 않은 숙소 ID입니다.' });
    }

    // user_id로 숙박 벤더 ID 조회
    const userId = req.body?.userId || req.headers['x-user-id'] || decoded.userId;

    const vendorResult = await connection.execute(
      `SELECT id FROM partners WHERE user_id = ? AND partner_type = 'lodging' LIMIT 1`,
      [userId]
    );

    if (!vendorResult || vendorResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: '등록된 숙박 업체 정보가 없습니다.'
      });
    }

    const vendorId = vendorResult[0].id;

    // 숙소 소유권 확인
    const ownershipCheck = await connection.execute(
      `SELECT id FROM listings WHERE id = ? AND partner_id = ? AND category = '숙박' LIMIT 1`,
      [lodgingId, vendorId]
    );

    if (!ownershipCheck.rows || ownershipCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: '해당 숙소에 대한 권한이 없습니다.'
      });
    }

    console.log('🏨 [Lodgings Detail API] 요청:', { method: req.method, lodgingId, vendorId });

    if (req.method === 'PUT') {
      // 숙소 정보 수정
      const {
        name,
        type,
        city,
        address,
        description,
        is_active,
        images
      } = req.body;

      const imagesJson = images ? JSON.stringify(images) : null;

      await connection.execute(
        `UPDATE listings
        SET
          title = ?,
          location = ?,
          address = ?,
          description = ?,
          is_active = ?,
          images = ?,
          updated_at = NOW()
        WHERE id = ?`,
        [
          name,
          city || '',
          address || '',
          description || '',
          is_active ? 1 : 0,
          imagesJson,
          lodgingId
        ]
      );

      console.log('✅ [Lodgings Detail API] 숙소 수정 완료:', { lodgingId });

      return res.status(200).json({
        success: true,
        message: '숙소 정보가 수정되었습니다.'
      });
    }

    if (req.method === 'DELETE') {
      // 숙소 삭제 (실제로는 is_active = 0으로 비활성화)
      await connection.execute(
        `UPDATE listings SET is_active = 0, updated_at = NOW() WHERE id = ?`,
        [lodgingId]
      );

      console.log('✅ [Lodgings Detail API] 숙소 삭제 완료:', { lodgingId });

      return res.status(200).json({
        success: true,
        message: '숙소가 삭제되었습니다.'
      });
    }

    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });

  } catch (error) {
    console.error('❌ [Lodgings Detail API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};
