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
    const { vehicle_id, pickup_date, pickup_time, dropoff_date, dropoff_time } = req.query;

    // 파라미터 검증
    if (!vehicle_id || !pickup_date || !dropoff_date) {
      return res.status(400).json({
        success: false,
        error: '차량 ID, 픽업일, 반납일이 모두 필요합니다.'
      });
    }

    // 시간 정보 포함한 날짜 객체 생성
    const [pickupHour, pickupMinute] = (pickup_time || '00:00').split(':').map(Number);
    const [dropoffHour, dropoffMinute] = (dropoff_time || '23:59').split(':').map(Number);

    const pickupDateObj = new Date(pickup_date);
    pickupDateObj.setHours(pickupHour, pickupMinute, 0, 0);

    const dropoffDateObj = new Date(dropoff_date);
    dropoffDateObj.setHours(dropoffHour, dropoffMinute, 0, 0);

    if (dropoffDateObj <= pickupDateObj) {
      return res.status(400).json({
        success: false,
        error: '반납 시간은 픽업 시간보다 이후여야 합니다.'
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

    // 2. 시간 기반 겹침 확인 (버퍼 타임 포함)
    const BUFFER_TIME_MINUTES = 60; // 차량 청소/점검을 위한 1시간 버퍼

    const conflictCheck = await connection.execute(
      `SELECT id, pickup_date, pickup_time, dropoff_date, dropoff_time
       FROM rentcar_bookings
       WHERE vehicle_id = ?
         AND status NOT IN ('cancelled', 'failed')`,
      [vehicle_id]
    );

    // 시간 범위 겹침 체크 (버퍼 타임 포함)
    const hasConflict = (conflictCheck.rows || []).some(booking => {
      const [existingPickupHour, existingPickupMinute] = (booking.pickup_time || '00:00').split(':').map(Number);
      const [existingDropoffHour, existingDropoffMinute] = (booking.dropoff_time || '23:59').split(':').map(Number);

      const existingPickup = new Date(booking.pickup_date);
      existingPickup.setHours(existingPickupHour, existingPickupMinute, 0, 0);

      let existingDropoff = new Date(booking.dropoff_date);
      existingDropoff.setHours(existingDropoffHour, existingDropoffMinute, 0, 0);

      // 버퍼 타임 추가: 기존 예약 종료 시간에 1시간 더함
      existingDropoff = new Date(existingDropoff.getTime() + BUFFER_TIME_MINUTES * 60 * 1000);

      // 시간 범위 겹침 체크 (버퍼 타임 포함)
      return !(dropoffDateObj.getTime() <= existingPickup.getTime() ||
               pickupDateObj.getTime() >= existingDropoff.getTime());
    });

    if (hasConflict) {
      return res.status(200).json({
        success: true,
        available: false,
        reason: `선택하신 날짜/시간에 이미 예약이 있습니다.\n\n차량 청소 및 점검을 위해 반납 후 ${BUFFER_TIME_MINUTES}분의 버퍼 타임이 필요합니다.\n\n다른 시간을 선택해주세요.`,
        conflicting_bookings: (conflictCheck || []).length
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
