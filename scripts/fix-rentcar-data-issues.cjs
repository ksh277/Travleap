require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixRentcarDataIssues() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('🔧 렌트카 데이터 문제 수정 중...\n');

    // 1. 보험 데이터 확인
    console.log('1️⃣ 보험 데이터 확인...');
    const [insurances] = await connection.execute(`
      SELECT id, name, coverage_type
      FROM rentcar_insurance
      ORDER BY id
    `);

    console.log(`   ✅ 보험 ${insurances.length}건 존재:`);
    insurances.forEach(i => {
      console.log(`      ID: ${i.id} | ${i.name} (${i.coverage_type})`);
    });

    // 2. rentcar_booking_extras 테이블 생성
    console.log('\n2️⃣ rentcar_booking_extras 테이블 생성 시도...');

    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS rentcar_booking_extras (
          id INT AUTO_INCREMENT PRIMARY KEY,
          booking_id INT NOT NULL,
          extra_id INT NOT NULL,
          quantity INT DEFAULT 1,
          unit_price_krw DECIMAL(10, 2) DEFAULT 0,
          total_price_krw DECIMAL(10, 2) DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_booking_id (booking_id),
          INDEX idx_extra_id (extra_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('   ✅ rentcar_booking_extras 테이블 생성 완료');
    } catch (err) {
      console.log('   ⚠️  테이블 생성 실패:', err.message);
    }

    // 3. rentcar_extras 테이블 확인 및 샘플 데이터 추가
    console.log('\n3️⃣ rentcar_extras 테이블 확인...');

    try {
      const [extras] = await connection.execute(`
        SELECT id, name, category, price_krw
        FROM rentcar_extras
        ORDER BY id
        LIMIT 10
      `);

      if (extras.length === 0) {
        console.log('   ⚠️  extras 데이터가 없습니다. 샘플 데이터를 추가하시겠습니까?');
      } else {
        console.log(`   ✅ Extras ${extras.length}건 존재`);
        extras.forEach(e => {
          console.log(`      ID: ${e.id} | ${e.name} (${e.category}) - ₩${e.price_krw}`);
        });
      }
    } catch (err) {
      console.log('   ❌ rentcar_extras 테이블 조회 실패:', err.message);
    }

    // 4. 예약 데이터의 phone 필드 확인
    console.log('\n4️⃣ 예약 데이터 phone 필드 분석...');
    const [phoneCheck] = await connection.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN customer_phone IS NULL OR customer_phone = '' THEN 1 ELSE 0 END) as null_count,
        SUM(CASE WHEN customer_phone IS NOT NULL AND customer_phone != '' THEN 1 ELSE 0 END) as has_phone
      FROM rentcar_bookings
    `);

    console.log(`   총 예약: ${phoneCheck[0].total}건`);
    console.log(`   전화번호 NULL: ${phoneCheck[0].null_count}건`);
    console.log(`   전화번호 있음: ${phoneCheck[0].has_phone}건`);

    if (phoneCheck[0].null_count > 0) {
      console.log('   ⚠️  전화번호가 없는 예약이 있습니다. 예약 시 전화번호가 저장되지 않고 있습니다.');
    }

    console.log('\n✅ 분석 완료');

  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await connection.end();
  }
}

fixRentcarDataIssues();
