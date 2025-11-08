const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    // GET: 차량 차단 목록 조회
    if (req.method === 'GET') {
      const { vehicle_id } = req.query;
      
      let query = 'SELECT * FROM rentcar_vehicle_blocks WHERE 1=1';
      let params = [];
      
      if (vehicle_id) {
        query += ' AND vehicle_id = ?';
        params.push(vehicle_id);
      }
      
      query += ' ORDER BY starts_at DESC';
      
      const result = await connection.execute(query, params);
      return res.status(200).json({ success: true, data: result.rows || [] });
    }

    // POST: 차량 차단 추가
    if (req.method === 'POST') {
      const { vehicle_id, starts_at, ends_at, block_reason, note } = req.body;
      
      if (!vehicle_id || !starts_at || !ends_at) {
        return res.status(400).json({ success: false, message: '필수 항목이 누락되었습니다.' });
      }

      const result = await connection.execute(
        'INSERT INTO rentcar_vehicle_blocks (vehicle_id, starts_at, ends_at, block_reason, note, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
        [vehicle_id, starts_at, ends_at, block_reason || 'manual', note || '']
      );

      return res.status(201).json({ success: true, data: { id: result.insertId } });
    }

    // DELETE: 차량 차단 삭제
    if (req.method === 'DELETE') {
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ success: false, message: 'ID가 필요합니다.' });
      }

      await connection.execute('DELETE FROM rentcar_vehicle_blocks WHERE id = ?', [id]);
      return res.status(200).json({ success: true, message: '차량 차단이 삭제되었습니다.' });
    }

    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });
  } catch (error) {
    console.error('❌ [Vehicle Blocks API] 오류:', error);
    return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.', error: error.message });
  }
};
