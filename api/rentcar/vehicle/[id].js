const { connect } = require('@planetscale/database');

const connection = connect({ url: process.env.DATABASE_URL });

/**
 * 개별 차량 상세 정보 API
 * GET /api/rentcar/vehicle/{id}
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

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Vehicle ID is required'
    });
  }

  try {
    console.log(`🚗 [Vehicle Detail API] 차량 ID: ${id}`);

    // 차량 정보 + 업체 정보 조인
    const result = await connection.execute(
      `SELECT
        v.id,
        v.vendor_id,
        v.vehicle_code,
        v.brand,
        v.model,
        v.year,
        v.display_name,
        v.vehicle_class,
        v.vehicle_type,
        v.fuel_type,
        v.transmission,
        v.seating_capacity,
        v.door_count,
        v.large_bags,
        v.small_bags,
        v.thumbnail_url,
        v.images,
        v.features,
        v.age_requirement,
        v.license_requirement,
        v.mileage_limit_per_day,
        v.unlimited_mileage,
        v.deposit_amount_krw,
        v.smoking_allowed,
        v.daily_rate_krw,
        v.hourly_rate_krw,
        v.excess_mileage_fee_krw,
        v.fuel_efficiency,
        v.self_insurance_krw,
        v.insurance_options,
        v.available_options,
        v.is_active,
        v.is_featured,
        v.total_bookings,
        v.average_rating,
        v.created_at,
        v.updated_at,
        vendor.vendor_name,
        vendor.phone as vendor_phone,
        vendor.address as vendor_address,
        vendor.business_name,
        vendor.cancellation_policy
      FROM rentcar_vehicles v
      LEFT JOIN rentcar_vendors vendor ON v.vendor_id = vendor.id
      WHERE v.id = ?`,
      [id]
    );

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '차량을 찾을 수 없습니다'
      });
    }

    const vehicle = result.rows[0];

    // JSON 파싱
    const vehicleData = {
      ...vehicle,
      images: vehicle.images ? (typeof vehicle.images === 'string' ? JSON.parse(vehicle.images) : vehicle.images) : [],
      features: vehicle.features ? (typeof vehicle.features === 'string' ? JSON.parse(vehicle.features) : vehicle.features) : [],
      is_active: vehicle.is_active === 1,
      is_featured: vehicle.is_featured === 1,
      unlimited_mileage: vehicle.unlimited_mileage === 1,
      smoking_allowed: vehicle.smoking_allowed === 1
    };

    console.log(`✅ [Vehicle Detail API] 차량 정보 조회 완료: ${vehicleData.display_name}`);

    return res.status(200).json({
      success: true,
      data: vehicleData
    });

  } catch (error) {
    console.error('❌ [Vehicle Detail API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: '서버 오류가 발생했습니다',
      message: error.message
    });
  }
};
