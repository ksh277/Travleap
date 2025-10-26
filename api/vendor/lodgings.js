/**
 * 숙박 벤더 - 숙소 관리 API (래퍼)
 * /api/vendor/lodging/properties를 래핑
 */

const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
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

    // user_id로 숙박 벤더 ID 조회
    const userId = req.query.userId || req.headers['x-user-id'] || decoded.userId;

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

    console.log('🏨 [Lodgings API] 요청:', { method: req.method, vendorId, userId });

    if (req.method === 'GET') {
      // 벤더의 숙소 목록 조회
      const result = await connection.execute(
        `SELECT
          l.id,
          l.title as name,
          l.category as type,
          l.location as city,
          l.address,
          l.description,
          l.images,
          l.price_from,
          l.is_active,
          l.created_at
        FROM listings l
        WHERE l.partner_id = ? AND l.category = '숙박'
        ORDER BY l.created_at DESC`,
        [vendorId]
      );

      const lodgings = (result || []).map(row => {
        let images = [];
        try {
          images = row.images ? JSON.parse(row.images) : [];
        } catch (e) {
          console.warn('이미지 파싱 실패:', row.id);
        }

        return {
          id: row.id,
          vendor_id: vendorId,
          name: row.name,
          type: row.type,
          city: row.city,
          address: row.address,
          description: row.description,
          images,
          price_from: row.price_from,
          is_active: row.is_active === 1,
          created_at: row.created_at
        };
      });

      return res.status(200).json({
        success: true,
        data: lodgings
      });
    }

    if (req.method === 'POST') {
      // 새 숙소 추가
      const {
        name,
        type,
        city,
        address,
        description,
        images
      } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: '숙소명은 필수입니다.'
        });
      }

      const imagesJson = images && images.length > 0 ? JSON.stringify(images) : null;

      const result = await connection.execute(
        `INSERT INTO listings (
          partner_id,
          category,
          title,
          location,
          address,
          description,
          images,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, '숙박', ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [
          vendorId,
          name,
          city || '',
          address || '',
          description || '',
          imagesJson
        ]
      );

      console.log('✅ [Lodgings API] 숙소 추가 완료:', { vendorId, listingId: result.insertId });

      return res.status(201).json({
        success: true,
        message: '숙소가 추가되었습니다.',
        data: {
          id: result.insertId
        }
      });
    }

    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });

  } catch (error) {
    console.error('❌ [Lodgings API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};
