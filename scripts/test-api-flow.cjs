const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function testAPIFlow() {
  try {
    console.log('═══════════════════════════════════════════════');
    console.log('4️⃣ API 흐름 시뮬레이션 테스트');
    console.log('═══════════════════════════════════════════════\n');

    // Step 1: Create JWT token (simulating user 47 login)
    const userId = 47;
    const token = jwt.sign(
      { userId: userId, email: 'rentcar.jeju.1762479826537@travleap.com', role: 'vendor' },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    );

    console.log('✅ Step 1: JWT 생성');
    console.log('   userId:', userId);
    console.log('');

    // Step 2: Decode JWT (simulating API receiving request)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    console.log('✅ Step 2: JWT 검증');
    console.log('   Decoded userId:', decoded.userId);
    console.log('');

    // Step 3: Query vendor_id from rentcar_vendors
    const db = connect({ url: process.env.DATABASE_URL });
    const vendorResult = await db.execute(
      'SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
      [decoded.userId]
    );

    console.log('✅ Step 3: Vendor ID 조회');
    console.log('   Query: SELECT id FROM rentcar_vendors WHERE user_id =', decoded.userId);
    console.log('   Result:', vendorResult.rows);

    if (vendorResult.rows.length === 0) {
      console.log('❌ PROBLEM: No vendor found for user_id', decoded.userId);
      process.exit(1);
    }

    const vendorId = vendorResult.rows[0].id;
    console.log('   vendor_id:', vendorId);
    console.log('');

    // Step 4: Query vehicles
    const vehiclesResult = await db.execute(
      `SELECT
        id, brand, model, display_name,
        CAST(stock AS SIGNED) as stock,
        CAST(stock AS SIGNED) AS current_stock
      FROM rentcar_vehicles
      WHERE vendor_id = ?
      ORDER BY id ASC`,
      [vendorId]
    );

    console.log('✅ Step 4: 차량 조회');
    console.log('   Query: SELECT ... FROM rentcar_vehicles WHERE vendor_id =', vendorId);
    console.log('   Found:', vehiclesResult.rows.length, 'vehicles');
    console.log('');

    // Step 5: Process vehicles (like API does)
    console.log('✅ Step 5: 차량 데이터 처리');
    const vehicles = vehiclesResult.rows.map(vehicle => {
      const stockValue = Number(vehicle.stock);
      console.log(`   [${vehicle.id}] ${vehicle.brand} ${vehicle.model}`);
      console.log(`       Raw stock: ${vehicle.stock} (type: ${typeof vehicle.stock})`);
      console.log(`       Number(stock): ${stockValue}`);
      console.log(`       Final: ${stockValue || 0}`);

      return {
        ...vehicle,
        stock: stockValue || 0,
        current_stock: Number(vehicle.current_stock) || stockValue || 0
      };
    });

    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('📊 최종 결과');
    console.log('═══════════════════════════════════════════════');
    console.log(JSON.stringify(vehicles, null, 2));

    console.log('\n✅ API 흐름 테스트 완료!');
    console.log('   모든 단계가 정상 작동합니다.');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  }

  process.exit(0);
}

testAPIFlow();
