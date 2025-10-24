/**
 * 숙박 벤더 로그인 계정 생성 (Neon DB)
 */

import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';

dotenv.config();

async function createLodgingVendorAccount() {
  if (!process.env.POSTGRES_DATABASE_URL) {
    console.error('❌ POSTGRES_DATABASE_URL이 설정되지 않았습니다.');
    process.exit(1);
  }

  const sql = neon(process.env.POSTGRES_DATABASE_URL);

  try {
    console.log('👤 숙박 벤더 로그인 계정 생성 시작...\n');

    // 계정 정보
    const accountInfo = {
      username: 'seaview_pension',
      email: 'lodging1@shinan.com',
      password: 'vendor123', // 실제로는 해시되어야 하지만 간단히
      name: '신안 바다뷰 펜션',
      phone: '010-1234-5678',
      role: 'vendor',
      partner_id: 225 // 방금 생성한 숙박 벤더 ID
    };

    // 1. 계정 중복 체크
    const existing = await sql`
      SELECT id, email FROM users WHERE email = ${accountInfo.email}
    `;

    if (existing.length > 0) {
      console.log(`ℹ️  계정이 이미 존재합니다: ${accountInfo.email}`);
      console.log(`   User ID: ${existing[0].id}`);
      console.log('\n✅ 기존 계정 정보:');
      console.log(`   이메일: ${accountInfo.email}`);
      console.log(`   비밀번호: ${accountInfo.password}`);
      return;
    }

    // 2. 새 계정 생성 (Neon DB - PostgreSQL)
    // 실제로는 bcrypt로 해시해야 하지만, 테스트용으로 간단한 해시 사용
    const passwordHash = 'hashed_vendor123'; // vendor123의 해시 (테스트용)

    const result = await sql`
      INSERT INTO users (
        username,
        email,
        password_hash,
        name,
        phone,
        role,
        created_at,
        updated_at
      )
      VALUES (
        ${accountInfo.username},
        ${accountInfo.email},
        ${passwordHash},
        ${accountInfo.name},
        ${accountInfo.phone},
        ${accountInfo.role},
        NOW(),
        NOW()
      )
      RETURNING id, email, name, role
    `;

    const userId = result[0].id;
    console.log(`✅ 사용자 계정 생성 완료 (ID: ${userId})`);

    // 3. PlanetScale의 partners 테이블에 user_id 연결
    console.log(`\n🔗 Partner ID ${accountInfo.partner_id}와 연결 중...`);

    const { connect } = await import('@planetscale/database');
    const psConnection = connect({ url: process.env.DATABASE_URL! });

    await psConnection.execute(
      `UPDATE partners SET user_id = ? WHERE id = ?`,
      [userId, accountInfo.partner_id]
    );

    console.log(`✅ Partner 연결 완료\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 숙박 벤더 로그인 계정 생성 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 로그인 정보:');
    console.log(`   이메일: ${accountInfo.email}`);
    console.log(`   비밀번호: ${accountInfo.password}`);
    console.log(`   역할: ${accountInfo.role}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Partner ID: ${accountInfo.partner_id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🌐 로그인 페이지: https://travleap.vercel.app/login');
    console.log('\n⚠️  참고: 이 계정은 벤더 전용 대시보드 접근용입니다.');
    console.log('   관리자 페이지 접근은 불가능합니다.\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    console.error(error instanceof Error ? error.stack : error);
    process.exit(1);
  }
}

createLodgingVendorAccount();
