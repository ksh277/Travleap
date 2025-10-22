/**
 * 렌트카 벤더 계정 생성 스크립트
 *
 * Usage: npx tsx scripts/create-rentcar-vendor.ts
 */

import { connect } from '@planetscale/database';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const connection = connect({ url: process.env.DATABASE_URL! });

async function createRentcarVendor() {
  const email = 'rentcar@vendor.com';
  const password = 'rentcar123';
  const name = '렌트카매니저';
  const phone = '010-9999-9999';
  const business_name = '트래블립렌트카';
  const business_registration_number = '999-99-99999';

  try {
    console.log('🚀 렌트카 벤더 계정 생성 시작...\n');

    // 1. Check if user already exists
    console.log(`1️⃣  이메일 중복 확인: ${email}`);
    const existing = await connection.execute(
      'SELECT id, email FROM users WHERE email = ?',
      [email]
    );

    if (existing.rows.length > 0) {
      console.log(`⚠️  이미 존재하는 계정입니다: ${email}`);
      console.log(`   계정 정보:`);
      console.log(`   - 이메일: ${email}`);
      console.log(`   - 비밀번호: ${password}`);
      console.log(`   - 대시보드: http://localhost:5176/vendor/dashboard\n`);
      return;
    }

    // 2. Hash password
    console.log('2️⃣  비밀번호 해싱...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create user with role 'vendor'
    console.log('3️⃣  사용자 생성 (role: vendor)...');
    const userResult = await connection.execute(
      `INSERT INTO users (email, password_hash, name, phone, role, created_at)
       VALUES (?, ?, ?, ?, 'vendor', NOW())`,
      [email, hashedPassword, name, phone]
    );

    const userId = userResult.insertId;
    console.log(`   ✅ User ID: ${userId}`);

    // 4. Create rentcar vendor
    console.log('4️⃣  렌트카 벤더 정보 생성...');
    const vendorResult = await connection.execute(
      `INSERT INTO rentcar_vendors
       (user_id, business_name, business_registration_number, brand_name, contact_phone, contact_email, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', NOW())`,
      [userId, business_name, business_registration_number, business_name, phone, email]
    );

    const vendorId = vendorResult.insertId;
    console.log(`   ✅ Vendor ID: ${vendorId}`);

    console.log('\n🎉 렌트카 벤더 계정 생성 완료!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 이메일: rentcar@vendor.com');
    console.log('🔑 비밀번호: rentcar123');
    console.log('👤 이름: 렌트카매니저');
    console.log('🏢 업체명: 트래블립렌트카');
    console.log('🎭 권한: vendor');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🌐 로그인 방법:');
    console.log('1. http://localhost:5176 접속');
    console.log('2. 우측 상단 "마이페이지" 클릭 → "로그인"');
    console.log('3. 위 이메일/비밀번호로 로그인');
    console.log('4. 자동으로 벤더 대시보드로 이동');
    console.log('\n📊 벤더 대시보드 직접 접속:');
    console.log('http://localhost:5176/vendor/dashboard\n');

    console.log('🔧 120개 차량 등록 방법:');
    console.log('1. Mock PMS API 서버 실행:');
    console.log('   npx tsx mock-rentcar-api.ts');
    console.log('2. 벤더 대시보드 → PMS 설정');
    console.log('3. PMS 타입: Socar');
    console.log('4. API 엔드포인트: http://localhost:3005/api/vehicles');
    console.log('5. "지금 동기화" 클릭');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error);
    process.exit(1);
  }
}

createRentcarVendor().then(() => process.exit(0));
