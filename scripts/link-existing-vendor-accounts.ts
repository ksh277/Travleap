/**
 * 기존 벤더 계정을 partners 테이블에 연결하는 마이그레이션 스크립트
 *
 * 사용법:
 * npx ts-node scripts/link-existing-vendor-accounts.ts
 */

import { Pool } from '@neondatabase/serverless';
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

// Neon DB (사용자 계정)
const neonPool = new Pool({
  connectionString: process.env.POSTGRES_DATABASE_URL || process.env.NEON_DATABASE_URL
});

// PlanetScale DB (업체 정보)
const planetscale = connect({
  url: process.env.DATABASE_URL
});

interface VendorAccount {
  email: string;
  category: string;
  business_name: string;
  contact_name?: string;
  phone?: string;
}

// 연결할 기존 벤더 계정 목록
const EXISTING_VENDOR_ACCOUNTS: VendorAccount[] = [
  {
    email: 'lodging1@shinan.com',
    category: 'lodging',
    business_name: '신안 오션뷰 펜션',
    contact_name: '김신안',
    phone: '061-240-8000'
  },
  {
    email: 'rentcar@vendor.com',
    category: 'rentcar',
    business_name: '신안 렌트카',
    contact_name: '이렌트',
    phone: '061-240-9000'
  }
  // 필요시 추가
];

async function linkVendorAccounts() {
  console.log('🔗 기존 벤더 계정 연결 시작...\n');

  const neonClient = await neonPool.connect();

  try {
    for (const account of EXISTING_VENDOR_ACCOUNTS) {
      console.log(`📧 처리 중: ${account.email} (${account.category})`);

      // 1. Neon DB에서 사용자 조회
      const userResult = await neonClient.query(
        'SELECT id, username, email, name, phone, role FROM users WHERE email = $1',
        [account.email]
      );

      if (!userResult.rows || userResult.rows.length === 0) {
        console.log(`   ⚠️  사용자를 찾을 수 없습니다: ${account.email}`);
        console.log(`   → Neon DB에 먼저 계정을 생성하세요.\n`);
        continue;
      }

      const user = userResult.rows[0];
      console.log(`   ✅ Neon DB 사용자 발견: ID=${user.id}, role=${user.role}`);

      // 2. 사용자 role이 'vendor'가 아니면 업데이트
      if (user.role !== 'vendor') {
        await neonClient.query(
          'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
          ['vendor', user.id]
        );
        console.log(`   ✅ Role을 'vendor'로 업데이트`);
      }

      // 3. PlanetScale DB에서 기존 partners 레코드 확인
      const existingPartnerResult = await planetscale.execute(
        `SELECT id FROM partners WHERE user_id = ? AND partner_type = ? LIMIT 1`,
        [user.id, account.category]
      );

      if (existingPartnerResult.rows && existingPartnerResult.rows.length > 0) {
        console.log(`   ℹ️  이미 partners 레코드가 존재합니다 (ID=${existingPartnerResult.rows[0].id})\n`);
        continue;
      }

      // 4. partners 테이블에 레코드 생성
      const insertResult = await planetscale.execute(
        `INSERT INTO partners (
          user_id,
          partner_type,
          business_name,
          contact_name,
          email,
          phone,
          status,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 'approved', 1, NOW(), NOW())`,
        [
          user.id,
          account.category,
          account.business_name,
          account.contact_name || user.name,
          account.email,
          account.phone || user.phone
        ]
      );

      console.log(`   ✅ PlanetScale partners 레코드 생성 완료 (ID=${insertResult.insertId})`);
      console.log(`   📝 업체명: ${account.business_name}\n`);
    }

    console.log('🎉 모든 벤더 계정 연결 완료!');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  } finally {
    neonClient.release();
  }
}

// 실행
linkVendorAccounts()
  .then(() => {
    console.log('\n✅ 마이그레이션 성공');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 마이그레이션 실패:', error);
    process.exit(1);
  });
