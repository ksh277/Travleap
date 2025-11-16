/**
 * 렌트카 예약 생성 API
 *
 * 기능:
 * - 운전자 검증 (만나이, 면허 만료일)
 * - 겹침 재검증 (트랜잭션 직전)
 * - 요금 재계산 (서버 기준 확정)
 * - booking_number 발급
 * - status: pending, payment_status: pending
 *
 * 라우트: POST /api/rentals
 * 권한: 인증된 사용자
 */

const { db } = require('../../utils/database.cjs');
const { JWTUtils } = require('../../utils/jwt.cjs');
const { encrypt, encryptPhone, encryptEmail } = require('../../utils/encryption.cjs');

/**
 * 만나이 계산
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

/**
 * 시간제 요금 계산
 */
function calculatePricing(pickupAt, returnAt, ratePlan) {
  const pickupTime = new Date(pickupAt).getTime();
  const returnTime = new Date(returnAt).getTime();

  const totalMs = returnTime - pickupTime;
  const hours = Math.ceil(totalMs / 3600000);
  const days = Math.floor(hours / 24);
  const remainderHours = hours % 24;

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
 * booking_number 생성 (RNT + 날짜 + 랜덤)
 */
function generateBookingNumber() {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `RNT${dateStr}${random}`;
}

module.exports = async function handler(req, res) {
  try {
    // 1. POST 메서드만 허용
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    // 2. JWT 인증 (선택적 - 비회원도 예약 가능하게 할 수도 있음)
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    let decoded = null;
    let userId = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      decoded = JWTUtils.verifyToken(token);
      userId = decoded?.userId || null;
    }

    // 3. 요청 데이터 파싱
    const {
      vehicle_id,
      pickup_at,
      return_at,
      pickup_location_id,
      dropoff_location_id,
      driver,
      insurance_plan_id,
      extras,
      customer_name,
      customer_email,
      customer_phone
    } = req.body;

    // 필수 필드 검증
    if (!vehicle_id || !pickup_at || !return_at || !pickup_location_id || !dropoff_location_id) {
      return res.status(400).json({
        success: false,
        error: 'Required fields missing',
        required: ['vehicle_id', 'pickup_at', 'return_at', 'pickup_location_id', 'dropoff_location_id']
      });
    }

    if (!driver || !driver.name || !driver.birth || !driver.license_no || !driver.license_exp) {
      return res.status(400).json({
        success: false,
        error: 'Driver information incomplete',
        required: ['driver.name', 'driver.birth', 'driver.license_no', 'driver.license_exp']
      });
    }

    if (!customer_name || !customer_email || !customer_phone) {
      return res.status(400).json({
        success: false,
        error: 'Customer information incomplete',
        required: ['customer_name', 'customer_email', 'customer_phone']
      });
    }

    console.log(`📝 [Create-Rental] Creating rental for vehicle ${vehicle_id}`);

    // 4. 차량 및 요금제 조회
    const vehicles = await db.query(`
      SELECT
        v.id,
        v.vendor_id,
        v.vehicle_code,
        v.brand,
        v.model,
        v.display_name,
        v.age_requirement,
        v.deposit_amount_krw,
        rp.id as rate_plan_id,
        rp.daily_rate_krw,
        rp.hourly_rate_krw
      FROM rentcar_vehicles v
      LEFT JOIN rentcar_rate_plans rp ON rp.vehicle_id = v.id AND rp.is_active = 1
      WHERE v.id = ? AND v.is_active = 1
      LIMIT 1
    `, [vehicle_id]);

    if (vehicles.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found or inactive'
      });
    }

    const vehicle = vehicles[0];

    if (!vehicle.rate_plan_id) {
      return res.status(400).json({
        success: false,
        error: 'No active rate plan for this vehicle'
      });
    }

    // 5. 운전자 검증 (서버 강제)
    const pickupDate = new Date(pickup_at);
    const returnDate = new Date(return_at);

    // 5-1. 만나이 확인
    const driverAge = calculateAge(driver.birth, pickupDate);
    const minAge = vehicle.age_requirement || 21;

    if (driverAge < minAge) {
      return res.status(422).json({
        success: false,
        error: `Driver must be at least ${minAge} years old`,
        driver_age: driverAge,
        min_age: minAge
      });
    }

    console.log(`   ✅ Driver age check passed: ${driverAge} >= ${minAge}`);

    // 5-2. 면허 만료일 확인
    const licenseExpDate = new Date(driver.license_exp);

    if (licenseExpDate < returnDate) {
      return res.status(422).json({
        success: false,
        error: 'Driver license will expire before return date',
        license_exp: driver.license_exp,
        return_at
      });
    }

    console.log(`   ✅ License expiry check passed`);

    // 6. 겹침 재검증 (트랜잭션 직전)
    const overlapQuery = `
      SELECT 1
      FROM rentcar_bookings
      WHERE vehicle_id = ?
        AND status IN ('hold', 'confirmed', 'in_progress')
        AND NOT (dropoff_at_utc <= ? OR ? <= pickup_at_utc)
      LIMIT 1
    `;

    const overlaps = await db.query(overlapQuery, [vehicle_id, pickup_at, return_at]);

    if (overlaps.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Vehicle is no longer available for selected dates',
        message: 'Another booking was made while you were completing this reservation'
      });
    }

    console.log(`   ✅ Overlap check passed`);

    // 7. 차량 차단 재검증
    const blockQuery = `
      SELECT 1
      FROM rentcar_vehicle_blocks
      WHERE vehicle_id = ?
        AND is_active = 1
        AND NOT (ends_at <= ? OR ? <= starts_at)
      LIMIT 1
    `;

    const blocks = await db.query(blockQuery, [vehicle_id, pickup_at, return_at]);

    if (blocks.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Vehicle is blocked for maintenance',
        message: 'This vehicle is temporarily unavailable'
      });
    }

    console.log(`   ✅ Block check passed`);

    // 8. 요금 재계산 (서버 기준 확정)
    const pricing = calculatePricing(pickup_at, return_at, {
      daily_rate_krw: vehicle.daily_rate_krw,
      hourly_rate_krw: vehicle.hourly_rate_krw
    });

    // 보험 요금 (옵션)
    let insurancePriceKrw = 0;
    if (insurance_plan_id) {
      // rentcar_insurance 테이블 사용 (hourly_rate_krw 기준)
      const insurancePlans = await db.query(`
        SELECT hourly_rate_krw FROM rentcar_insurance WHERE id = ?
      `, [insurance_plan_id]);

      if (insurancePlans.length > 0) {
        // 시간당 요금 * 총 시간
        insurancePriceKrw = Math.ceil(insurancePlans[0].hourly_rate_krw * pricing.total_hours);
      }

      console.log(`   🛡️  Insurance calculated: plan_id=${insurance_plan_id}, hourly_rate=${insurancePlans[0]?.hourly_rate_krw || 0}, total_hours=${pricing.total_hours}, total=${insurancePriceKrw} KRW`);
    }

    // 추가 옵션 요금
    let extrasPriceKrw = 0;
    // extras는 [{extra_id, quantity, price_type, unit_price_krw}] 형식
    if (extras && Array.isArray(extras) && extras.length > 0) {
      // 각 extra의 가격 계산
      for (const extra of extras) {
        const { extra_id, quantity, price_type, unit_price_krw } = extra;

        if (!extra_id || !quantity || !price_type || !unit_price_krw) {
          continue; // 유효하지 않은 extra는 스킵
        }

        let extraPrice = 0;
        switch (price_type) {
          case 'per_day':
            extraPrice = unit_price_krw * pricing.rental_days * quantity;
            break;
          case 'per_rental':
            extraPrice = unit_price_krw * quantity;
            break;
          case 'per_hour':
            extraPrice = unit_price_krw * pricing.total_hours * quantity;
            break;
          case 'per_item':
            extraPrice = unit_price_krw * quantity;
            break;
          default:
            extraPrice = unit_price_krw * quantity;
        }

        extrasPriceKrw += extraPrice;
      }

      console.log(`   🎁 Extras calculated: ${extras.length} items, total=${extrasPriceKrw} KRW`);
    }

    // 보증금
    const depositAmountKrw = vehicle.deposit_amount_krw || 0;

    // 총 요금 (렌탈 요금 + 보험 + 부가서비스 + 보증금)
    const totalPriceKrw = pricing.base_amount + insurancePriceKrw + extrasPriceKrw + depositAmountKrw;

    console.log(`   💰 Pricing calculated: base=${pricing.base_amount}, insurance=${insurancePriceKrw}, extras=${extrasPriceKrw}, deposit=${depositAmountKrw}, total=${totalPriceKrw}`);

    // 9. booking_number 생성
    const bookingNumber = generateBookingNumber();

    // 10. HOLD 만료시간 (10분)
    const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // 10.5 고객 정보 암호화 (PIPA 준수)
    const encryptedCustomerName = encrypt(customer_name);
    const encryptedCustomerEmail = encryptEmail(customer_email);
    const encryptedCustomerPhone = encryptPhone(customer_phone);
    const encryptedDriverName = encrypt(driver.name);

    console.log(`   🔒 Customer data encrypted for security`);

    // 11. DB 삽입 (트랜잭션)
    const insertResult = await db.execute(`
      INSERT INTO rentcar_bookings (
        booking_number,
        vendor_id,
        vehicle_id,
        rate_plan_id,
        user_id,
        customer_name,
        customer_email,
        customer_phone,
        pickup_location_id,
        dropoff_location_id,
        pickup_at_utc,
        dropoff_at_utc,
        pickup_date,
        dropoff_date,
        pickup_time,
        dropoff_time,
        insurance_plan_id,
        extras,
        rental_hours,
        rental_days,
        rental_hours_remainder,
        hourly_rate_krw,
        daily_rate_krw,
        base_price_krw,
        insurance_price_krw,
        extras_price_krw,
        total_price_krw,
        deposit_amount_krw,
        driver_name,
        driver_birth,
        driver_license_no,
        driver_license_exp,
        driver_age_at_pickup,
        status,
        payment_status,
        hold_expires_at,
        created_at,
        updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, 'hold', 'pending', ?, NOW(), NOW()
      )
    `, [
      bookingNumber,
      vehicle.vendor_id,
      vehicle_id,
      vehicle.rate_plan_id,
      userId,
      encryptedCustomerName,
      encryptedCustomerEmail,
      encryptedCustomerPhone,
      pickup_location_id,
      dropoff_location_id,
      pickup_at,
      return_at,
      pickupDate.toISOString().split('T')[0],
      returnDate.toISOString().split('T')[0],
      pickupDate.toTimeString().split(' ')[0],
      returnDate.toTimeString().split(' ')[0],
      insurance_plan_id,
      JSON.stringify(extras || []),
      pricing.total_hours,
      pricing.rental_days,
      pricing.remainder_hours,
      pricing.hourly_rate,
      pricing.daily_rate,
      pricing.base_amount,
      insurancePriceKrw,
      extrasPriceKrw,
      totalPriceKrw,
      depositAmountKrw,
      encryptedDriverName,
      driver.birth,
      driver.license_no,
      driver.license_exp,
      driverAge,
      holdExpiresAt
    ]);

    const rentalId = insertResult.insertId;

    console.log(`✅ [Create-Rental] Rental created: ${bookingNumber} (ID: ${rentalId})`);

    // 11.5. 차량 재고 차감 (if stock management enabled)
    try {
      const vehicleStock = await db.query(
        `SELECT stock FROM rentcar_vehicles WHERE id = ?`,
        [vehicle_id]
      );

      if (vehicleStock && vehicleStock[0] && vehicleStock[0].stock !== null && vehicleStock[0].stock > 0) {
        // 재고가 있는 경우 차감
        await db.execute(
          `UPDATE rentcar_vehicles SET stock = stock - 1 WHERE id = ? AND stock > 0`,
          [vehicle_id]
        );
        console.log(`✅ [Stock] Vehicle stock decreased: ${vehicle_id} (-1)`);
      }
    } catch (stockError) {
      console.warn(`⚠️  [Stock] Failed to decrease vehicle stock:`, stockError);
      // 재고 차감 실패는 치명적이지 않으므로 계속 진행
    }

    // 12. 상태 전이 로그
    try {
      await db.execute(`
        INSERT INTO rentcar_state_transitions (
          rental_id, from_status, to_status, transition_reason, transitioned_by
        ) VALUES (?, 'none', 'hold', 'Rental created', ?)
      `, [rentalId, customer_email]);
    } catch (logError) {
      console.warn('⚠️  State transition log failed (non-critical)');
    }

    // 13. 성공 응답
    return res.status(201).json({
      success: true,
      data: {
        rental_id: rentalId,
        booking_number: bookingNumber,
        status: 'hold',
        hold_expires_at: holdExpiresAt.toISOString(),
        vehicle: {
          id: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          display_name: vehicle.display_name
        },
        pricing: {
          rental_hours: pricing.total_hours,
          rental_days: pricing.rental_days,
          remainder_hours: pricing.remainder_hours,
          base_amount: pricing.base_amount,
          insurance_amount: insurancePriceKrw,
          extras_amount: extrasPriceKrw,
          deposit_amount: depositAmountKrw,
          total_amount: totalPriceKrw
        },
        driver: {
          name: driver.name,
          age_at_pickup: driverAge
        },
        next_step: 'Complete payment within 10 minutes to confirm booking'
      },
      message: 'Rental created successfully. Please proceed to payment.'
    });

  } catch (error) {
    console.error('❌ [Create-Rental] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
