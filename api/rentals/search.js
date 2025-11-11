/**
 * 렌트카 검색 API - 가용성 조회 + 요금 계산
 *
 * 기능:
 * - 차량 겹침 체크 (기존 예약 + 차량 차단)
 * - 시간제 요금 계산 (일 + 시간 혼합)
 * - 보험/옵션 미리보기
 *
 * 라우트: GET /api/rentals/search
 * 권한: 공개 (인증 불필요)
 */

const { connect } = require('@planetscale/database');

/**
 * 시간제 요금 계산
 * hours = ceil((return - pickup) / 1h)
 * days  = floor(hours / 24)
 * rem   = hours % 24
 * price = days*base_daily + rem*base_hourly
 */
function calculatePricing(pickupAt, returnAt, ratePlan) {
  const pickupTime = new Date(pickupAt).getTime();
  const returnTime = new Date(returnAt).getTime();

  // 총 시간 (올림)
  const totalMs = returnTime - pickupTime;
  const hours = Math.ceil(totalMs / 3600000);

  // 일수 및 나머지 시간
  const days = Math.floor(hours / 24);
  const remainderHours = hours % 24;

  // 기본 요금
  const baseAmount = (days * ratePlan.daily_rate_krw) + (remainderHours * (ratePlan.hourly_rate_krw || 0));

  return {
    total_hours: hours,
    rental_days: days,
    remainder_hours: remainderHours,
    base_amount: baseAmount,
    hourly_rate: ratePlan.hourly_rate_krw || 0,
    daily_rate: ratePlan.daily_rate_krw
  };
}

/**
 * 운전자 나이 계산
 */
function calculateAge(birthDate, referenceDate) {
  const birth = new Date(birthDate);
  const reference = new Date(referenceDate);

  let age = reference.getFullYear() - birth.getFullYear();
  const monthDiff = reference.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

module.exports = async function handler(req, res) {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 1. GET 메서드만 허용
    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    // 2. 필수 파라미터 추출
    const {
      pickup_at,
      return_at,
      location_id,
      driver_age,
      vendor_id
    } = req.query;

    if (!pickup_at || !return_at || !location_id) {
      return res.status(400).json({
        success: false,
        error: 'pickup_at, return_at, location_id are required',
        provided: { pickup_at, return_at, location_id }
      });
    }

    console.log(`🔍 [Search] Searching vehicles: ${pickup_at} → ${return_at}, location: ${location_id}`);

    // 3. 날짜 유효성 검증
    const pickupDate = new Date(pickup_at);
    const returnDate = new Date(return_at);

    if (isNaN(pickupDate.getTime()) || isNaN(returnDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    if (pickupDate >= returnDate) {
      return res.status(400).json({
        success: false,
        error: 'return_at must be after pickup_at'
      });
    }

    // 4. 차량 목록 조회 (단순화: 필수 정보만)
    let vehicleQuery = `
      SELECT
        v.id,
        v.vendor_id,
        v.display_name,
        v.thumbnail_url,
        v.images,
        v.daily_rate_krw,
        v.hourly_rate_krw
      FROM rentcar_vehicles v
      WHERE v.is_active = 1
    `;

    const queryParams = [];

    if (vendor_id) {
      vehicleQuery += ' AND v.vendor_id = ?';
      queryParams.push(vendor_id);
    }

    vehicleQuery += ' ORDER BY v.created_at DESC';

    const vehiclesResult = await connection.execute(vehicleQuery, queryParams);
    const vehicles = vehiclesResult.rows || [];

    console.log(`   Found ${vehicles.length} vehicles (before availability check)`);

    // 5. 각 차량별 가용성 체크 및 요금 계산
    const availableVehicles = [];

    for (const vehicle of vehicles) {
      // 5-1. 기존 예약과 겹침 체크
      const overlapQuery = `
        SELECT 1
        FROM rentcar_bookings
        WHERE vehicle_id = ?
          AND status IN ('hold', 'confirmed', 'in_progress')
          AND NOT (dropoff_at_utc <= ? OR ? <= pickup_at_utc)
        LIMIT 1
      `;

      const overlapsResult = await connection.execute(overlapQuery, [
        vehicle.id,
        pickup_at,
        return_at
      ]);
      const overlaps = overlapsResult.rows || [];

      if (overlaps.length > 0) {
        console.log(`   ⏭️  Vehicle ${vehicle.id} - Overlap with existing booking`);
        continue; // 겹침 있음 -> 스킵
      }

      // 5-2. 차량 차단 체크
      const blockQuery = `
        SELECT 1
        FROM rentcar_vehicle_blocks
        WHERE vehicle_id = ?
          AND is_active = 1
          AND NOT (ends_at <= ? OR ? <= starts_at)
        LIMIT 1
      `;

      const blocksResult = await connection.execute(blockQuery, [
        vehicle.id,
        pickup_at,
        return_at
      ]);
      const blocks = blocksResult.rows || [];

      if (blocks.length > 0) {
        console.log(`   ⏭️  Vehicle ${vehicle.id} - Blocked (maintenance/damage)`);
        continue; // 차단됨 -> 스킵
      }

      // 5-3. 운전자 나이 확인
      if (driver_age && vehicle.age_requirement) {
        if (parseInt(driver_age) < vehicle.age_requirement) {
          console.log(`   ⏭️  Vehicle ${vehicle.id} - Driver age requirement not met (${driver_age} < ${vehicle.age_requirement})`);
          continue;
        }
      }

      // 5-4. 요금 확인 (daily_rate_krw는 필수)
      if (!vehicle.daily_rate_krw || vehicle.daily_rate_krw <= 0) {
        console.log(`   ⏭️  Vehicle ${vehicle.id} - No valid pricing (daily_rate_krw: ${vehicle.daily_rate_krw})`);
        continue;
      }

      // 5-5. 요금 계산
      const pricing = calculatePricing(pickup_at, return_at, {
        daily_rate_krw: vehicle.daily_rate_krw,
        hourly_rate_krw: vehicle.hourly_rate_krw
      });

      // 5-6. 가용 차량으로 추가 (단순화)
      availableVehicles.push({
        vehicle_id: vehicle.id,
        vendor_id: vehicle.vendor_id,
        display_name: vehicle.display_name,
        thumbnail_url: vehicle.thumbnail_url,
        images: vehicle.images ? JSON.parse(vehicle.images) : [],
        daily_rate_krw: vehicle.daily_rate_krw,
        hourly_rate_krw: vehicle.hourly_rate_krw,
        pricing: {
          ...pricing
        },
        availability: {
          pickup_at,
          return_at,
          location_id: parseInt(location_id)
        }
      });
    }

    console.log(`✅ [Search] ${availableVehicles.length} available vehicles found`);

    // 6. 성공 응답
    return res.status(200).json({
      success: true,
      data: {
        search_criteria: {
          pickup_at,
          return_at,
          location_id: parseInt(location_id),
          driver_age: driver_age ? parseInt(driver_age) : null
        },
        available_vehicles: availableVehicles,
        total_count: availableVehicles.length
      },
      message: `Found ${availableVehicles.length} available vehicles`
    });

  } catch (error) {
    console.error('❌ [Search] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
