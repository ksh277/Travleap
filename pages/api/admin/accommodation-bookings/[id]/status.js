/**
 * 숙박 예약 상태 업데이트 API
 * PUT /api/admin/accommodation-bookings/[id]/status - 예약 상태 변경
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
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      error: '상태 값이 필요합니다.'
    });
  }

  // 유효한 상태 값 검증
  const validStatuses = ['pending', 'confirmed', 'cancelled', 'completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      error: `유효하지 않은 상태값입니다. (${validStatuses.join(', ')})`
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log(`📥 [PUT] 예약 상태 변경 요청 (id: ${id}, status: ${status})`);

    // 예약 존재 확인
    const bookingCheck = await connection.execute(
      'SELECT id FROM bookings WHERE id = ?',
      [id]
    );

    if (!bookingCheck.rows || bookingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '예약을 찾을 수 없습니다.'
      });
    }

    // 상태 업데이트
    await connection.execute(
      'UPDATE bookings SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    console.log('✅ 예약 상태 변경 완료:', { id, newStatus: status });

    return res.status(200).json({
      success: true,
      message: '예약 상태가 변경되었습니다.',
      data: { status }
    });

  } catch (error) {
    console.error('Booking status update error:', error);
    return res.status(500).json({
      success: false,
      error: '상태 변경 중 오류가 발생했습니다.',
      message: error.message
    });
  }
};
