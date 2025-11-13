require('dotenv').config();
const mysql = require('mysql2/promise');
const { decrypt, decryptPhone, decryptEmail } = require('../utils/encryption.cjs');

async function checkBooking19() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('예약 #19 완전 분석');
    console.log('═══════════════════════════════════════════════════════\n');

    // 1. DB에서 예약 #19 조회
    const [bookings] = await connection.execute(`
      SELECT
        b.*,
        v.display_name as vehicle_model,
        i.name as insurance_name,
        i.hourly_rate_krw as insurance_hourly_rate
      FROM rentcar_bookings b
      LEFT JOIN rentcar_vehicles v ON b.vehicle_id = v.id
      LEFT JOIN rentcar_insurance i ON b.insurance_id = i.id
      WHERE b.id = 19
    `);

    if (bookings.length === 0) {
      console.log('❌ 예약 #19를 찾을 수 없습니다.\n');
      return;
    }

    const booking = bookings[0];

    console.log('📋 DB 원본 데이터:');
    console.log('─'.repeat(80));
    console.log('id:', booking.id);
    console.log('booking_number:', booking.booking_number);
    console.log('vehicle_id:', booking.vehicle_id);
    console.log('vehicle_model:', booking.vehicle_model);
    console.log('status:', booking.status);
    console.log('payment_status:', booking.payment_status);
    console.log('\n고객 정보 (DB 저장값):');
    console.log('customer_name:', booking.customer_name ? booking.customer_name.substring(0, 50) : 'NULL');
    console.log('customer_phone:', booking.customer_phone || 'NULL');
    console.log('customer_email:', booking.customer_email ? booking.customer_email.substring(0, 50) : 'NULL');
    console.log('\n운전자 정보 (DB 저장값):');
    console.log('driver_name:', booking.driver_name || 'NULL');
    console.log('driver_birth:', booking.driver_birth || 'NULL');
    console.log('driver_license_no:', booking.driver_license_no || 'NULL');
    console.log('\n보험 정보:');
    console.log('insurance_id:', booking.insurance_id || 'NULL');
    console.log('insurance_name (JOIN):', booking.insurance_name || 'NULL');
    console.log('insurance_fee_krw:', booking.insurance_fee_krw || 'NULL');
    console.log('\n기타:');
    console.log('total_krw:', booking.total_krw || 'NULL');
    console.log('pickup_date:', booking.pickup_date || 'NULL');
    console.log('dropoff_date:', booking.dropoff_date || 'NULL');

    // 2. 안전한 복호화 시도
    console.log('\n\n🔓 복호화 시도:');
    console.log('─'.repeat(80));

    const safeDecrypt = (value, fieldName) => {
      if (!value) {
        console.log(`${fieldName}: NULL`);
        return null;
      }
      try {
        if (typeof value === 'string' && value.length > 50) {
          const decrypted = decrypt(value);
          console.log(`${fieldName}: "${decrypted}" (복호화됨)`);
          return decrypted;
        } else {
          console.log(`${fieldName}: "${value}" (평문)`);
          return value;
        }
      } catch (err) {
        console.log(`${fieldName}: 복호화 실패 - ${err.message}`);
        return value;
      }
    };

    const safeDecryptPhone = (value) => {
      if (!value) {
        console.log('customer_phone: NULL');
        return null;
      }
      try {
        if (typeof value === 'string' && value.length > 50) {
          const decrypted = decryptPhone(value);
          console.log(`customer_phone: "${decrypted}" (복호화됨)`);
          return decrypted;
        } else {
          console.log(`customer_phone: "${value}" (평문)`);
          return value;
        }
      } catch (err) {
        console.log(`customer_phone: 복호화 실패 - ${err.message}`);
        return value;
      }
    };

    const customerName = safeDecrypt(booking.customer_name, 'customer_name');
    const customerPhone = safeDecryptPhone(booking.customer_phone);
    const driverName = safeDecrypt(booking.driver_name, 'driver_name');

    // 3. extras 조회
    console.log('\n\n📦 옵션 정보:');
    console.log('─'.repeat(80));
    try {
      const [extras] = await connection.execute(`
        SELECT
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
        WHERE rbe.booking_id = ?
      `, [19]);

      if (extras.length === 0) {
        console.log('(옵션 선택 없음)');
      } else {
        extras.forEach(e => {
          console.log(`- ${e.extra_name} x${e.quantity} (${e.price_type})`);
          console.log(`  단가: ₩${e.unit_price_krw?.toLocaleString()}`);
          console.log(`  합계: ₩${e.total_price_krw?.toLocaleString()}`);
        });
      }
    } catch (err) {
      console.log(`❌ extras 조회 실패: ${err.message}`);
    }

    // 4. API 응답 시뮬레이션
    console.log('\n\n🔄 API 응답 시뮬레이션 (pages/api/rentcar/bookings/today.js):');
    console.log('─'.repeat(80));
    const apiResponse = {
      id: booking.id,
      booking_number: booking.booking_number,
      status: booking.status,
      vehicle_model: booking.vehicle_model,
      customer_name: customerName,
      customer_phone: customerPhone,
      driver_name: driverName,
      driver_birth: booking.driver_birth,
      driver_license_no: booking.driver_license_no,
      insurance_name: booking.insurance_name,
      insurance_fee: booking.insurance_fee_krw,
      total_price_krw: booking.total_krw,
      pickup_at_utc: `${booking.pickup_date}T${booking.pickup_time || '09:00:00'}Z`,
      return_at_utc: `${booking.dropoff_date}T${booking.dropoff_time || '18:00:00'}Z`
    };

    console.log(JSON.stringify(apiResponse, null, 2));

    console.log('\n✅ 분석 완료\n');

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

checkBooking19();
