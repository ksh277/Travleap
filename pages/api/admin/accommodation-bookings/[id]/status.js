/**
 * 숙박 예약 상태 변경 API
 * PUT /api/admin/accommodation-bookings/[id]/status
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
  const { status } = req.body;

  if (!id) {
    return res.status(400).json({ success: false, error: 'Booking ID is required' });
  }

  if (!status) {
    return res.status(400).json({ success: false, error: 'Status is required' });
  }

  // 유효한 상태 값 확인
  const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 예약 상태 업데이트
    const result = await connection.execute(
      'UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    console.log('Booking status update result:', result);

    return res.status(200).json({
      success: true,
      message: '예약 상태가 변경되었습니다.',
      data: { id, status }
    });

  } catch (error) {
    console.error('Booking status update error:', error);
    return res.status(500).json({
      success: false,
      error: '예약 상태 변경 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};
