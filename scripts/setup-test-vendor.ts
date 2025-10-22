/**
 * 테스트 벤더 계정 설정 스크립트
 *
 * 목적:
 * - Neon PostgreSQL에 테스트 벤더 계정 생성
 * - PlanetScale rentcar_vendors와 연결
 * - 전체 렌트카 테스트를 위한 데이터 준비
 *
 * 실행:
 * npx tsx scripts/setup-test-vendor.ts
 */

import 'dotenv/config';
import { Pool } from '@neondatabase/serverless';
import { connect } from '@planetscale/database';
import * as bcrypt from 'bcryptjs';

// Neon PostgreSQL (User accounts)
const neonPool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL || process.env.POSTGRES_DATABASE_URL
});

// PlanetScale MySQL (Business data)
const planetscale = connect({
  url: process.env.DATABASE_URL!
});

async function setupTestVendor() {
  console.log('🚀 테스트 벤더 계정 설정 시작...\n');

  try {
    // 1. Neon에서 기존 테스트 사용자 확인
    console.log('1️⃣  Neon PostgreSQL에서 기존 사용자 확인...');
    const existingUser = await neonPool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      ['pmstest@vendor.com']
    );

    let userId: number;

    if (existingUser.rows.length > 0) {
      console.log('   ✅ 기존 사용자 발견:', existingUser.rows[0]);
      userId = existingUser.rows[0].id;
    } else {
      // 2. 새 사용자 생성
      console.log('   ➕ 새 사용자 생성 중...');
      const password = 'pmstest123';
      const passwordHash = await bcrypt.hash(password, 10);

      const result = await neonPool.query(
        `INSERT INTO users (email, name, role, password_hash, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING id, email, role`,
        ['pmstest@vendor.com', 'PMS 테스트 담당자', 'vendor', passwordHash]
      );

      userId = result.rows[0].id;
      console.log('   ✅ 새 사용자 생성 완료:', result.rows[0]);
      console.log(`      → 이메일: pmstest@vendor.com`);
      console.log(`      → 비밀번호: ${password}`);
      console.log(`      → 역할: vendor`);
      console.log(`      → User ID: ${userId}`);
    }

    // 3. PlanetScale에서 PMS 테스트 벤더 확인
    console.log('\n2️⃣  PlanetScale에서 PMS 테스트 벤더 확인...');
    const vendorResult = await planetscale.execute(
      `SELECT id, business_name, user_id
       FROM rentcar_vendors
       WHERE business_name LIKE '%PMS%'
       LIMIT 1`
    );

    if (!vendorResult.rows || vendorResult.rows.length === 0) {
      throw new Error('PMS 테스트 벤더를 찾을 수 없습니다');
    }

    const vendor = vendorResult.rows[0];
    console.log('   ✅ PMS 벤더 발견:');
    console.log(`      → Vendor ID: ${vendor.id}`);
    console.log(`      → Business Name: ${vendor.business_name}`);
    console.log(`      → Current User ID: ${vendor.user_id || '(없음)'}`);

    // 4. user_id 연결
    if (vendor.user_id !== userId) {
      console.log('\n3️⃣  user_id 업데이트 중...');
      await planetscale.execute(
        'UPDATE rentcar_vendors SET user_id = ? WHERE id = ?',
        [userId, vendor.id]
      );
      console.log(`   ✅ user_id 연결 완료: ${userId}`);
    } else {
      console.log('\n3️⃣  user_id 이미 연결됨 ✅');
    }

    // 5. 차량 수 확인
    console.log('\n4️⃣  차량 수 확인...');
    const vehicleCount = await planetscale.execute(
      'SELECT COUNT(*) as count FROM rentcar_vehicles WHERE vendor_id = ?',
      [vendor.id]
    );
    console.log(`   ✅ 등록된 차량: ${vehicleCount.rows[0].count}대`);

    // 6. 시간당 요금 설정 확인
    const hourlyRates = await planetscale.execute(
      `SELECT
        COUNT(*) as total,
        COUNT(hourly_rate_krw) as with_hourly
       FROM rentcar_vehicles
       WHERE vendor_id = ?`,
      [vendor.id]
    );

    const stats = hourlyRates.rows[0];
    const coverage = ((stats.with_hourly / stats.total) * 100).toFixed(1);
    console.log(`   ✅ 시간당 요금 설정: ${stats.with_hourly}/${stats.total} (${coverage}%)`);

    // 7. 최종 확인
    console.log('\n5️⃣  최종 확인...');
    console.log('   ✅ 모든 설정 완료!\n');

    console.log('═'.repeat(60));
    console.log('🎉 테스트 벤더 계정 설정 완료');
    console.log('═'.repeat(60));
    console.log('\n📋 로그인 정보:');
    console.log(`   이메일: pmstest@vendor.com`);
    console.log(`   비밀번호: pmstest123`);
    console.log(`   역할: vendor`);
    console.log(`\n🏢 벤더 정보:`);
    console.log(`   Vendor ID: ${vendor.id}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Business Name: ${vendor.business_name}`);
    console.log(`   차량 수: ${vehicleCount.rows[0].count}대`);
    console.log(`   시간당 요금: ${coverage}% 설정됨`);
    console.log('\n💡 테스트 방법:');
    console.log('   1. 로그인:');
    console.log('      curl -X POST http://localhost:3004/api/auth/login \\');
    console.log('        -H "Content-Type: application/json" \\');
    console.log('        -d \'{"email":"pmstest@vendor.com","password":"pmstest123"}\'');
    console.log('\n   2. 토큰 사용:');
    console.log('      curl http://localhost:3004/api/vendor/vehicles \\');
    console.log('        -H "Authorization: Bearer YOUR_TOKEN"');
    console.log('\n   3. 전체 테스트:');
    console.log('      npx tsx test-booking-flow.ts');
    console.log('═'.repeat(60));

  } catch (error: any) {
    console.error('\n❌ 오류 발생:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await neonPool.end();
  }
}

setupTestVendor();
