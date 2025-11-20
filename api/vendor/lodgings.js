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

    if (decoded.role !== 'vendor' && decoded.role !== 'admin' && decoded.role !== 'partner') {
      return res.status(403).json({ success: false, message: '벤더 권한이 필요합니다.' });
    }

    const connection = connect({ url: process.env.DATABASE_URL });

    // user_id로 숙박 벤더 ID 조회
    const userId = req.query.userId || req.headers['x-user-id'] || decoded.userId || decoded.id;

    console.log('🔍 [Lodgings API] JWT decoded:', { userId, role: decoded.role, decodedKeys: Object.keys(decoded) });

    const vendorResult = await connection.execute(
      `SELECT id FROM partners WHERE user_id = ? AND partner_type = 'lodging' LIMIT 1`,
      [userId]
    );

    if (!vendorResult.rows || vendorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '등록된 숙박 업체 정보가 없습니다.'
      });
    }

    const vendorId = vendorResult.rows[0].id;

    console.log('🏨 [Lodgings API] 요청:', { method: req.method, vendorId, userId });

    if (req.method === 'GET') {
      // 벤더의 파트너 정보 및 객실 수 조회
      const partnerResult = await connection.execute(
        `SELECT
          p.id,
          p.business_name as name,
          p.partner_type as type,
          p.address,
          p.phone,
          p.email,
          p.is_active,
          p.created_at
        FROM partners p
        WHERE p.id = ?
        LIMIT 1`,
        [vendorId]
      );

      if (!partnerResult.rows || partnerResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '파트너 정보를 찾을 수 없습니다.'
        });
      }

      const partner = partnerResult.rows[0];

      // 이 파트너의 숙박 카테고리 객실 수 카운트
      const roomCountResult = await connection.execute(
        `SELECT COUNT(*) as room_count
        FROM listings l
        WHERE l.partner_id = ? AND l.category = '숙박'`,
        [vendorId]
      );

      const roomCount = roomCountResult.rows?.[0]?.room_count || 0;

      // 숙소를 하나의 lodging으로 반환 (파트너 = 호텔)
      const lodgings = [{
        id: partner.id,
        vendor_id: vendorId,
        name: partner.name,
        type: partner.type || 'lodging',
        city: '',  // 객실 listings에서 가져올 수 있으면 좋음
        address: partner.address,
        phone: partner.phone,
        email: partner.email,
        is_active: partner.is_active === 1,
        room_count: roomCount,
        created_at: partner.created_at
      }];

      console.log('✅ [Lodgings API] 조회 완료:', { vendorId, lodgingCount: 1, roomCount });

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
