const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    // GET: 객실 목록 조회
    if (req.method === 'GET') {
      const { listing_id } = req.query;
      
      let query = 'SELECT * FROM listings WHERE 1=1';
      let params = [];
      
      if (listing_id) {
        query += ' AND id = ?';
        params.push(listing_id);
      }
      
      const result = await connection.execute(query, params);
      return res.status(200).json({ success: true, data: result.rows || [] });
    }

    // POST: 객실 생성
    if (req.method === 'POST') {
      const { partner_id, category_id, title, description_md, location, address, price_from, images } = req.body;
      
      if (!partner_id || !title) {
        return res.status(400).json({ success: false, message: '필수 항목이 누락되었습니다.' });
      }

      const imagesJson = Array.isArray(images) ? JSON.stringify(images) : '[]';

      const result = await connection.execute(
        `INSERT INTO listings (partner_id, category_id, title, description_md, location, address, price_from, images, is_published, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())`,
        [partner_id, category_id || 1857, title, description_md || '', location || '', address || '', price_from || 0, imagesJson]
      );

      return res.status(201).json({ success: true, data: { id: result.insertId } });
    }

    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });
  } catch (error) {
    console.error('❌ [Rooms API] 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.', error: error.message });
  }
};
