/**
 * Neon DB에 렌트카 벤더 계정 생성
 */

import { neon } from '@neondatabase/serverless';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = neon(process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL!);

async function createVendorAccount() {
  try {
    console.log('🚀 Neon DB에 렌트카 벤더 계정 생성 중...\n');

    const email = 'rentcar@vendor.com';
    const password = 'rentcar123';
    const name = '렌트카매니저';
    const phone = '010-9999-9999';

    // 1. 기존 계정 확인
    console.log('1️⃣  기존 계정 확인...');
    const existing = await sql`
      SELECT id, email, role FROM users WHERE email = ${email}
    `;

    if (existing.length > 0) {
      console.log(`⚠️  계정이 이미 존재합니다!`);
      console.log(`   - Email: ${existing[0].email}`);
      console.log(`   - Role: ${existing[0].role}`);

      // role이 vendor가 아니면 업데이트
      if (existing[0].role !== 'vendor') {
        console.log('\n2️⃣  Role을 vendor로 업데이트...');
        await sql`
          UPDATE users
          SET role = 'vendor'
          WHERE email = ${email}
        `;
        console.log('   ✅ Role 업데이트 완료');
      }

      // rentcar_vendors 테이블 확인 및 생성
      const vendorCheck = await sql`
        SELECT id FROM rentcar_vendors WHERE user_id = ${existing[0].id}
      `;

      if (vendorCheck.length === 0) {
        console.log('\n3️⃣  렌트카 벤더 정보 생성...');
        await sql`
          INSERT INTO rentcar_vendors (
            user_id, business_name, business_registration_number,
            brand_name, contact_phone, contact_email, status, created_at
          )
          VALUES (
            ${existing[0].id}, '트래블립렌트카', '999-99-99999',
            '트래블립렌트카', ${phone}, ${email}, 'active', NOW()
          )
        `;
        console.log('   ✅ 렌트카 벤더 정보 생성 완료');
      }

      console.log('\n✅ 계정 준비 완료!');
      return;
    }

    // 2. 비밀번호 해싱
    console.log('2️⃣  비밀번호 해싱...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. 사용자 생성
    console.log('3️⃣  사용자 생성 (role: vendor)...');
    const username = 'rentcar_vendor';
    const userResult = await sql`
      INSERT INTO users (username, email, password_hash, name, phone, role, created_at)
      VALUES (${username}, ${email}, ${hashedPassword}, ${name}, ${phone}, 'vendor', NOW())
      RETURNING id
    `;

    const userId = userResult[0].id;
    console.log(`   ✅ User ID: ${userId}`);

    // 4. 렌트카 벤더 생성
    console.log('4️⃣  렌트카 벤더 정보 생성...');
    await sql`
      INSERT INTO rentcar_vendors (
        user_id, business_name, business_registration_number,
        brand_name, contact_phone, contact_email, status, created_at
      )
      VALUES (
        ${userId}, '트래블립렌트카', '999-99-99999',
        '트래블립렌트카', ${phone}, ${email}, 'active', NOW()
      )
    `;

    console.log('\n🎉 렌트카 벤더 계정 생성 완료!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 이메일: rentcar@vendor.com');
    console.log('🔑 비밀번호: rentcar123');
    console.log('👤 이름: 렌트카매니저');
    console.log('🏢 업체명: 트래블립렌트카');
    console.log('🎭 권한: vendor');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🌐 로그인:');
    console.log('https://travleap.vercel.app');
    console.log('\n📊 벤더 대시보드:');
    console.log('https://travleap.vercel.app/vendor/dashboard\n');

  } catch (error) {
    console.error('\n❌ 오류:', error);
    process.exit(1);
  }
}

createVendorAccount().then(() => process.exit(0));
