require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkVehicleStock() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('🔍 렌트카 차량 재고 확인 중...\n');

    const [vehicles] = await connection.execute(`
      SELECT id, vendor_id, display_name, stock, is_active
      FROM rentcar_vehicles
      ORDER BY id DESC
      LIMIT 30
    `);

    console.log('📋 차량 재고 현황:');
    console.log('='.repeat(80));
    vehicles.forEach(v => {
      console.log(`ID: ${v.id} | ${v.display_name} | 재고: ${v.stock} | 상태: ${v.is_active ? '활성' : '비활성'}`);
    });
    console.log('='.repeat(80));
    console.log(`\n총 ${vehicles.length}개 차량 조회됨`);

  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    await connection.end();
  }
}

checkVehicleStock();
