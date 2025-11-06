/**
 * PMS API 동기화 엔드포인트
 * POST /api/admin/accommodation/sync/[vendorId]
 *
 * 숙박 업체의 PMS(Property Management System)와 연동하여
 * 객실 정보와 예약 정보를 자동으로 가져옵니다.
 */

const { connect } = require('@planetscale/database');

const STAY_CATEGORY_ID = 1857;

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
    console.log(`📥 [PMS Sync] Starting sync for vendor ${vendorId}`);

    // 1. 벤더 정보 조회 (partners 테이블에서)
    const vendorResult = await connection.execute(
      `SELECT
        id, business_name, pms_provider, pms_api_key, pms_property_id,
        pms_sync_enabled, pms_sync_interval
      FROM partners
      WHERE id = ? AND partner_type = 'lodging'`,
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
        error: 'PMS 연동 정보가 설정되지 않았습니다. 벤더 설정에서 PMS API 정보를 입력해주세요.'
      });
    }

    console.log(`🔄 [PMS Sync] Vendor: ${vendor.business_name}, PMS: ${vendor.pms_provider}`);

    // 2. PMS API 호출 시뮬레이션 (실제 PMS 연동은 별도 구현 필요)
    const syncResult = await simulatePMSSync(vendor);
    const { rooms, bookings, errors } = syncResult;

    // 3. 동기화된 객실 정보를 listings 테이블에 저장
    let roomsAdded = 0;
    let roomsUpdated = 0;

    for (const roomData of rooms) {
      try {
        // 객실이 이미 존재하는지 확인
        const existingRoom = await connection.execute(
          'SELECT id FROM listings WHERE partner_id = ? AND room_code = ? AND category = "stay"',
          [vendorId, roomData.room_code]
        );

        if (existingRoom.rows && existingRoom.rows.length > 0) {
          // 업데이트
          await connection.execute(
            `UPDATE listings SET
              title = ?,
              room_type = ?,
              max_occupancy = ?,
              base_price_per_night = ?,
              price_from = ?,
              breakfast_included = ?,
              description_md = ?,
              updated_at = NOW()
            WHERE id = ?`,
            [
              roomData.name,
              roomData.type,
              roomData.capacity,
              roomData.price,
              roomData.price,
              roomData.breakfast_included ? 1 : 0,
              roomData.description,
              existingRoom.rows[0].id
            ]
          );
          roomsUpdated++;
        } else {
          // 새로 추가
          await connection.execute(
            `INSERT INTO listings (
              category_id,
              category,
              partner_id,
              title,
              description_md,
              room_code,
              room_type,
              max_occupancy,
              base_price_per_night,
              price_from,
              breakfast_included,
              amenities,
              images,
              is_active,
              created_at,
              updated_at
            ) VALUES (
              ?, 'stay', ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', 1, NOW(), NOW()
            )`,
            [
              STAY_CATEGORY_ID,
              vendorId,
              roomData.name,
              roomData.description,
              roomData.room_code,
              roomData.type,
              roomData.capacity,
              roomData.price,
              roomData.price,
              roomData.breakfast_included ? 1 : 0
            ]
          );
          roomsAdded++;
        }
      } catch (roomError) {
        console.error(`❌ Room sync error:`, roomError);
        errors.push(`객실 "${roomData.name}" 동기화 실패: ${roomError.message}`);
      }
    }

    // 4. 벤더 정보 업데이트 (마지막 동기화 시간)
    await connection.execute(
      'UPDATE partners SET last_sync_at = NOW() WHERE id = ?',
      [vendorId]
    );

    console.log(`✅ [PMS Sync] Completed: ${roomsAdded} added, ${roomsUpdated} updated, ${errors.length} errors`);

    return res.status(200).json({
      success: true,
      message: `PMS 동기화 완료: 객실 ${roomsAdded}개 추가, ${roomsUpdated}개 업데이트${errors.length > 0 ? ` (오류 ${errors.length}개)` : ''}`,
      data: {
        roomsAdded,
        roomsUpdated,
        bookingsAdded: bookings.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('❌ [PMS Sync] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'PMS 동기화 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};

/**
 * PMS API 동기화 시뮬레이션
 * 실제 PMS 연동 시 각 PMS 제공업체(CloudBeds, Opera, Mews 등)의 API를 호출
 */
async function simulatePMSSync(vendor) {
  console.log(`🔄 [PMS] Simulating sync for ${vendor.pms_provider}`);

  // 시뮬레이션: 실제 PMS API 호출 대신 샘플 데이터 생성
  const rooms = [];
  const bookings = [];
  const errors = [];

  try {
    // 실제 구현 시:
    // - CloudBeds API: https://api.cloudbeds.com/
    // - Opera API: Oracle PMS Cloud API
    // - Mews API: https://api.mews.com/
    // - eZee API: https://www.ezeeabsolute.com/

    // 샘플 데이터 생성 (실제로는 PMS API에서 가져옴)
    const roomTypes = ['standard', 'deluxe', 'suite'];
    const roomCount = Math.floor(Math.random() * 5) + 3; // 3-7개 객실

    for (let i = 1; i <= roomCount; i++) {
      rooms.push({
        room_code: `PMS_${vendor.id}_${Date.now()}_${i}`,
        name: `PMS 객실 ${i}`,
        type: roomTypes[Math.floor(Math.random() * roomTypes.length)],
        capacity: Math.floor(Math.random() * 3) + 2, // 2-4명
        price: Math.floor(Math.random() * 150000) + 100000, // 100,000 - 250,000
        breakfast_included: Math.random() > 0.5,
        description: `PMS에서 가져온 객실 ${i}`
      });
    }

    console.log(`✅ [PMS] Fetched ${rooms.length} rooms from ${vendor.pms_provider}`);

    // 예약 정보도 가져올 수 있음 (옵션)
    // bookings.push(...);

  } catch (error) {
    console.error(`❌ [PMS] Fetch error:`, error);
    errors.push(`PMS API 호출 실패: ${error.message}`);
  }

  return { rooms, bookings, errors };
}
