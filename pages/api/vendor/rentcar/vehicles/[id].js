import { connect } from '@planetscale/database';
const { requireVendorAuth } = require('../../../../../middleware/vendor-auth');

const connection = connect({ url: process.env.DATABASE_URL });

/**
 * 특정 차량 수정/삭제 API
 * PUT: 차량 정보 수정
 * DELETE: 차량 삭제
 */
export default async function handler(req, res) {
  const { id } = req.query;
  const { method } = req;

  // 벤더 인증 필수
  const auth = await requireVendorAuth(req, res);
  if (!auth.success) return;

  const vendorId = auth.vendorId;

  console.log(`🚗 [Vehicle ${id} API]`, { method, vendorId, vehicleId: id });

  try {
    // 차량 소유권 확인
    const vehicleCheck = await connection.execute(
      'SELECT vendor_id FROM rentcar_vehicles WHERE id = ?',
      [id]
    );

    if (!vehicleCheck.rows || vehicleCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '차량을 찾을 수 없습니다.'
      });
    }

    const vehicleVendorId = vehicleCheck.rows[0].vendor_id;

    // 관리자가 아니면서 다른 업체의 차량인 경우 거부
    if (!auth.isAdmin && vehicleVendorId !== vendorId) {
      return res.status(403).json({
        success: false,
        message: '이 차량을 수정/삭제할 권한이 없습니다.'
      });
    }

    if (method === 'PUT') {
      // 차량 정보 수정
      const {
        display_name,
        vehicle_class,
        seating_capacity,
        transmission_type,
        fuel_type,
        daily_rate_krw,
        hourly_rate_krw,
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
        instant_booking,
        brand,
        model,
        year,
        vehicle_type,
        door_count,
        large_bags,
        small_bags,
        features,
        age_requirement,
        license_requirement,
        unlimited_mileage,
        deposit_amount_krw,
        smoking_allowed,
        fuel_efficiency,
        self_insurance_krw
      } = req.body;

      if (!display_name || !daily_rate_krw) {
        return res.status(400).json({
          success: false,
          message: '필수 항목을 입력해주세요.'
        });
      }

      // ENUM 값 매핑
      const vehicleClassMapping = {
        '경차': 'compact',
        '준중형': 'midsize',
        '중형': 'midsize',
        '준대형': 'fullsize',
        '대형': 'luxury',
        'SUV': 'suv',
        'RV': 'van',
        '승합': 'van',
        'electric': 'electric'
      };

      const fuelTypeMapping = {
        '가솔린': 'gasoline',
        '디젤': 'diesel',
        '하이브리드': 'hybrid',
        '전기': 'electric',
        'LPG': 'gasoline'
      };

      const transmissionMapping = {
        '자동': 'automatic',
        '수동': 'manual'
      };

      const dbVehicleClass = vehicleClassMapping[vehicle_class] || vehicle_class;
      const dbFuelType = fuelTypeMapping[fuel_type] || fuel_type;
      const dbTransmission = transmissionMapping[transmission_type] || transmission_type;

      // 이미지 JSON 변환
      const imagesJson = JSON.stringify(image_urls || []);
      const featuresJson = JSON.stringify(features || ['GPS', '블랙박스']);

      // 시간당 요금 자동 계산 (입력값 없으면)
      const calculatedHourlyRate = hourly_rate_krw || Math.round(((daily_rate_krw / 24) * 1.2) / 1000) * 1000;

      await connection.execute(
        `UPDATE rentcar_vehicles
         SET
           display_name = ?,
           vehicle_class = ?,
           seating_capacity = ?,
           transmission = ?,
           fuel_type = ?,
           daily_rate_krw = ?,
           hourly_rate_krw = ?,
           mileage_limit_per_day = ?,
           excess_mileage_fee_krw = ?,
           is_active = ?,
           images = ?,
           insurance_options = ?,
           available_options = ?,
           thumbnail_url = ?,
           features = ?,
           brand = ?,
           model = ?,
           year = ?,
           vehicle_type = ?,
           door_count = ?,
           large_bags = ?,
           small_bags = ?,
           age_requirement = ?,
           license_requirement = ?,
           unlimited_mileage = ?,
           deposit_amount_krw = ?,
           smoking_allowed = ?,
           fuel_efficiency = ?,
           self_insurance_krw = ?,
           updated_at = NOW()
         WHERE id = ?`,
        [
          display_name,
          dbVehicleClass,
          seating_capacity || 5,
          dbTransmission,
          dbFuelType,
          daily_rate_krw,
          calculatedHourlyRate,
          mileage_limit_km || 200,
          excess_mileage_fee_krw || 100,
          is_available ? 1 : 0,
          imagesJson,
          insurance_options || '자차보험, 대인배상, 대물배상',
          available_options || 'GPS, 블랙박스, 하이패스',
          image_urls && image_urls.length > 0 ? image_urls[0] : null,
          featuresJson,
          brand || display_name.split(' ')[0] || '기타',
          model || display_name.split(' ')[1] || display_name,
          year || new Date().getFullYear(),
          vehicle_type || '세단',
          door_count || 4,
          large_bags || 2,
          small_bags || 2,
          age_requirement || 21,
          license_requirement || '1년 이상',
          unlimited_mileage ? 1 : 0,
          deposit_amount_krw || 500000,
          smoking_allowed ? 1 : 0,
          fuel_efficiency || null,
          self_insurance_krw || null,
          id
        ]
      );

      console.log(`✅ [Vehicle ${id}] 수정 완료`);

      return res.status(200).json({
        success: true,
        message: '차량 정보가 수정되었습니다.',
        data: { id }
      });
    }

    if (method === 'DELETE') {
      // 차량 삭제
      await connection.execute(
        'DELETE FROM rentcar_vehicles WHERE id = ?',
        [id]
      );

      console.log(`✅ [Vehicle ${id}] 삭제 완료`);

      return res.status(200).json({
        success: true,
        message: '차량이 삭제되었습니다.'
      });
    }

    return res.status(405).json({
      success: false,
      message: '지원하지 않는 메서드입니다.'
    });
  } catch (error) {
    console.error(`❌ [Vehicle ${id} API] 오류:`, error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
}
