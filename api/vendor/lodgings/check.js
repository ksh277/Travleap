const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ success: false, message: 'GET 메서드만 지원합니다.' });

  try {
    const { partner_id, name } = req.query;
    
    if (!name) {
      return res.status(400).json({ success: false, message: '숙소명이 필요합니다.' });
    }

    const connection = connect({ url: process.env.DATABASE_URL });
    
    let query = 'SELECT id, partner_id, title, location FROM listings WHERE title = ?';
    let params = [name];
    
    if (partner_id) {
      query += ' AND partner_id = ?';
      params.push(partner_id);
    }
    
    query += ' LIMIT 1';
    
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
