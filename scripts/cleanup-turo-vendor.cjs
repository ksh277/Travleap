const mysql = require('mysql2/promise');
require('dotenv').config();

async function cleanup() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST || 'aws.connect.psdb.cloud',
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME || 'travleap',
      ssl: { rejectUnauthorized: true }
    });
    
    console.log('🗑️  Turo 벤더 데이터 삭제 중...');
    
    // 차량 삭제 (vendor_id = 5)
    await connection.execute(`DELETE FROM rentcar_vehicles WHERE vendor_id = 5`);
    console.log('✅ 차량 데이터 삭제 완료');
    
    // 벤더 삭제
    await connection.execute(`DELETE FROM rentcar_vendors WHERE id = 5`);
    console.log('✅ 벤더 데이터 삭제 완료');
    
  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    if (connection) await connection.end();
  }
}

cleanup();
