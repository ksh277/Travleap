require('dotenv').config();
const mysql = require('mysql2/promise');
const { decrypt, decryptPhone, decryptEmail } = require('../utils/encryption.cjs');

async function debugVendorDashboard() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('벤더 대시보드 디버깅');
    console.log('═══════════════════════════════════════════════════════\n');

    // 1. 최근 예약 확인 (상태: confirmed)
    console.log('1️⃣ 최근 confirmed 예약:');
    const [bookings] = await connection.execute(`
      SELECT
        b.id,
        b.booking_number,
        b.vendor_id,
        b.vehicle_id,
        b.customer_name,
        b.customer_phone,
        b.customer_email,
        b.driver_name,
        b.driver_birth,
        b.driver_license_no,
        b.insurance_id,
        b.insurance_fee_krw,
        b.status,
        b.payment_status,
        v.display_name as vehicle_model,
        i.name as insurance_name
      FROM rentcar_bookings b
      LEFT JOIN rentcar_vehicles v ON b.vehicle_id = v.id
      LEFT JOIN rentcar_insurance i ON b.insurance_id = i.id
      WHERE b.status = 'confirmed' OR b.status = 'picked_up'
      ORDER BY b.created_at DESC
      LIMIT 5
    `);

    console.log(`   총 ${bookings.length}건\n`);

    if (bookings.length === 0) {
      console.log('   ❌ confirmed/picked_up 상태의 예약이 없습니다.\n');
      return;
    }

    for (const booking of bookings) {
      console.log(`─────────────────────────────────────────────────`);
      console.log(`예약번호: ${booking.booking_number}`);
      console.log(`차량: ${booking.vehicle_model || 'NULL'}`);
      console.log(`상태: ${booking.status} / 결제: ${booking.payment_status}`);

      // 고객 정보 복호화
      try {
        const customerName = booking.customer_name ? decrypt(booking.customer_name) : null;
        const customerPhone = booking.customer_phone ? decryptPhone(booking.customer_phone) : null;
        const customerEmail = booking.customer_email ? decryptEmail(booking.customer_email) : null;
        const driverName = booking.driver_name ? decrypt(booking.driver_name) : null;
        const driverLicenseNo = booking.driver_license_no ? decrypt(booking.driver_license_no) : null;

        console.log(`\n고객 정보:`);
        console.log(`   이름: ${customerName || 'NULL'}`);
        console.log(`   전화: ${customerPhone || 'NULL'}`);
        console.log(`   이메일: ${customerEmail || 'NULL'}`);

        console.log(`\n운전자 정보:`);
        console.log(`   이름: ${driverName || 'NULL'}`);
        console.log(`   생년월일: ${booking.driver_birth || 'NULL'}`);
        console.log(`   면허번호: ${driverLicenseNo || 'NULL'}`);

      } catch (err) {
        console.log(`   ❌ 복호화 실패: ${err.message}`);
      }

      // 보험 정보
      console.log(`\n보험 정보:`);
      console.log(`   insurance_id: ${booking.insurance_id || 'NULL'}`);
      console.log(`   insurance_name: ${booking.insurance_name || 'NULL'}`);
      console.log(`   insurance_fee: ₩${booking.insurance_fee_krw ? booking.insurance_fee_krw.toLocaleString() : 'NULL'}`);

      // extras 조회
      console.log(`\n옵션 정보:`);
      try {
        const [extras] = await connection.execute(`
          SELECT
            rbe.booking_id,
            rbe.extra_id,
            rbe.quantity,
            rbe.unit_price_krw,
            rbe.total_price_krw,
            re.name as extra_name
          FROM rentcar_booking_extras rbe
          LEFT JOIN rentcar_extras re ON rbe.extra_id = re.id
          WHERE rbe.booking_id = ?
        `, [booking.id]);

        if (extras.length === 0) {
          console.log(`   (옵션 없음)`);
        } else {
          extras.forEach(e => {
            console.log(`   - ${e.extra_name} x${e.quantity} (₩${e.unit_price_krw?.toLocaleString()} → ₩${e.total_price_krw?.toLocaleString()})`);
          });
        }
      } catch (err) {
        console.log(`   ❌ extras 조회 실패: ${err.message}`);
      }

      console.log('');
    }

    // 2. 전체 통계
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('2️⃣ 데이터 통계:');
    console.log('═══════════════════════════════════════════════════════\n');

    const [stats] = await connection.execute(`
      SELECT
        COUNT(*) as total_bookings,
        SUM(CASE WHEN customer_phone IS NOT NULL THEN 1 ELSE 0 END) as has_phone,
        SUM(CASE WHEN insurance_id IS NOT NULL THEN 1 ELSE 0 END) as has_insurance,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid
      FROM rentcar_bookings
    `);

    const stat = stats[0];
    console.log(`총 예약: ${stat.total_bookings}건`);
    console.log(`전화번호 있음: ${stat.has_phone}건 (${Math.round(stat.has_phone / stat.total_bookings * 100)}%)`);
    console.log(`보험 선택: ${stat.has_insurance}건 (${Math.round(stat.has_insurance / stat.total_bookings * 100)}%)`);
    console.log(`confirmed 상태: ${stat.confirmed}건`);
    console.log(`결제 완료: ${stat.paid}건`);

    console.log('\n✅ 디버깅 완료\n');

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

debugVendorDashboard();
