require('dotenv').config();
const { connect } = require('@planetscale/database');
const { decrypt, decryptPhone, decryptEmail } = require('../utils/encryption.cjs');

async function testTodayAPI() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('Today Bookings API 시뮬레이션 (예약 #19)');
    console.log('═══════════════════════════════════════════════════════\n');

    // API와 동일한 쿼리 실행
    const vendorId = 1; // 예시
    const startDateStr = '2025-11-15';
    const endDateStr = '2025-11-15';

    const result = await connection.execute(
      `SELECT
        b.id,
        b.booking_number,
        b.vendor_id,
        b.vehicle_id,
        b.user_id,
        b.pickup_date,
        b.pickup_time,
        b.dropoff_date,
        b.dropoff_time,
        b.total_krw,
        b.insurance_id,
        b.insurance_fee_krw,
        b.customer_name,
        b.customer_phone,
        b.customer_email,
        b.driver_name,
        b.driver_birth,
        b.driver_license_no,
        b.status,
        b.payment_status,
        b.voucher_code,
        b.pickup_checked_in_at,
        b.return_checked_out_at,
        b.pickup_vehicle_condition,
        b.return_vehicle_condition,
        b.late_return_hours,
        b.late_return_fee_krw,
        b.created_at,
        v.display_name as vehicle_model,
        v.vehicle_code,
        v.thumbnail_url as vehicle_image,
        i.name as insurance_name,
        i.hourly_rate_krw as insurance_hourly_rate
      FROM rentcar_bookings b
      LEFT JOIN rentcar_vehicles v ON b.vehicle_id = v.id
      LEFT JOIN rentcar_insurance i ON b.insurance_id = i.id
      WHERE b.id = 19
        AND b.payment_status = 'paid'`
    );

    console.log('📊 SQL 조회 결과:');
    console.log(`   ${result.rows.length}건 조회\n`);

    if (result.rows.length === 0) {
      console.log('❌ 조회 결과 없음\n');
      return;
    }

    const row = result.rows[0];

    // 안전한 복호화
    const safeDecrypt = (value) => {
      if (!value) return null;
      try {
        if (typeof value === 'string' && value.length > 50) {
          return decrypt(value);
        }
        return value;
      } catch (err) {
        return value;
      }
    };

    const safeDecryptPhone = (value) => {
      if (!value) return null;
      try {
        if (typeof value === 'string' && value.length > 50) {
          return decryptPhone(value);
        }
        return value;
      } catch (err) {
        return value;
      }
    };

    const safeDecryptEmail = (value) => {
      if (!value) return null;
      try {
        if (typeof value === 'string' && value.length > 50) {
          return decryptEmail(value);
        }
        return value;
      } catch (err) {
        return value;
      }
    };

    // Booking 객체 생성
    const booking = {
      id: row.id,
      booking_number: row.booking_number,
      status: row.status,
      vehicle_id: row.vehicle_id,
      vehicle_model: row.vehicle_model,
      vehicle_code: row.vehicle_code,
      vehicle_image: row.vehicle_image,
      customer_name: safeDecrypt(row.customer_name),
      customer_phone: safeDecryptPhone(row.customer_phone),
      customer_email: safeDecryptEmail(row.customer_email),
      driver_name: safeDecrypt(row.driver_name),
      driver_birth: row.driver_birth,
      driver_license_no: safeDecrypt(row.driver_license_no),
      pickup_date: row.pickup_date,
      pickup_time: row.pickup_time,
      dropoff_date: row.dropoff_date,
      dropoff_time: row.dropoff_time,
      pickup_at_utc: `${row.pickup_date}T${row.pickup_time || '09:00:00'}Z`,
      return_at_utc: `${row.dropoff_date}T${row.dropoff_time || '18:00:00'}Z`,
      actual_pickup_at: row.pickup_checked_in_at,
      actual_return_at_utc: row.return_checked_out_at,
      pickup_location: '제주공항',
      total_price_krw: parseInt(row.total_krw) || 0,
      insurance_name: row.insurance_name,
      insurance_fee: parseInt(row.insurance_fee_krw) || 0,
      late_return_hours: row.late_return_hours,
      late_return_fee_krw: parseInt(row.late_return_fee_krw) || 0,
      voucher_code: row.voucher_code,
      check_in_at: row.pickup_checked_in_at,
      check_out_at: row.return_checked_out_at,
      payment_status: row.payment_status
    };

    console.log('📦 Booking 객체 (extras 제외):');
    console.log(JSON.stringify(booking, null, 2));

    // Extras 조회
    console.log('\n\n🔍 Extras 조회:');
    const extrasResult = await connection.execute(
      `SELECT
        rbe.booking_id,
        rbe.extra_id,
        rbe.quantity,
        rbe.unit_price_krw,
        rbe.total_price_krw,
        re.name as extra_name,
        re.category,
        re.price_type
      FROM rentcar_booking_extras rbe
      LEFT JOIN rentcar_extras re ON rbe.extra_id = re.id
      WHERE rbe.booking_id = 19`
    );

    console.log(`   ${extrasResult.rows.length}개 조회\n`);

    const bookingExtras = (extrasResult.rows || []).map(e => ({
      extra_id: e.extra_id,
      name: e.extra_name || '(삭제된 옵션)',
      category: e.category,
      price_type: e.price_type,
      quantity: e.quantity,
      unit_price: Number(e.unit_price_krw || 0),
      total_price: Number(e.total_price_krw || 0)
    }));

    console.log('📦 Extras 배열:');
    console.log(JSON.stringify(bookingExtras, null, 2));

    // 최종 응답
    const finalBooking = {
      ...booking,
      extras: bookingExtras,
      extras_count: bookingExtras.length,
      extras_total: bookingExtras.reduce((sum, e) => sum + e.total_price, 0)
    };

    console.log('\n\n✅ 최종 API 응답:');
    console.log(JSON.stringify({
      success: true,
      data: [finalBooking]
    }, null, 2));

    console.log('\n✅ 테스트 완료\n');

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error.stack);
  }
}

testTodayAPI();
