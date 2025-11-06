/**
 * 객실 활성화/비활성화 API
 * PUT /api/admin/rooms/[id]/toggle-active - 객실 상태 토글
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
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const { id } = req.query;
  const { is_active } = req.body;

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log(`📥 [PUT] 객실 활성화 토글 요청 (id: ${id}, is_active: ${is_active})`);

    // 객실 존재 확인
    const roomCheck = await connection.execute(
      'SELECT id, title FROM listings WHERE id = ? AND category = "stay"',
      [id]
    );

    if (!roomCheck.rows || roomCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '객실을 찾을 수 없습니다.'
      });
    }

    // 상태 업데이트
    const isActive = is_active ? 1 : 0;
    await connection.execute(
      'UPDATE listings SET is_active = ?, updated_at = NOW() WHERE id = ? AND category = "stay"',
      [isActive, id]
    );

    console.log('✅ 객실 상태 변경 완료:', {
      id,
      roomName: roomCheck.rows[0].title,
      is_active: isActive
    });

    return res.status(200).json({
      success: true,
      message: isActive ? '객실이 활성화되었습니다.' : '객실이 비활성화되었습니다.',
      data: { is_active: isActive }
    });

  } catch (error) {
    console.error('Room toggle active error:', error);
    return res.status(500).json({
      success: false,
      error: '상태 변경 중 오류가 발생했습니다.',
      message: error.message
    });
  }
};
