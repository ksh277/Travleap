const { connect } = require('@planetscale/database');

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
          v.brand, v.model, v.display_name, v.vehicle_class, v.thumbnail_url,
          ve.business_name as vendor_business_name, ve.brand_name as vendor_brand_name
        FROM rentcar_bookings b
        INNER JOIN rentcar_vehicles v ON b.vehicle_id = v.id
        INNER JOIN rentcar_vendors ve ON b.vendor_id = ve.id
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
        vehicle: {
          brand: row.brand,
          model: row.model,
          display_name: row.display_name,
          vehicle_class: row.vehicle_class,
          thumbnail_url: row.thumbnail_url
        },
        vendor: {
          business_name: row.vendor_business_name,
          brand_name: row.vendor_brand_name
        }
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
      const hourlyRate = vehicle.rows[0].hourly_rate_krw || Math.ceil(dailyRate / 24);

      // 픽업/반납 날짜와 시간을 조합하여 정확한 시간 계산
      const [pickupHour, pickupMinute] = (pickup_time || '00:00').split(':').map(Number);
      const [dropoffHour, dropoffMinute] = (dropoff_time || '23:59').split(':').map(Number);

      const pickupDateObj = new Date(pickup_date);
      pickupDateObj.setHours(pickupHour, pickupMinute, 0, 0);

      const dropoffDateObj = new Date(dropoff_date);
      dropoffDateObj.setHours(dropoffHour, dropoffMinute, 0, 0);

      const diffMs = dropoffDateObj.getTime() - pickupDateObj.getTime();
      const rentalHours = diffMs / (1000 * 60 * 60);

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

      // 시간 단위 가격 계산
      const subtotal = Math.ceil(hourlyRate * rentalHours);
      const tax = Math.round(subtotal * 0.1);
      const total = subtotal + tax;

      const bookingNumber = `RC${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      const result = await connection.execute(`
        INSERT INTO rentcar_bookings (
          booking_number, vendor_id, vehicle_id, user_id,
          customer_name, customer_email, customer_phone,
          pickup_location_id, dropoff_location_id,
          pickup_date, pickup_time, dropoff_date, dropoff_time,
          daily_rate_krw, rental_days, subtotal_krw, tax_krw, total_krw,
          special_requests, status, payment_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')
      `, [
        bookingNumber, vendor_id, vehicle_id, user_id,
        customer_name, customer_email, customer_phone,
        pickup_location_id, dropoff_location_id,
        pickup_date, pickup_time, dropoff_date, dropoff_time,
        hourlyRate, Math.ceil(rentalHours), subtotal, tax, total,
        special_requests || null
      ]);

      return res.status(200).json({
        success: true,
        data: { id: result.insertId, booking_number: bookingNumber },
        message: '예약이 생성되었습니다.'
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
