require('dotenv').config();
const mysql = require('mysql2/promise');

async function updateRentcarStock() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('🔄 렌트카 차량 재고를 10대로 업데이트합니다...\n');

    // 모든 차량의 stock을 10으로 업데이트
    const [result] = await connection.execute(`
      UPDATE rentcar_vehicles
      SET stock = 10
      WHERE stock IS NULL OR stock < 10
    `);

    console.log(`✅ ${result.affectedRows}개 차량의 재고가 10대로 업데이트되었습니다.\n`);

    // 업데이트된 차량 목록 확인
    const [vehicles] = await connection.execute(`
      SELECT id, vendor_id, display_name, stock
      FROM rentcar_vehicles
      ORDER BY id
    `);

    console.log('📋 현재 차량 재고 현황:');
    vehicles.forEach(vehicle => {
      console.log(`  - ${vehicle.display_name}: ${vehicle.stock}대`);
    });

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  } finally {
    await connection.end();
  }
}

updateRentcarStock();
