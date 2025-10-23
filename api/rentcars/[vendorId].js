const { connect } = require('@planetscale/database');

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

  try {
    const { vendorId } = req.query;
    const connection = connect({ url: process.env.DATABASE_URL });

    // 벤더 정보 조회
    const vendorResult = await connection.execute(`
      SELECT * FROM rentcar_vendors
      WHERE id = ? AND status = 'active'
      LIMIT 1
    `, [vendorId]);

    if (!vendorResult.rows || vendorResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: '렌트카 업체를 찾을 수 없습니다.' });
    }

    const vendor = vendorResult.rows[0];

    // 차량 목록 조회
    const vehiclesResult = await connection.execute(`
      SELECT * FROM rentcar_vehicles
      WHERE vendor_id = ? AND is_active = 1
      ORDER BY daily_rate_krw ASC
    `, [vendorId]);

    const vehicles = (vehiclesResult.rows || []).map(vehicle => {
      // PlanetScale는 JSON 컬럼을 자동으로 파싱하므로 타입 체크 필요
      const images = vehicle.images
        ? (typeof vehicle.images === 'string' ? JSON.parse(vehicle.images) : vehicle.images)
        : [];
      const features = vehicle.features
        ? (typeof vehicle.features === 'string' ? JSON.parse(vehicle.features) : vehicle.features)
        : [];

      return {
        ...vehicle,
        images: Array.isArray(images) ? images : [],
        features: Array.isArray(features) ? features : [],
        stock: 5,
        description: vehicle.display_name ? `${vehicle.brand} ${vehicle.model} ${vehicle.year}년식` : null,
        insurance_options: vehicle.insurance_options || '자차보험, 대인배상, 대물배상',
        available_options: vehicle.available_options || 'GPS, 블랙박스, 하이패스',
        mileage_limit_per_day: vehicle.mileage_limit_per_day || 200,
        excess_mileage_fee_krw: vehicle.excess_mileage_fee_krw || 100,
        fuel_efficiency: vehicle.fuel_efficiency ? parseFloat(vehicle.fuel_efficiency) : 12.5,
        self_insurance_krw: vehicle.self_insurance_krw || 500000
      };
    });

    // vendor 정보에 모든 필드 포함
    const vendorWithLocation = {
      ...vendor,
      vendor_name: vendor.brand_name || vendor.business_name,
      phone: vendor.contact_phone,
      email: vendor.contact_email,
      address: vendor.address || '제주특별자치도 제주시 연동',
      cancellation_policy: vendor.cancellation_policy || '예약 3일 전: 전액 환불\n예약 1-2일 전: 50% 환불\n예약 당일: 환불 불가',
      latitude: 33.4996,
      longitude: 126.5312
    };

    return res.status(200).json({
      success: true,
      data: {
        vendor: vendorWithLocation,
        vehicles,
        total_vehicles: vehicles.length
      }
    });
  } catch (error) {
    console.error('Error fetching rentcar details:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
