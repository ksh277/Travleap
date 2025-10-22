/**
 * 렌트카 벤더 정보 완벽하게 추가
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL!);

async function fixVendor() {
  try {
    console.log('🚀 렌트카 벤더 정보 완벽하게 추가 중...\n');

    // 1. User 정보 확인
    const user = await sql`
      SELECT id, email, username, role
      FROM users
      WHERE email = 'rentcar@vendor.com'
    `;

    if (user.length === 0) {
      console.log('❌ rentcar@vendor.com 계정이 없습니다!');
      return;
    }

    const userId = user[0].id;
    console.log(`✅ User 확인 완료`);
    console.log(`   - ID: ${userId}`);
    console.log(`   - Email: ${user[0].email}`);
    console.log(`   - Role: ${user[0].role}\n`);

    // 2. 기존 vendor 정보 확인
    const existingVendor = await sql`
      SELECT * FROM rentcar_vendors
      WHERE contact_email = 'rentcar@vendor.com'
      OR business_name = '트래블립렌트카'
    `;

    if (existingVendor.length > 0) {
      console.log('⚠️  이미 벤더 정보가 존재합니다:');
      console.log(`   - Vendor ID: ${existingVendor[0].id}`);
      console.log(`   - Business Name: ${existingVendor[0].business_name}\n`);
      return;
    }

    // 3. rentcar_vendors 테이블 구조 확인
    console.log('📋 rentcar_vendors 테이블 구조 확인 중...');
    const columns = await sql`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'rentcar_vendors'
      ORDER BY ordinal_position
    `;

    console.log('   컬럼 목록:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    console.log('');

    // 4. 벤더 정보 INSERT (필수 컬럼만)
    console.log('💾 벤더 정보 추가 중...');

    const vendorCode = 'RC' + Date.now().toString().slice(-8);

    const result = await sql`
      INSERT INTO rentcar_vendors (
        vendor_code,
        business_name,
        business_number,
        contact_name,
        brand_name,
        contact_phone,
        contact_email,
        status,
        created_at
      )
      VALUES (
        ${vendorCode},
        '트래블립렌트카',
        '999-99-99999',
        '렌트카매니저',
        '트래블립렌트카',
        '010-9999-9999',
        'rentcar@vendor.com',
        'active',
        NOW()
      )
      RETURNING id
    `;

    const vendorId = result[0].id;

    console.log('\n🎉 렌트카 벤더 정보 추가 완료!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 계정 정보:');
    console.log(`   📧 이메일: rentcar@vendor.com`);
    console.log(`   🔑 비밀번호: rentcar123`);
    console.log(`   👤 User ID: ${userId}`);
    console.log(`   🏢 Vendor ID: ${vendorId}`);
    console.log(`   🎭 Role: vendor`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🌐 배포 사이트에서 로그인:');
    console.log('   https://travleap.vercel.app');
    console.log('\n📊 벤더 대시보드:');
    console.log('   https://travleap.vercel.app/vendor/dashboard\n');

  } catch (error) {
    console.error('\n❌ 오류:', error);
    if (error.code) console.error('   Code:', error.code);
    if (error.detail) console.error('   Detail:', error.detail);
  }
}

fixVendor().then(() => process.exit(0));
