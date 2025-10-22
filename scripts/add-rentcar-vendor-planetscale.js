/**
 * PlanetScale에 rentcar@vendor.com 벤더 추가
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function addVendor() {
  try {
    console.log('🚀 PlanetScale에 렌트카 벤더 추가 중...\n');

    const connection = connect({ url: process.env.DATABASE_URL });

    // 1. 기존 벤더 확인
    console.log('1️⃣  기존 벤더 확인...');
    const existing = await connection.execute(
      'SELECT id, business_name, contact_email FROM rentcar_vendors WHERE contact_email = ?',
      ['rentcar@vendor.com']
    );

    if (existing.rows.length > 0) {
      console.log('⚠️  이미 벤더가 존재합니다:');
      console.log(`   - ID: ${existing.rows[0].id}`);
      console.log(`   - 업체명: ${existing.rows[0].business_name}`);
      console.log(`   - 이메일: ${existing.rows[0].contact_email}\n`);
      return;
    }

    // 2. 벤더 추가
    console.log('2️⃣  벤더 추가 중...');
    const vendorCode = 'TRAVLEAP_RC_001';

    const result = await connection.execute(`
      INSERT INTO rentcar_vendors (
        vendor_code, business_name, brand_name, business_number,
        contact_name, contact_email, contact_phone,
        description, status, is_verified, commission_rate,
        api_enabled, total_vehicles,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      vendorCode,
      '트래블립렌트카',
      '트래블립렌트카',
      '999-99-99999',
      '렌트카매니저',
      'rentcar@vendor.com',
      '010-9999-9999',
      '트래블립 플랫폼 테스트용 렌트카 업체',
      'active',
      1,
      10.00,
      0,
      0
    ]);

    console.log('\n🎉 벤더 추가 완료!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 벤더 정보:');
    console.log(`   🏢 업체명: 트래블립렌트카`);
    console.log(`   📧 이메일: rentcar@vendor.com`);
    console.log(`   📞 연락처: 010-9999-9999`);
    console.log(`   👤 담당자: 렌트카매니저`);
    console.log(`   🆔 코드: ${vendorCode}`);
    console.log(`   ✓ 상태: active (활성화)`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🌐 로그인:');
    console.log('   이메일: rentcar@vendor.com');
    console.log('   비밀번호: rentcar123');
    console.log('\n📊 벤더 대시보드:');
    console.log('   http://localhost:5173/vendor/dashboard\n');

  } catch (error) {
    console.error('\n❌ 오류:', error);
    if (error.body) console.error('   Body:', error.body);
  }
}

addVendor().then(() => process.exit(0));
