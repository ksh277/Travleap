import { connect } from '@planetscale/database';

const connection = connect({ url: process.env.DATABASE_URL });

export default async function handler(req, res) {
  const { method } = req;
  // userId 또는 vendorId 둘 다 받을 수 있도록 수정
  const vendorId = req.headers['x-vendor-id'] || req.query.vendorId || req.query.userId || req.headers['x-user-id'] || req.body?.userId;

  console.log('🚗 [Vehicles API] 요청:', { method, vendorId });

  if (!vendorId) {
    return res.status(401).json({ success: false, message: '벤더 인증이 필요합니다.' });
  }

  try {
    if (method === 'GET') {
      // 업체의 차량 목록 조회
      const result = await connection.execute(
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
          transmission as transmission_type,
          seating_capacity,
          door_count,
          large_bags,
          small_bags,
          thumbnail_url,
          images,
          features,
          age_requirement,
          license_requirement,
          mileage_limit_per_day as mileage_limit_km,
          unlimited_mileage,
          deposit_amount_krw,
          smoking_allowed,
          daily_rate_krw,
          daily_rate_krw * 6 as weekly_rate_krw,
          daily_rate_krw * 25 as monthly_rate_krw,
          excess_mileage_fee_krw,
          fuel_efficiency,
          self_insurance_krw,
          insurance_options,
          available_options,
          is_active as is_available,
          is_featured,
          total_bookings,
          average_rating,
          created_at,
          updated_at
        FROM rentcar_vehicles
        WHERE vendor_id = ?
        ORDER BY created_at DESC`,
        [vendorId]
      );

      console.log('✅ [Vehicles API] 차량 조회 완료:', result.rows?.length, '대');

      const vehicles = (result.rows || []).map(vehicle => ({
        ...vehicle,
        is_available: vehicle.is_available === 1,
        unlimited_mileage: vehicle.unlimited_mileage === 1,
        smoking_allowed: vehicle.smoking_allowed === 1,
        is_featured: vehicle.is_featured === 1,
        images: vehicle.images ? (typeof vehicle.images === 'string' ? JSON.parse(vehicle.images) : vehicle.images) : [],
        features: vehicle.features ? (Array.isArray(vehicle.features) ? vehicle.features : JSON.parse(vehicle.features)) : [],
        insurance_included: true,
        insurance_options: '자차보험, 대인배상, 대물배상',
        available_options: 'GPS, 블랙박스, 하이패스',
        pickup_location: '업체 본점',
        dropoff_location: '업체 본점',
        min_rental_days: 1,
        max_rental_days: 30,
        instant_booking: true
      }));

      return res.status(200).json({
        success: true,
        data: vehicles
      });
    }

    if (method === 'POST') {
      // 새 차량 등록
      const {
        display_name,
        vehicle_class,
        seating_capacity,
        transmission_type,
        fuel_type,
        daily_rate_krw,
        weekly_rate_krw,
        monthly_rate_krw,
        mileage_limit_km,
        excess_mileage_fee_krw,
        is_available,
        image_urls,
        insurance_included,
        insurance_options,
        available_options,
        pickup_location,
        dropoff_location,
        min_rental_days,
        max_rental_days,
        instant_booking
      } = req.body;

      if (!display_name || !daily_rate_krw) {
        return res.status(400).json({ success: false, message: '필수 항목을 입력해주세요.' });
      }

      // 차량 코드 자동 생성
      const vehicle_code = `VEH_${vendorId}_${Date.now()}`;

      // 이미지 배열을 JSON 문자열로 변환
      const imagesJson = JSON.stringify(image_urls || []);

      const result = await connection.execute(
        `INSERT INTO rentcar_vehicles (
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
          large_bags,
          small_bags,
          thumbnail_url,
          images,
          features,
          age_requirement,
          license_requirement,
          mileage_limit_per_day,
          unlimited_mileage,
          deposit_amount_krw,
          smoking_allowed,
          daily_rate_krw,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          vendorId,
          vehicle_code,
          display_name.split(' ')[0] || '기타',
          display_name.split(' ')[1] || display_name,
          new Date().getFullYear(),
          display_name,
          vehicle_class || '중형',
          '세단',
          fuel_type || '가솔린',
          transmission_type || '자동',
          seating_capacity || 5,
          4,
          2,
          2,
          image_urls && image_urls.length > 0 ? image_urls[0] : null,
          imagesJson,
          JSON.stringify(['GPS', '블랙박스']),
          21,
          '1년 이상',
          mileage_limit_km || 200,
          0,
          500000,
          0,
          daily_rate_krw,
          is_available ? 1 : 0
        ]
      );

      return res.status(201).json({
        success: true,
        message: '차량이 등록되었습니다.',
        data: { insertId: result.insertId }
      });
    }

    return res.status(405).json({ success: false, message: '지원하지 않는 메서드입니다.' });
  } catch (error) {
    console.error('Vendor vehicles API error:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}
