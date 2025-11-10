const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'GET 메서드만 지원합니다.' });

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
      partnerId = req.query.partner_id;
    } else {
      const partnerResult = await connection.execute(
        'SELECT id FROM partners WHERE user_id = ? AND status = "active" LIMIT 1',
        [decoded.userId]
      );

      if (!partnerResult.rows || partnerResult.rows.length === 0) {
        return res.status(403).json({ success: false, message: '등록된 파트너 정보가 없습니다.' });
      }

      partnerId = partnerResult.rows[0].id;
    }

    const { name } = req.query;
    
    if (!name) {
      return res.status(400).json({ success: false, message: '숙소명이 필요합니다.' });
    }

    // 본인 파트너의 숙소만 조회
    let query = 'SELECT id, partner_id, title, location FROM listings WHERE title = ? AND partner_id = ? LIMIT 1';
    let params = [name, partnerId];
    
    const result = await connection.execute(query, params);
    
    if (result.rows && result.rows.length > 0) {
      return res.status(200).json({ success: true, exists: true, data: result.rows[0] });
    } else {
      return res.status(200).json({ success: true, exists: false });
    }
  } catch (error) {
    console.error('❌ [Lodging Check API] 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.', error: error.message });
  }
};
