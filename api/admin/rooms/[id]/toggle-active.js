/**
 * 객실 활성/비활성 토글 API
 * PUT /api/admin/rooms/[id]/toggle-active
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { is_active } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, error: 'Room ID is required' });
  }

  if (is_active === undefined) {
    return res.status(400).json({ success: false, error: 'is_active is required' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 객실 활성 상태 업데이트 (listings 테이블)
    const result = await connection.execute(
      'UPDATE listings SET is_active = ?, updated_at = NOW() WHERE id = ?',
      [is_active ? 1 : 0, id]
    );

    console.log('Room active toggle result:', result);

    // accommodation_rooms 테이블도 있으면 업데이트
    try {
      await connection.execute(
        'UPDATE accommodation_rooms SET is_available = ?, updated_at = NOW() WHERE id = ?',
        [is_active ? 1 : 0, id]
      );
    } catch (e) {
      // accommodation_rooms 테이블이 없을 수 있으므로 에러 무시
      console.log('accommodation_rooms table not found or error:', e.message);
    }

    return res.status(200).json({
      success: true,
      message: is_active ? '객실이 활성화되었습니다.' : '객실이 비활성화되었습니다.',
      data: { id, is_active }
    });

  } catch (error) {
    console.error('Room toggle active error:', error);
    return res.status(500).json({
      success: false,
      error: '객실 상태 변경 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};
