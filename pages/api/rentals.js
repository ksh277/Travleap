/**
 * 렌트카 예약 API (MVP 형식)
 * POST /api/rentals - 새 예약 생성
 */

const { connect } = require('@planetscale/database');
const { encrypt, encryptPhone, encryptEmail } = require('../../utils/encryption');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const {
      vehicle_id,
      pickup_at,
      return_at,
      pickup_location_id,
      dropoff_location_id,
      driver,
      customer_name,
      customer_email,
      customer_phone,
      insurance_plan_id,
      extras
    } = req.body;

    console.log('🚗 [Rentals API] 예약 요청:', { vehicle_id, pickup_at, return_at });

    // 필수 필드 검증
    if (!vehicle_id || !pickup_at || !return_at || !customer_name || !customer_email) {
      return res.status(400).json({
        success: false,
        error: '필수 필드가 누락되었습니다'
      });
    }

    // 1. 차량 정보 조회
    const vehicleResult = await connection.execute(
      `SELECT
        v.*,
        ve.id as vendor_id,
        ve.business_name,
        ve.brand_name
      FROM rentcar_vehicles v
      INNER JOIN rentcar_vendors ve ON v.vendor_id = ve.id
      WHERE v.id = ? AND v.is_active = 1`,
      [vehicle_id]
    );

    if (!vehicleResult.rows || vehicleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '차량을 찾을 수 없습니다'
      });
    }

    const vehicle = vehicleResult.rows[0];

    // 2. 시간 계산
    const pickupDate = new Date(pickup_at);
    const returnDate = new Date(return_at);
    const diffMs = returnDate.getTime() - pickupDate.getTime();
    const rentalHours = diffMs / (1000 * 60 * 60);

    if (rentalHours < 4) {
      return res.status(400).json({
        success: false,
        error: '최소 4시간 이상 대여 가능합니다'
      });
    }

    const fullDays = Math.floor(rentalHours / 24);
    const remainingHours = rentalHours % 24;

    // 3. 가격 계산
    const dailyRate = vehicle.daily_rate_krw;
    const hourlyRate = vehicle.hourly_rate_krw || Math.floor(dailyRate / 24);

    let subtotal = 0;
    if (remainingHours === 0) {
      subtotal = dailyRate * fullDays;
    } else {
      subtotal = (dailyRate * fullDays) + Math.ceil(hourlyRate * remainingHours);
    }

    // 4. 보험료 계산
    let insuranceFee = 0;
    if (insurance_plan_id) {
      const insuranceResult = await connection.execute(
        'SELECT hourly_rate_krw, is_active FROM rentcar_insurance WHERE id = ? AND vendor_id = ?',
        [insurance_plan_id, vehicle.vendor_id]
      );

      if (insuranceResult.rows && insuranceResult.rows.length > 0) {
        if (!insuranceResult.rows[0].is_active) {
          return res.status(400).json({
            success: false,
            error: '선택하신 보험은 현재 제공되지 않습니다'
          });
        }
        insuranceFee = Math.ceil(insuranceResult.rows[0].hourly_rate_krw * rentalHours);
      }
    }

    // 5. 옵션 비용 계산
    let extrasFee = 0;
    if (extras && extras.length > 0) {
      for (const extra of extras) {
        const priceType = extra.price_type;
        const quantity = extra.quantity || 1;
        const unitPrice = extra.unit_price_krw;

        if (priceType === 'per_rental') {
          extrasFee += unitPrice * quantity;
        } else if (priceType === 'per_day') {
          extrasFee += unitPrice * Math.ceil(rentalHours / 24) * quantity;
        } else if (priceType === 'per_hour') {
          extrasFee += unitPrice * Math.ceil(rentalHours) * quantity;
        }
      }
    }

    const tax = Math.round(subtotal * 0.1);
    const totalAmount = subtotal + tax + insuranceFee + extrasFee;

    // 6. 예약 번호 생성
    const bookingNumber = `RC${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // 7. pickup_at과 return_at을 date/time으로 분리
    const pickupDateStr = pickupDate.toISOString().split('T')[0];
    const pickupTimeStr = pickupDate.toTimeString().substring(0, 5);
    const returnDateStr = returnDate.toISOString().split('T')[0];
    const returnTimeStr = returnDate.toTimeString().substring(0, 5);

    // 8. 고객 정보 암호화
    const encryptedCustomerName = encrypt(customer_name);
    const encryptedCustomerEmail = encryptEmail(customer_email);
    const encryptedCustomerPhone = customer_phone ? encryptPhone(customer_phone) : null;
    const encryptedDriverName = driver?.name ? encrypt(driver.name) : null;

    // 9. 예약 생성
    const result = await connection.execute(`
      INSERT INTO rentcar_bookings (
        booking_number, vendor_id, vehicle_id,
        customer_name, customer_email, customer_phone,
        driver_name, driver_birth, driver_license_no, driver_license_exp,
        pickup_location_id, dropoff_location_id,
        pickup_date, pickup_time, dropoff_date, dropoff_time,
        daily_rate_krw, rental_days, subtotal_krw, tax_krw, total_krw,
        insurance_id, insurance_fee_krw,
        status, payment_status,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?,
        'pending', 'pending',
        NOW(), NOW()
      )
    `, [
      bookingNumber, vehicle.vendor_id, vehicle_id,
      encryptedCustomerName, encryptedCustomerEmail, encryptedCustomerPhone,
      encryptedDriverName, driver?.birth || null, driver?.license_no || null, driver?.license_exp || null,
      pickup_location_id, dropoff_location_id,
      pickupDateStr, pickupTimeStr, returnDateStr, returnTimeStr,
      hourlyRate, Math.ceil(rentalHours), subtotal, tax, totalAmount,
      insurance_plan_id || null, insuranceFee
    ]);

    // 10. 옵션 저장 (있는 경우)
    if (extras && extras.length > 0) {
      for (const extra of extras) {
        await connection.execute(`
          INSERT INTO rentcar_booking_extras (
            booking_id, extra_id, quantity, unit_price_krw
          ) VALUES (?, ?, ?, ?)
        `, [result.insertId, extra.extra_id, extra.quantity, extra.unit_price_krw]);
      }
    }

    console.log('✅ [Rentals API] 예약 생성 완료:', bookingNumber);

    // 11. 응답 반환
    return res.status(200).json({
      success: true,
      data: {
        rental_id: result.insertId,
        booking_number: bookingNumber,
        pricing: {
          base_amount: subtotal,
          tax_amount: tax,
          insurance_fee: insuranceFee,
          extras_fee: extrasFee,
          total_amount: totalAmount,
          rental_days: fullDays,
          remainder_hours: remainingHours,
          daily_rate: dailyRate,
          hourly_rate: hourlyRate
        }
      },
      message: '예약이 생성되었습니다'
    });

  } catch (error) {
    console.error('❌ [Rentals API] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
