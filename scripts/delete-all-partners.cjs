require('dotenv').config();
const mysql = require('mysql2/promise');

async function deleteAllPartners() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || 'aws.connect.psdb.cloud',
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME || 'travleap',
    ssl: { rejectUnauthorized: true }
  });

  console.log('🗑️  모든 파트너 삭제 중...\n');

  try {
    // 모든 파트너 삭제
    const [result] = await connection.execute('DELETE FROM partners');
    console.log(`✅ 파트너 삭제 완료\n`);

    console.log('='.repeat(60));
    console.log('✅ 모든 파트너가 삭제되었습니다');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ 오류:', error.message);
  } finally {
    await connection.end();
  }
}

deleteAllPartners();
