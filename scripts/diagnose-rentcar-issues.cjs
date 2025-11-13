require('dotenv').config();
const mysql = require('mysql2/promise');

async function diagnoseRentcarIssues() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('🔍 렌트카 데이터 문제 진단 중...\n');

    // 1. 테이블 목록 확인
    console.log('1️⃣ Rentcar 테이블 목록:');
    const [tables] = await connection.execute(`SHOW TABLES LIKE 'rentcar%'`);
    tables.forEach(t => {
      console.log(`   ✅ ${Object.values(t)[0]}`);
    });

    // 2. 보험 데이터 확인
    console.log('\n2️⃣ 보험 데이터 확인:');
    const [insurances] = await connection.execute(`SELECT * FROM rentcar_insurance ORDER BY id LIMIT 10`);
    console.log(`   총 ${insurances.length}건`);
    insurances.forEach(i => {
      const name = i.name || 'NULL';
      console.log(`   ID: ${i.id} | ${name}`);
    });

    // 3. 예약의 보험 ID 확인
    console.log('\n3️⃣ 예약에 사용된 보험 ID:');
    const [usedInsurance] = await connection.execute(`
      SELECT DISTINCT insurance_id, COUNT(*) as count
      FROM rentcar_bookings
      WHERE insurance_id IS NOT NULL
      GROUP BY insurance_id
      ORDER BY insurance_id
    `);
    usedInsurance.forEach(u => {
      console.log(`   보험 ID: ${u.insurance_id} (${u.count}건)`);
    });

    // 4. 예약 데이터 상세 (최근 1건)
    console.log('\n4️⃣ 최근 예약 1건 상세:');
    const [recentBooking] = await connection.execute(`
      SELECT * FROM rentcar_bookings
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (recentBooking.length > 0) {
      const b = recentBooking[0];
      console.log(`   예약번호: ${b.booking_number}`);
      console.log(`   customer_name: ${b.customer_name ? b.customer_name.substring(0, 30) + '...' : 'NULL'}`);
      console.log(`   customer_phone: ${b.customer_phone || 'NULL'}`);
      console.log(`   customer_email: ${b.customer_email ? b.customer_email.substring(0, 30) + '...' : 'NULL'}`);
      console.log(`   insurance_id: ${b.insurance_id || 'NULL'}`);
      console.log(`   status: ${b.status}`);
    }

    // 5. extras 테이블 존재 여부
    console.log('\n5️⃣ Extras 관련 테이블:');
    try {
      const [extrasCount] = await connection.execute(`SELECT COUNT(*) as cnt FROM rentcar_extras`);
      console.log(`   ✅ rentcar_extras: ${extrasCount[0].cnt}건`);
    } catch (err) {
      console.log(`   ❌ rentcar_extras: ${err.message}`);
    }

    try {
      const [bookingExtrasCount] = await connection.execute(`SELECT COUNT(*) as cnt FROM rentcar_booking_extras`);
      console.log(`   ✅ rentcar_booking_extras: ${bookingExtrasCount[0].cnt}건`);
    } catch (err) {
      console.log(`   ❌ rentcar_booking_extras: 테이블 없음`);
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await connection.end();
  }
}

diagnoseRentcarIssues();
