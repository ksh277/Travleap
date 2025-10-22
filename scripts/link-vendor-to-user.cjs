/**
 * PlanetScale의 rentcar_vendors를 Neon의 users와 연결
 * contact_email로 매칭해서 user_id 업데이트
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function linkVendorToUser() {
  try {
    console.log('🔗 벤더-사용자 연결 작업 시작...\n');

    const connection = connect({ url: process.env.DATABASE_URL });

    // 1. user_id 컬럼이 있는지 확인
    console.log('1️⃣  rentcar_vendors 테이블 구조 확인...');
    const columns = await connection.execute(
      'SHOW COLUMNS FROM rentcar_vendors LIKE "user_id"'
    );

    if (columns.rows.length === 0) {
      console.log('⚠️  user_id 컬럼이 없습니다. 컬럼을 추가합니다...');

      await connection.execute(`
        ALTER TABLE rentcar_vendors
        ADD COLUMN user_id INT NULL COMMENT '연결된 사용자 ID (Neon DB users.id)'
      `);

      console.log('✅ user_id 컬럼 추가 완료\n');
    } else {
      console.log('✅ user_id 컬럼이 이미 존재합니다\n');
    }

    // 2. rentcar@vendor.com 벤더에 user_id = 21 설정
    console.log('2️⃣  rentcar@vendor.com 벤더에 user_id 연결...');

    const result = await connection.execute(
      `UPDATE rentcar_vendors
       SET user_id = 21
       WHERE contact_email = 'rentcar@vendor.com'`
    );

    console.log('✅ 연결 완료!\n');

    // 3. 확인
    console.log('3️⃣  연결 결과 확인...');
    const vendor = await connection.execute(
      `SELECT id, business_name, contact_email, user_id, vendor_code
       FROM rentcar_vendors
       WHERE contact_email = 'rentcar@vendor.com'`
    );

    if (vendor.rows.length > 0) {
      const v = vendor.rows[0];
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ 연결 정보:');
      console.log(`   🆔 Vendor ID (PlanetScale): ${v.id}`);
      console.log(`   👤 User ID (Neon): ${v.user_id}`);
      console.log(`   🏢 업체명: ${v.business_name}`);
      console.log(`   📧 이메일: ${v.contact_email}`);
      console.log(`   🔖 벤더 코드: ${v.vendor_code}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    console.log('🎉 작업 완료!\n');

  } catch (error) {
    console.error('\n❌ 오류:', error);
    if (error.body) console.error('   Body:', error.body);
  }
}

linkVendorToUser().then(() => process.exit(0));
