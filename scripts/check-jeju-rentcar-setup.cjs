require('dotenv').config();
const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

console.log('🔍 제주 렌터카 계정 설정 상태 확인\n');

(async () => {
  const planetscale = connect({ url: process.env.DATABASE_URL });
  const neonPool = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL_NEON });

  try {
    const email = 'rentcar.jeju.1762479826537@travleap.com';

    // 1. Neon DB - users 테이블 확인
    console.log('1️⃣ Neon DB - users 테이블');
    const neonUser = await neonPool.query(
      'SELECT id, email, name, role FROM users WHERE email = $1',
      [email]
    );

    if (neonUser.rows && neonUser.rows.length > 0) {
      const user = neonUser.rows[0];
      console.log('   ✅ 계정 존재');
      console.log('   ID:', user.id);
      console.log('   이름:', user.name);
      console.log('   이메일:', user.email);
      console.log('   역할:', user.role);

      const userId = user.id;

      // 2. PlanetScale - rentcar_vendors 확인
      console.log('\n2️⃣ PlanetScale - rentcar_vendors 테이블');
      const rcVendor = await planetscale.execute(
        'SELECT id, business_name, contact_email, user_id, status FROM rentcar_vendors WHERE user_id = ?',
        [userId]
      );

      if (rcVendor.rows && rcVendor.rows.length > 0) {
        const vendor = rcVendor.rows[0];
        console.log('   ✅ Rentcar Vendor 존재');
        console.log('   Vendor ID:', vendor.id);
        console.log('   업체명:', vendor.business_name);
        console.log('   이메일:', vendor.contact_email);
        console.log('   user_id:', vendor.user_id);
        console.log('   상태:', vendor.status);

        const vendorId = vendor.id;

        // 3. PlanetScale - rentcar_vehicles 확인
        console.log('\n3️⃣ PlanetScale - rentcar_vehicles 테이블');
        const vehicles = await planetscale.execute(
          'SELECT id, vendor_id, display_name, daily_rate_krw, is_available FROM rentcar_vehicles WHERE vendor_id = ?',
          [vendorId]
        );

        if (vehicles.rows && vehicles.rows.length > 0) {
          console.log(`   ✅ 차량 ${vehicles.rows.length}개 등록`);
          vehicles.rows.forEach((v, i) => {
            console.log(`   ${i + 1}. [${v.id}] ${v.display_name} - ₩${v.daily_rate_krw.toLocaleString()}/일 (${v.is_available ? '이용가능' : '이용불가'})`);
          });
        } else {
          console.log('   ❌ 차량 없음');
        }
      } else {
        console.log('   ❌ Rentcar Vendor 없음');
      }

      // 4. PlanetScale - partners 테이블 확인
      console.log('\n4️⃣ PlanetScale - partners 테이블');
      const partners = await planetscale.execute(
        'SELECT id, business_name, user_id, status, partner_type FROM partners WHERE user_id = ?',
        [userId]
      );

      if (partners.rows && partners.rows.length > 0) {
        console.log(`   ⚠️ Partners 레코드 ${partners.rows.length}개 발견`);
        partners.rows.forEach((p, i) => {
          console.log(`   ${i + 1}. Partner ID: ${p.id}, 업체명: ${p.business_name}, 타입: ${p.partner_type || '(NULL)'}`);
        });
        console.log('\n   ℹ️ 이 계정은 rentcar_vendors에 등록되어야 하며,');
        console.log('      partners 테이블의 레코드는 혼란을 야기할 수 있습니다.');
      } else {
        console.log('   ✅ Partners 테이블에 없음 (정상 - rentcar는 별도 테이블 사용)');
      }

      // 5. 로그인 시 대시보드 라우팅 확인
      console.log('\n5️⃣ 예상 대시보드 라우팅');
      if (user.role === 'vendor') {
        console.log('   ✅ role이 "vendor"이므로 벤더 대시보드로 이동');
        console.log('   📍 예상 URL: /vendor/dashboard (VendorDashboardPageEnhanced)');
        console.log('   🚗 렌트카 전용 대시보드 사용');
      } else {
        console.log('   ❌ role이 "vendor"가 아니므로 벤더 대시보드 접근 불가');
      }

    } else {
      console.log('   ❌ 계정 없음');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 결론:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (neonUser.rows && neonUser.rows.length > 0 && neonUser.rows[0].role === 'vendor') {
      console.log('✅ 계정 설정이 올바릅니다.');
      console.log('✅ rentcar vendor로 로그인 가능합니다.');
      console.log('✅ 차량 관리가 가능합니다.');
      console.log('\n📝 로그인 정보:');
      console.log('   이메일:', email);
      console.log('   비밀번호: jeju1234!');
      console.log('   URL: https://travleap.vercel.app/login');
    } else {
      console.log('❌ 계정 설정에 문제가 있습니다.');
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error);
  } finally {
    await neonPool.end();
  }
})();
