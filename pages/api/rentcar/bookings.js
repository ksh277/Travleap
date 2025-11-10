const { connect } = require('@planetscale/database');
const { decrypt, decryptPhone, decryptEmail } = require('../../utils/encryption.cjs');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    if (req.method === 'GET') {
      const { vendor_id } = req.query;

      let sql = `
        SELECT
          b.*,
          v.display_name, v.thumbnail_url,
          ve.business_name as vendor_business_name, ve.brand_name as vendor_brand_name,
          i.name as insurance_name, i.description as insurance_description,
          i.price as insurance_hourly_rate, i.pricing_unit as insurance_pricing_unit
        FROM rentcar_bookings b
        INNER JOIN rentcar_vehicles v ON b.vehicle_id = v.id
        INNER JOIN rentcar_vendors ve ON b.vendor_id = ve.id
        LEFT JOIN insurances i ON b.insurance_id = i.id AND i.category = 'rentcar'
        WHERE 1=1
      `;
      const params = [];

      if (vendor_id) {
        sql += ` AND b.vendor_id = ?`;
        params.push(vendor_id);
      }

      sql += ` ORDER BY b.created_at DESC`;

      const bookings = await connection.execute(sql, params);

      const formatted = (bookings.rows || []).map((row) => ({
        ...row,
        // 고객 정보 복호화 (PIPA 준수)
        customer_name: decrypt(row.customer_name),
        customer_email: decryptEmail(row.customer_email),
        customer_phone: decryptPhone(row.customer_phone),
        driver_name: row.driver_name ? decrypt(row.driver_name) : null,
        vehicle: {
          display_name: row.display_name,
          thumbnail_url: row.thumbnail_url
        },
        vendor: {
          business_name: row.vendor_business_name,
          brand_name: row.vendor_brand_name
        },
        insurance: row.insurance_id ? {
          id: row.insurance_id,
          name: row.insurance_name,
          description: row.insurance_description,
          price: row.insurance_hourly_rate,
          pricing_unit: row.insurance_pricing_unit,
          fee_krw: row.insurance_fee_krw
        } : null
      }));

      return res.status(200).json({
        success: true,
        data: formatted
      });
    }

    if (req.method === 'POST') {
      const {
        vendor_id,
        vehicle_id,
        user_id,
        customer_name,
        customer_email,
        customer_phone,
        pickup_location_id,
        dropoff_location_id,
        pickup_date,
        pickup_time,
        dropoff_date,
        dropoff_time,
        insurance_id,
        special_requests
      } = req.body;

      const vehicle = await connection.execute(`
        SELECT daily_rate_krw, hourly_rate_krw, is_active FROM rentcar_vehicles WHERE id = ?
      `, [vehicle_id]);

      if (!vehicle.rows || vehicle.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '차량을 찾을 수 없습니다.'
        });
      }

      if (!vehicle.rows[0].is_active) {
        return res.status(400).json({
          success: false,
          error: '차량이 현재 예약 불가 상태입니다.'
        });
      }

      const dailyRate = vehicle.rows[0].daily_rate_krw;
      const hourlyRate = vehicle.rows[0].hourly_rate_krw || Math.floor(dailyRate / 24);

      // 픽업/반납 날짜와 시간을 조합하여 정확한 시간 계산
      const [pickupHour, pickupMinute] = (pickup_time || '00:00').split(':').map(Number);
      const [dropoffHour, dropoffMinute] = (dropoff_time || '23:59').split(':').map(Number);

      const pickupDateObj = new Date(pickup_date);
      pickupDateObj.setHours(pickupHour, pickupMinute, 0, 0);

      const dropoffDateObj = new Date(dropoff_date);
      dropoffDateObj.setHours(dropoffHour, dropoffMinute, 0, 0);

      const diffMs = dropoffDateObj.getTime() - pickupDateObj.getTime();
      const rentalHours = diffMs / (1000 * 60 * 60);

      // 정확히 24시간 단위인지 확인
      const fullDays = Math.floor(rentalHours / 24);
      const remainingHours = rentalHours % 24;

      if (rentalHours < 4) {
        return res.status(400).json({
          success: false,
          error: '최소 4시간 이상 대여 가능합니다.'
        });
      }

      // 시간 기반 충돌 감지 (이중 예약 방지) + 버퍼 타임
      const BUFFER_TIME_MINUTES = 60; // 차량 청소/점검을 위한 1시간 버퍼

      const conflictCheck = await connection.execute(
        `SELECT
           id, booking_number, pickup_date, pickup_time, dropoff_date, dropoff_time, status
         FROM rentcar_bookings
         WHERE vehicle_id = ?
           AND status NOT IN ('cancelled', 'failed')`,
        [vehicle_id]
      );

      // 시간 범위 겹침 확인 (버퍼 타임 포함)
      const conflicts = [];
      const hasConflict = (conflictCheck.rows || []).some(booking => {
        const [existingPickupHour, existingPickupMinute] = (booking.pickup_time || '00:00').split(':').map(Number);
        const [existingDropoffHour, existingDropoffMinute] = (booking.dropoff_time || '23:59').split(':').map(Number);

        const existingPickup = new Date(booking.pickup_date);
        existingPickup.setHours(existingPickupHour, existingPickupMinute, 0, 0);

        let existingDropoff = new Date(booking.dropoff_date);
        existingDropoff.setHours(existingDropoffHour, existingDropoffMinute, 0, 0);

        // 버퍼 타임 추가: 기존 예약 종료 시간에 1시간 더함
        existingDropoff = new Date(existingDropoff.getTime() + BUFFER_TIME_MINUTES * 60 * 1000);

        // 시간 범위 겹침 체크 (버퍼 타임 포함)
        const isConflict = !(dropoffDateObj.getTime() <= existingPickup.getTime() ||
                             pickupDateObj.getTime() >= existingDropoff.getTime());

        if (isConflict) {
          conflicts.push({
            booking_number: booking.booking_number,
            end_time: new Date(existingDropoff.getTime() - BUFFER_TIME_MINUTES * 60 * 1000).toISOString(),
            buffer_end: existingDropoff.toISOString()
          });
        }

        return isConflict;
      });

      if (hasConflict) {
        const conflictDetails = conflicts.length > 0
          ? `\n\n충돌 예약: ${conflicts[0].booking_number}\n반납 시간: ${new Date(conflicts[0].end_time).toLocaleString('ko-KR')}\n버퍼 타임 종료: ${new Date(conflicts[0].buffer_end).toLocaleString('ko-KR')}`
          : '';

        return res.status(409).json({
          success: false,
          error: `선택하신 날짜/시간에 이미 예약이 있습니다.\n\n차량 청소 및 점검을 위해 반납 후 ${BUFFER_TIME_MINUTES}분의 버퍼 타임이 필요합니다.${conflictDetails}\n\n다른 시간을 선택해주세요.`,
          conflicts: conflicts
        });
      }

      // 보험료 계산 (선택 사항)
      let insuranceFee = 0;
      if (insurance_id) {
        const insuranceResult = await connection.execute(
          'SELECT price, pricing_unit, is_active FROM insurances WHERE id = ? AND category = ?',
          [insurance_id, 'rentcar']
        );

        if (!insuranceResult.rows || insuranceResult.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: '보험 상품을 찾을 수 없습니다.'
          });
        }

        if (!insuranceResult.rows[0].is_active) {
          return res.status(400).json({
            success: false,
            error: '선택하신 보험 상품은 현재 제공되지 않습니다.'
          });
        }

        const insurance = insuranceResult.rows[0];
        if (insurance.pricing_unit === 'hourly') {
          insuranceFee = Math.ceil(insurance.price * rentalHours);
        } else if (insurance.pricing_unit === 'daily') {
          insuranceFee = insurance.price * Math.ceil(rentalHours / 24);
        } else {
          // 'fixed' - 대여 기간과 상관없이 고정 금액
          insuranceFee = insurance.price;
        }
      }

      // 가격 계산 (일 단위 우선, 나머지는 시간 단위)
      let subtotal = 0;
      if (remainingHours === 0) {
        // 정확히 24시간 단위인 경우 (1일, 2일, 3일 등)
        subtotal = dailyRate * fullDays;
      } else {
        // 24시간 단위가 아닌 경우 (예: 1.5일, 2.3일 등)
        subtotal = (dailyRate * fullDays) + Math.ceil(hourlyRate * remainingHours);
      }

      const tax = Math.round(subtotal * 0.1);
      const total = subtotal + tax + insuranceFee;

      const bookingNumber = `RC${Date.now()}${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

      const result = await connection.execute(`
        INSERT INTO rentcar_bookings (
          booking_number, vendor_id, vehicle_id, user_id,
          customer_name, customer_email, customer_phone,
          pickup_location_id, dropoff_location_id,
          pickup_date, pickup_time, dropoff_date, dropoff_time,
          daily_rate_krw, rental_days, subtotal_krw, tax_krw, total_krw,
          insurance_id, insurance_fee_krw,
          special_requests, status, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')
      `, [
        bookingNumber, vendor_id, vehicle_id, user_id,
        customer_name, customer_email, customer_phone,
        pickup_location_id, dropoff_location_id,
        pickup_date, pickup_time, dropoff_date, dropoff_time,
        hourlyRate, Math.ceil(rentalHours), subtotal, tax, total,
        insurance_id || null, insuranceFee,
        special_requests || null
      ]);

      return res.status(200).json({
        success: true,
        data: { id: result.insertId, booking_number: bookingNumber },
        message: '예약이 생성되었습니다.'
      });
    }

    if (req.method === 'PUT') {
      // 예약 상태 업데이트 (결제 완료 후)
      const { booking_status, payment_status } = req.body;

      // URL에서 booking ID 추출 (/api/rentcar/bookings/123)
      const bookingId = req.url.split('/').pop().split('?')[0];

      if (!bookingId || bookingId === 'bookings') {
        return res.status(400).json({
          success: false,
          error: 'Booking ID is required'
        });
      }

      console.log('📝 [Booking Update] ID:', bookingId, 'Status:', booking_status, payment_status);

      // 예약 존재 확인
      const checkBooking = await connection.execute(
        'SELECT id, status, payment_status FROM rentcar_bookings WHERE id = ?',
        [bookingId]
      );

      if (!checkBooking.rows || checkBooking.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '예약을 찾을 수 없습니다.'
        });
      }

      // 상태 업데이트
      const updates = [];
      const values = [];

      if (booking_status) {
        updates.push('status = ?');
        values.push(booking_status);
      }

      if (payment_status) {
        updates.push('payment_status = ?');
        values.push(payment_status);
      }

      updates.push('updated_at = NOW()');
      values.push(bookingId);

      const updateQuery = `UPDATE rentcar_bookings SET ${updates.join(', ')} WHERE id = ?`;

      await connection.execute(updateQuery, values);

      console.log('✅ [Booking Update] 예약 상태 업데이트 완료:', bookingId);

      return res.status(200).json({
        success: true,
        message: '예약 상태가 업데이트되었습니다.'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });

  } catch (error) {
    console.error('Bookings API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
