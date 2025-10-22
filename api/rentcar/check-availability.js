const { connect } = require('@planetscale/database');

/**
 * 차량 예약 가능 여부 확인 API
 *
 * GET /api/rentcar/check-availability?vehicle_id=123&pickup_date=2025-01-15&dropoff_date=2025-01-18
 *
 * 응답:
 * {
 *   success: true,
 *   available: true,
 *   conflicting_bookings: 0
 * }
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const { vehicle_id, pickup_date, dropoff_date } = req.query;

    // 파라미터 검증
    if (!vehicle_id || !pickup_date || !dropoff_date) {
      return res.status(400).json({
        success: false,
        error: '차량 ID, 픽업일, 반납일이 모두 필요합니다.'
      });
    }

    // 날짜 유효성 검증
    const pickupDateObj = new Date(pickup_date);
    const dropoffDateObj = new Date(dropoff_date);

    if (dropoffDateObj <= pickupDateObj) {
      return res.status(400).json({
        success: false,
        error: '반납일은 픽업일보다 이후여야 합니다.'
      });
    }

    // 1. 차량이 활성화되어 있는지 확인
    const vehicleCheck = await connection.execute(
      'SELECT id, is_active FROM rentcar_vehicles WHERE id = ?',
      [vehicle_id]
    );

    if (!vehicleCheck.rows || vehicleCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '차량을 찾을 수 없습니다.'
      });
    }

    if (!vehicleCheck.rows[0].is_active) {
      return res.status(200).json({
        success: true,
        available: false,
        reason: '차량이 현재 예약 불가 상태입니다.'
      });
    }

    // 2. 날짜 겹침 확인
    // 겹치는 조건:
    // - 기존 예약의 pickup_date가 새로운 dropoff_date보다 이전이고
    // - 기존 예약의 dropoff_date가 새로운 pickup_date보다 이후인 경우
    // - 상태가 'cancelled'가 아닌 예약만 체크
    const conflictCheck = await connection.execute(
      `SELECT COUNT(*) as count
       FROM rentcar_bookings
       WHERE vehicle_id = ?
         AND pickup_date < ?
         AND dropoff_date > ?
         AND status NOT IN ('cancelled', 'failed')`,
      [vehicle_id, dropoff_date, pickup_date]
    );

    const conflictCount = conflictCheck.rows?.[0]?.count || 0;

    if (conflictCount > 0) {
      return res.status(200).json({
        success: true,
        available: false,
        reason: '선택하신 날짜에 이미 예약이 있습니다.',
        conflicting_bookings: conflictCount
      });
    }

    // 3. 예약 가능
    return res.status(200).json({
      success: true,
      available: true,
      message: '예약 가능한 날짜입니다.',
      conflicting_bookings: 0
    });

  } catch (error) {
    console.error('❌ [Check Availability] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
