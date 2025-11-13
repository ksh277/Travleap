require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkVendorType() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('🔍 렌트카 벤더 타입 확인 중...\n');

    // rentcar_vendors 스키마 확인
    console.log('1️⃣ rentcar_vendors 테이블 스키마:');
    const [schema] = await connection.execute(`DESCRIBE rentcar_vendors`);
    schema.forEach(col => {
      console.log(`   ${col.Field} (${col.Type})`);
    });

    // 렌트카 벤더 데이터 확인
    console.log('\n2️⃣ 렌트카 벤더 데이터:');
    const [vendors] = await connection.execute(`SELECT * FROM rentcar_vendors LIMIT 5`);
    vendors.forEach(v => {
      console.log(`   ID: ${v.id} | ${v.business_name || v.brand_name} | User ID: ${v.user_id}`);
    });

    // vendors 테이블도 확인 (일반 벤더)
    console.log('\n3️⃣ vendors 테이블 스키마:');
    try {
      const [vendorsSchema] = await connection.execute(`DESCRIBE vendors`);
      vendorsSchema.forEach(col => {
        console.log(`   ${col.Field} (${col.Type})`);
      });
    } catch (err) {
      console.log('   ⚠️ vendors 테이블 없음 또는 접근 불가');
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await connection.end();
  }
}

checkVendorType();
