require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkInsuranceTables() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('🔍 보험 테이블 확인 중...\n');

    // rentcar_insurance 테이블
    console.log('1️⃣ rentcar_insurance 테이블:');
    const [insurance] = await connection.execute(`SELECT * FROM rentcar_insurance LIMIT 10`);
    console.log(`   총 ${insurance.length}건`);
    insurance.forEach(i => {
      console.log(`   ID: ${i.id} | ${i.name} | hourly_rate: ₩${i.hourly_rate_krw || 'NULL'}`);
    });

    // rentcar_insurance_plans 테이블
    console.log('\n2️⃣ rentcar_insurance_plans 테이블:');
    try {
      const [plans] = await connection.execute(`SELECT * FROM rentcar_insurance_plans LIMIT 10`);
      console.log(`   총 ${plans.length}건`);
      plans.forEach(p => {
        console.log(`   ID: ${p.id} | ${p.name || 'NULL'} | daily_price: ₩${p.daily_price_krw || 'NULL'}`);
      });
    } catch (err) {
      console.log(`   ❌ 테이블 조회 실패: ${err.message}`);
    }

    console.log('\n✅ 확인 완료');

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await connection.end();
  }
}

checkInsuranceTables();
