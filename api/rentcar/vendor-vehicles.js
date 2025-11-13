// 렌트카 벤더 차량 관리 API
const { db } = require('../../utils/database.cjs');

/**
 * 벤더: 자기 차량 목록 조회
 */
async function getVendorVehicles(vendorId, userId) {
  try {
    console.log(`📋 [Vendor Vehicles] Getting vehicles for vendorId: ${vendorId}, userId: ${userId}`);

    // userId로 vendor_id 조회
    if (!vendorId && userId) {
      const vendorResult = await db.query(
        'SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
        [userId]
      );

      if (!vendorResult || vendorResult.length === 0) {
        console.log('⚠️  [Vendor Vehicles] No vendor found for userId:', userId);
        return {
          success: false,
          message: '렌트카 벤더 정보를 찾을 수 없습니다.',
          data: [],
          vehicles: []
        };
      }

      vendorId = vendorResult[0].id;
      console.log(`✅ [Vendor Vehicles] Found vendorId: ${vendorId} for userId: ${userId}`);
    }

    if (!vendorId) {
      return {
        success: false,
        message: '벤더 ID가 필요합니다.',
        data: [],
        vehicles: []
      };
    }

    // 차량 목록 조회 (stock 포함)
    const vehiclesResult = await db.query(
      `SELECT
        id,
        vendor_id,
        vehicle_code,
        brand,
        model,
        year,
        display_name,
        vehicle_class,
        vehicle_type,
        fuel_type,
        transmission,
        seating_capacity,
        door_count,
        thumbnail_url,
        images,
        daily_rate_krw,
        hourly_rate_krw,
        weekly_rate_krw,
        monthly_rate_krw,
        stock,
        is_active,
        is_featured,
        created_at,
        updated_at
      FROM rentcar_vehicles
      WHERE vendor_id = ?
      ORDER BY id ASC`,
      [vendorId]
    );

    console.log(`✅ [Vendor Vehicles] Found ${vehiclesResult?.length || 0} vehicles for vendorId: ${vendorId}`);

    return {
      success: true,
      data: vehiclesResult || [],
      vehicles: vehiclesResult || [] // 하위 호환성을 위해
    };

  } catch (error) {
    console.error('❌ [Vendor Vehicles API] Get vehicles error:', error);
    return {
      success: false,
      message: '차량 목록을 불러오는 중 오류가 발생했습니다.',
      error: error.message,
      data: [],
      vehicles: []
    };
  }
}

/**
 * 벤더: 새 차량 등록
 */
async function createVehicle(vehicleData, userId) {
  try {
    // userId로 vendor_id 조회
    const vendorResult = await db.query(
      'SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
      [userId]
    );

    if (!vendorResult || vendorResult.length === 0) {
      return {
        success: false,
        message: '렌트카 벤더 정보를 찾을 수 없습니다.'
      };
    }

    const vendorId = vendorResult[0].id;

    // 차량 등록 로직 구현 필요
    return {
      success: false,
      message: 'createVehicle: Not implemented yet',
      vendorId
    };
  } catch (error) {
    console.error('❌ [Vendor Vehicles API] Create vehicle error:', error);
    return {
      success: false,
      message: '차량 등록 중 오류가 발생했습니다.',
      error: error.message
    };
  }
}

/**
 * 벤더: 차량 정보 수정
 */
async function updateVehicle(vehicleId, updateData, userId) {
  return {
    success: false,
    message: 'updateVehicle: Not implemented yet'
  };
}

/**
 * 벤더: 차량 삭제
 */
async function deleteVehicle(vehicleId, userId) {
  return {
    success: false,
    message: 'deleteVehicle: Not implemented yet'
  };
}

module.exports = {
  getVendorVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle
};
