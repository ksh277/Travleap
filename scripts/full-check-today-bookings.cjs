require('dotenv').config();
const mysql = require('mysql2/promise');

async function fullCheckTodayBookings() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('1단계: DB에서 실제 예약 데이터 확인');
    console.log('═══════════════════════════════════════════════════════\n');

    // 최근 예약 확인
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
        rb.pickup_at_utc,
        rb.return_at_utc,
        rv.model as vehicle_model,
        ri.name as insurance_name
      FROM rentcar_bookings rb
      LEFT JOIN rentcar_vehicles rv ON rb.vehicle_id = rv.id
      LEFT JOIN rentcar_insurance ri ON rb.insurance_id = ri.id
      WHERE rb.status IN ('confirmed', 'in_progress')
      ORDER BY rb.created_at DESC
      LIMIT 5
    `);

    console.log('📋 최근 예약 5건:');
    console.log('─'.repeat(80));

    if (bookings.length === 0) {
      console.log('❌ 예약이 없습니다.\n');
      return;
    }

    bookings.forEach((b, idx) => {
      console.log(`\n[${idx + 1}] 예약번호: ${b.booking_number}`);
      console.log(`    차량: ${b.vehicle_model || 'NULL'}`);
      console.log(`    상태: ${b.status}`);
      console.log(`    픽업: ${b.pickup_at_utc}`);
      console.log(`    반납: ${b.return_at_utc}`);

      // 고객 정보 (암호화되어 있음)
      console.log(`    customer_name: ${b.customer_name ? (b.customer_name.length > 30 ? b.customer_name.substring(0, 30) + '...' : b.customer_name) : 'NULL'}`);
      console.log(`    customer_phone: ${b.customer_phone || 'NULL'}`);
      console.log(`    customer_email: ${b.customer_email ? (b.customer_email.length > 30 ? b.customer_email.substring(0, 30) + '...' : b.customer_email) : 'NULL'}`);

      // 운전자 정보
      console.log(`    driver_name: ${b.driver_name || 'NULL'}`);
      console.log(`    driver_license_no: ${b.driver_license_no || 'NULL'}`);
      console.log(`    driver_birth: ${b.driver_birth || 'NULL'}`);

      // 보험
      console.log(`    insurance_id: ${b.insurance_id || 'NULL'}`);
      console.log(`    insurance_name: ${b.insurance_name || 'NULL'}`);
      console.log(`    insurance_fee: ${b.insurance_fee_krw || 'NULL'}`);
    });

    // 첫 번째 예약의 extras 확인
    if (bookings.length > 0) {
      const firstBookingId = bookings[0].id;
      console.log('\n─'.repeat(80));
      console.log(`\n📦 예약 #${bookings[0].booking_number}의 옵션(extras) 확인:`);

      try {
        const [extras] = await connection.execute(`
          SELECT
            rbe.extra_id,
            rbe.quantity,
            rbe.unit_price_krw,
            rbe.total_price_krw,
            re.name as extra_name
          FROM rentcar_booking_extras rbe
          LEFT JOIN rentcar_extras re ON rbe.extra_id = re.id
          WHERE rbe.booking_id = ?
        `, [firstBookingId]);

        if (extras.length === 0) {
          console.log('    ⚠️  옵션 없음 (선택하지 않았거나 데이터 없음)');
        } else {
          extras.forEach(e => {
            console.log(`    - ${e.extra_name} x${e.quantity} (단가: ₩${e.unit_price_krw}, 합계: ₩${e.total_price_krw})`);
          });
        }
      } catch (err) {
        console.log(`    ❌ extras 조회 실패: ${err.message}`);
      }
    }

    // 복호화 테스트
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('2단계: 복호화 테스트');
    console.log('═══════════════════════════════════════════════════════\n');

    const { decrypt, decryptPhone, decryptEmail } = require('../utils/encryption.cjs');
    const firstBooking = bookings[0];

    try {
      const decryptedName = firstBooking.customer_name ? decrypt(firstBooking.customer_name) : null;
      const decryptedPhone = firstBooking.customer_phone ? decryptPhone(firstBooking.customer_phone) : null;
      const decryptedEmail = firstBooking.customer_email ? decryptEmail(firstBooking.customer_email) : null;

      console.log('✅ 복호화 성공:');
      console.log(`    고객명: ${decryptedName || 'NULL'}`);
      console.log(`    전화번호: ${decryptedPhone || 'NULL'}`);
      console.log(`    이메일: ${decryptedEmail || 'NULL'}`);
    } catch (err) {
      console.log(`❌ 복호화 실패: ${err.message}`);
    }

    console.log('\n✅ DB 확인 완료\n');

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await connection.end();
  }
}

fullCheckTodayBookings();
