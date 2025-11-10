const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // JWT 인증 확인
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

  // 벤더 또는 관리자 권한 확인
  if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
    return res.status(403).json({ success: false, message: '벤더 권한이 필요합니다.' });
  }

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    // JWT에서 partner_id 조회
    let partnerId;
    if (decoded.role === 'admin') {
      partnerId = req.query.partner_id || req.body?.partner_id;
    } else {
      // 벤더는 JWT의 userId로 partners 테이블에서 partner_id 조회
      const partnerResult = await connection.execute(
        'SELECT id FROM partners WHERE user_id = ? AND status = "active" LIMIT 1',
        [decoded.userId]
      );

      if (!partnerResult.rows || partnerResult.rows.length === 0) {
        return res.status(403).json({ success: false, message: '등록된 파트너 정보가 없습니다.' });
      }

      partnerId = partnerResult.rows[0].id;
    }

    // GET: 객실 목록 조회 (본인 파트너의 객실만)
    if (req.method === 'GET') {
      const { listing_id } = req.query;

      let query = 'SELECT * FROM listings WHERE partner_id = ?';
      let params = [partnerId];

      if (listing_id) {
        query += ' AND id = ?';
        params.push(listing_id);
      }

      const result = await connection.execute(query, params);
      return res.status(200).json({ success: true, data: result.rows || [] });
    }

    // POST: 객실 생성 (partner_id는 JWT에서 추출한 값 사용)
    if (req.method === 'POST') {
      const { category_id, title, description_md, location, address, price_from, images } = req.body;

      if (!title) {
        return res.status(400).json({ success: false, message: '제목은 필수 항목입니다.' });
      }

      const imagesJson = Array.isArray(images) ? JSON.stringify(images) : '[]';

      const result = await connection.execute(
        `INSERT INTO listings (partner_id, category_id, title, description_md, location, address, price_from, images, is_published, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())`,
        [partnerId, category_id || 1857, title, description_md || '', location || '', address || '', price_from || 0, imagesJson]
      );

      return res.status(201).json({ success: true, data: { id: result.insertId } });
    }

    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });
  } catch (error) {
    console.error('❌ [Rooms API] 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.', error: error.message });
  }
};
