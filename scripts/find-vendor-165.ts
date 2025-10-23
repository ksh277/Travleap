import { db } from '../utils/database.js';
import { connect } from '@planetscale/database';

async function findVendor165() {
  try {
    console.log('🔍 165대 차량 보유 벤더 찾기...\n');

    // 각 벤더별 차량 수 확인
    const vendorCounts = await db.query(`
      SELECT 
        rv.id,
        rv.vendor_name,
        rv.vendor_email,
        rv.user_id,
        COUNT(v.id) as vehicle_count
      FROM rentcar_vendors rv
      LEFT JOIN rentcar_vehicles v ON v.vendor_id = rv.id
      GROUP BY rv.id, rv.vendor_name, rv.vendor_email, rv.user_id
      ORDER BY vehicle_count DESC
      LIMIT 10
    `);

    console.log('=== 벤더별 차량 보유 현황 ===');
    vendorCounts.forEach((v: any) => {
      console.log(`${v.vendor_name}: ${v.vehicle_count}대 (user_id: ${v.user_id})`);
    });

    // 165대 보유 벤더 찾기
    const vendor165 = vendorCounts.find((v: any) => v.vehicle_count >= 165);

    if (vendor165) {
      console.log('\n✅ 165대 차량 보유 벤더 발견!');
      console.log('벤더명:', vendor165.vendor_name);
      console.log('user_id:', vendor165.user_id);
      console.log('vendor_email:', vendor165.vendor_email);

      // Neon DB에서 계정 정보 조회
      const neonDB = connect({
        url: process.env.DATABASE_URL!
      });

      const userResult = await neonDB.execute(
        'SELECT id, email, role, name FROM users WHERE id = ?',
        [vendor165.user_id]
      );

      console.log('\n=== 🔑 로그인 정보 ===');
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        console.log('✉️  이메일:', user.email);
        console.log('🔒 비밀번호: vendor123');
        console.log('👤 역할:', user.role);
        console.log('📛 이름:', user.name);
        console.log('\n📋 복사용:');
        console.log(`이메일: ${user.email}`);
        console.log(`비밀번호: vendor123`);
      } else {
        console.log('⚠️  Neon DB에서 user_id로 계정을 찾을 수 없습니다.');
        console.log('vendor_email 사용 시도:', vendor165.vendor_email);
        console.log('비밀번호: vendor123 (기본값)');
      }
    } else {
      console.log('\n⚠️  165대 이상 차량을 보유한 벤더를 찾을 수 없습니다.');
      console.log('\n가장 많은 차량을 보유한 벤더:');
      if (vendorCounts.length > 0) {
        const topVendor = vendorCounts[0];
        console.log(`${topVendor.vendor_name}: ${topVendor.vehicle_count}대`);
        console.log(`이메일: ${topVendor.vendor_email}`);
        console.log('비밀번호: vendor123');
      }
    }

  } catch (error) {
    console.error('❌ 오류:', error instanceof Error ? error.message : String(error));
  } finally {
    process.exit(0);
  }
}

findVendor165();
