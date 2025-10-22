require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkPartners() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || 'aws.connect.psdb.cloud',
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME || 'travleap',
    ssl: { rejectUnauthorized: true }
  });

  console.log('🔍 현재 파트너 목록 확인 중...\n');

  try {
    const [partners] = await connection.execute(
      'SELECT id, business_name, business_address, lat, lng, services FROM partners ORDER BY id'
    );

    console.log(`📊 총 ${partners.length}개 파트너 발견\n`);
    console.log('='.repeat(80));

    partners.forEach((partner, index) => {
      console.log(`${index + 1}. ${partner.business_name}`);
      console.log(`   ID: ${partner.id}`);
      console.log(`   주소: ${partner.business_address || '없음'}`);
      console.log(`   좌표: ${partner.lat}, ${partner.lng}`);
      console.log(`   서비스: ${partner.services}`);
      console.log('-'.repeat(80));
    });

    console.log('\n='.repeat(80));
    console.log(`✅ 총 ${partners.length}개 파트너`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await connection.end();
  }
}

checkPartners();
