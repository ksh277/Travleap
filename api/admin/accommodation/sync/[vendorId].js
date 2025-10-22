/**
 * PMS API 동기화 엔드포인트
 * POST /api/admin/accommodation/sync/[vendorId]
 *
 * 숙박 업체의 PMS(Property Management System)와 연동하여
 * 객실 정보와 예약 정보를 자동으로 가져옵니다.
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { vendorId } = req.query;

  if (!vendorId) {
    return res.status(400).json({ success: false, error: 'Vendor ID is required' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 1. 벤더 정보 조회 (PMS 설정 확인)
    const vendorResult = await connection.execute(
      'SELECT * FROM accommodation_vendors WHERE id = ?',
      [vendorId]
    );

    if (!vendorResult.rows || vendorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '벤더를 찾을 수 없습니다.'
      });
    }

    const vendor = vendorResult.rows[0];

    if (!vendor.pms_provider || !vendor.pms_api_key) {
      return res.status(400).json({
        success: false,
        error: 'PMS 연동 정보가 설정되지 않았습니다.'
      });
    }

    // 2. PMS API 호출 (실제 구현 시 각 PMS별로 다른 로직 필요)
    let rooms = [];
    let bookings = [];
    const errors = [];

    // PMS별 동기화 로직
    switch (vendor.pms_provider) {
      case 'cloudbeds':
        // CloudBeds API 호출 로직
        // rooms = await syncCloudBedsRooms(vendor);
        // bookings = await syncCloudBedsBookings(vendor);
        break;

      case 'opera':
        // Oracle Opera API 호출 로직
        break;

      case 'mews':
        // Mews API 호출 로직
        break;

      case 'ezee':
        // eZee API 호출 로직
        break;

      case 'custom':
        // 커스텀 API 호출 로직
        if (vendor.api_url && vendor.pms_api_key) {
          try {
            const response = await fetch(`${vendor.api_url}/rooms`, {
              headers: {
                'Authorization': `Bearer ${vendor.pms_api_key}`,
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              const data = await response.json();
              rooms = data.rooms || [];
            } else {
              errors.push(`API 호출 실패: ${response.status} ${response.statusText}`);
            }
          } catch (fetchError) {
            errors.push(`API 호출 오류: ${fetchError.message}`);
          }
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `지원하지 않는 PMS: ${vendor.pms_provider}`
        });
    }

    // 3. 동기화된 객실 정보를 DB에 저장
    let roomsAdded = 0;
    let roomsUpdated = 0;

    for (const roomData of rooms) {
      try {
        // 객실이 이미 존재하는지 확인
        const existingRoom = await connection.execute(
          'SELECT id FROM accommodation_rooms WHERE vendor_id = ? AND room_code = ?',
          [vendorId, roomData.room_code]
        );

        if (existingRoom.rows && existingRoom.rows.length > 0) {
          // 업데이트
          await connection.execute(
            `UPDATE accommodation_rooms SET
              room_name = ?, room_type = ?, capacity = ?,
              base_price = ?, breakfast_included = ?, description = ?,
              updated_at = NOW()
            WHERE id = ?`,
            [
              roomData.name,
              roomData.type,
              roomData.capacity,
              roomData.price,
              roomData.breakfast_included,
              roomData.description,
              existingRoom.rows[0].id
            ]
          );
          roomsUpdated++;
        } else {
          // 새로 추가
          await connection.execute(
            `INSERT INTO accommodation_rooms
            (vendor_id, room_code, room_name, room_type, capacity, base_price, breakfast_included, description, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              vendorId,
              roomData.room_code,
              roomData.name,
              roomData.type,
              roomData.capacity,
              roomData.price,
              roomData.breakfast_included,
              roomData.description
            ]
          );
          roomsAdded++;
        }
      } catch (roomError) {
        errors.push(`객실 "${roomData.name}" 동기화 실패: ${roomError.message}`);
      }
    }

    // 4. 벤더 정보 업데이트 (마지막 동기화 시간)
    await connection.execute(
      'UPDATE accommodation_vendors SET last_sync_at = NOW() WHERE id = ?',
      [vendorId]
    );

    return res.status(200).json({
      success: true,
      message: `PMS 동기화 완료 (${roomsAdded}개 추가, ${roomsUpdated}개 업데이트)`,
      data: {
        roomsAdded,
        roomsUpdated,
        bookingsAdded: bookings.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('PMS sync error:', error);
    return res.status(500).json({
      success: false,
      error: 'PMS 동기화 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};
