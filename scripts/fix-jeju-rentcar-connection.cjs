require('dotenv').config();
const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

console.log('🔧 제주 렌터카 계정 연결 수정\n');

(async () => {
  const planetscale = connect({ url: process.env.DATABASE_URL });
  const neonPool = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL_NEON });

  try {
    // 1. Neon DB에서 user_id=1365 확인
    console.log('1️⃣ Neon DB - user_id=1365 확인');
    const oldUser = await neonPool.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [1365]
    );

    if (oldUser.rows && oldUser.rows.length > 0) {
      const u = oldUser.rows[0];
      console.log('   ⚠️ user_id=1365 계정 존재:');
      console.log('   이메일:', u.email);
      console.log('   이름:', u.name);
      console.log('   역할:', u.role);
    } else {
      console.log('   ℹ️ user_id=1365 계정 없음 (Neon DB에)');
    }

    // 2. Neon DB에서 제주 렌터카 계정 확인
    console.log('\n2️⃣ Neon DB - 제주 렌터카 계정');
    const newUser = await neonPool.query(
      'SELECT id, email, name, role FROM users WHERE email = $1',
      ['rentcar.jeju.1762479826537@travleap.com']
    );

    if (newUser.rows && newUser.rows.length > 0) {
      const u = newUser.rows[0];
      console.log('   ✅ 제주 렌터카 계정:');
      console.log('   user_id:', u.id);
      console.log('   이메일:', u.email);
      console.log('   이름:', u.name);
      console.log('   역할:', u.role);

      const correctUserId = u.id;

      // 3. PlanetScale - rentcar_vendors 업데이트
      console.log('\n3️⃣ PlanetScale - rentcar_vendors 업데이트');
      console.log('   현재: vendor_id=15, user_id=1365');
      console.log(`   변경: vendor_id=15, user_id=${correctUserId}`);

      const updateResult = await planetscale.execute(
        'UPDATE rentcar_vendors SET user_id = ? WHERE id = 15',
        [correctUserId]
      );

      console.log('   ✅ 업데이트 완료');

      // 4. 확인
      console.log('\n4️⃣ 업데이트 확인');
      const checkVendor = await planetscale.execute(
        'SELECT id, business_name, contact_email, user_id FROM rentcar_vendors WHERE id = 15'
      );

      if (checkVendor.rows && checkVendor.rows.length > 0) {
        const v = checkVendor.rows[0];
        console.log('   ✅ Vendor ID:', v.id);
        console.log('   ✅ 업체명:', v.business_name);
        console.log('   ✅ user_id:', v.user_id);
      }

      // 5. 차량 확인
      console.log('\n5️⃣ 차량 확인');
      const vehicles = await planetscale.execute(
        'SELECT id, vendor_id, display_name, daily_rate_krw FROM rentcar_vehicles WHERE vendor_id = 15'
      );

      if (vehicles.rows && vehicles.rows.length > 0) {
        console.log(`   ✅ 차량 ${vehicles.rows.length}개 확인`);
        vehicles.rows.forEach((vehicle, i) => {
          console.log(`   ${i + 1}. [${vehicle.id}] ${vehicle.display_name} - ₩${vehicle.daily_rate_krw.toLocaleString()}/일`);
        });
      } else {
        console.log('   ❌ 차량 없음');
      }

      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ 수정 완료!');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📝 로그인 정보:');
      console.log('   이메일: rentcar.jeju.1762479826537@travleap.com');
      console.log('   비밀번호: jeju1234!');
      console.log('   URL: https://travleap.vercel.app/login');
      console.log('\n🚗 이제 렌트카 벤더로 로그인하여 차량을 관리할 수 있습니다!');

    } else {
      console.log('   ❌ 제주 렌터카 계정을 찾을 수 없습니다.');
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error);
  } finally {
    await neonPool.end();
  }
})();
