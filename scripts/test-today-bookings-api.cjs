require('dotenv').config();
const mysql = require('mysql2/promise');

async function testTodayBookingsAPI() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('🔍 오늘 예약 데이터 확인 중...\n');

    // 1. 최근 예약 데이터 확인
    const [bookings] = await connection.execute(`
      SELECT
        rb.id,
        rb.booking_number,
        rb.status,
        rb.customer_name,
        rb.customer_phone,
        rb.customer_email,
        rb.driver_name,
        rb.driver_license_no,
        rb.driver_birth,
        rb.insurance_id,
        rb.insurance_fee_krw,
        rv.model as vehicle_model,
        ri.name as insurance_name,
        rb.created_at
      FROM rentcar_bookings rb
      LEFT JOIN rentcar_vehicles rv ON rb.vehicle_id = rv.id
      LEFT JOIN rentcar_insurance ri ON rb.insurance_id = ri.id
      ORDER BY rb.created_at DESC
      LIMIT 5
    `);

    console.log('📋 최근 예약 5건:');
    console.log('='.repeat(80));

    if (bookings.length === 0) {
      console.log('❌ 예약 데이터가 없습니다.');
    } else {
      bookings.forEach(b => {
        console.log(`예약번호: ${b.booking_number}`);
        console.log(`차량: ${b.vehicle_model}`);
        console.log(`고객명 (암호화): ${b.customer_name ? b.customer_name.substring(0, 20) + '...' : 'NULL'}`);
        console.log(`전화번호 (암호화): ${b.customer_phone ? b.customer_phone.substring(0, 20) + '...' : 'NULL'}`);
        console.log(`이메일 (암호화): ${b.customer_email ? b.customer_email.substring(0, 20) + '...' : 'NULL'}`);
        console.log(`보험: ${b.insurance_name || 'NULL'} (ID: ${b.insurance_id || 'NULL'})`);
        console.log(`상태: ${b.status}`);
        console.log('-'.repeat(80));
      });

      // 2. 복호화 테스트
      console.log('\n🔓 복호화 테스트 중...\n');
      const { decrypt, decryptPhone, decryptEmail } = require('../utils/encryption.cjs');

      const firstBooking = bookings[0];
      try {
        const decryptedName = firstBooking.customer_name ? decrypt(firstBooking.customer_name) : null;
        const decryptedPhone = firstBooking.customer_phone ? decryptPhone(firstBooking.customer_phone) : null;
        const decryptedEmail = firstBooking.customer_email ? decryptEmail(firstBooking.customer_email) : null;

        console.log('✅ 복호화 성공:');
        console.log(`고객명: ${decryptedName}`);
        console.log(`전화번호: ${decryptedPhone}`);
        console.log(`이메일: ${decryptedEmail}`);
      } catch (err) {
        console.error('❌ 복호화 실패:', err.message);
      }
    }

    // 3. extras 데이터 확인
    console.log('\n📦 Extras (옵션) 데이터 확인...\n');

    const [extras] = await connection.execute(`
      SELECT
        rbe.booking_id,
        rbe.extra_id,
        rbe.quantity,
        rbe.unit_price_krw,
        rbe.total_price_krw,
        re.name as extra_name,
        rb.booking_number
      FROM rentcar_booking_extras rbe
      LEFT JOIN rentcar_extras re ON rbe.extra_id = re.id
      LEFT JOIN rentcar_bookings rb ON rbe.booking_id = rb.id
      ORDER BY rbe.booking_id DESC
      LIMIT 10
    `);

    if (extras.length === 0) {
      console.log('⚠️  extras 데이터가 없습니다 (선택 사항이므로 정상일 수 있음)');
    } else {
      console.log(`✅ Extras 데이터 ${extras.length}건 발견:`);
      extras.forEach(e => {
        console.log(`  예약: ${e.booking_number} | 옵션: ${e.extra_name} x${e.quantity} | ₩${e.unit_price_krw}`);
      });
    }

  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await connection.end();
  }
}

testTodayBookingsAPI();
