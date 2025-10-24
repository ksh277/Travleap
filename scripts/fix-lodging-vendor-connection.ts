/**
 * lodging1@shinan.com 계정과 파트너 연결 수정
 * - user_id 타입 불일치 문제 해결
 * - services 필드를 'accommodation'으로 설정 (중복 보장)
 */

import { neon } from '@neondatabase/serverless';
import { connect } from '@planetscale/database';
import dotenv from 'dotenv';

dotenv.config();

async function fixLodgingVendorConnection() {
  if (!process.env.POSTGRES_DATABASE_URL || !process.env.DATABASE_URL) {
    console.error('❌ 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  const neonSql = neon(process.env.POSTGRES_DATABASE_URL);
  const psConnection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🔧 lodging1@shinan.com 계정 연결 수정 시작\n');

    // 1. Neon에서 user 조회
    const users = await neonSql`
      SELECT id, email, name, role
      FROM users
      WHERE email = 'lodging1@shinan.com'
    `;

    if (users.length === 0) {
      console.log('❌ Neon DB에 계정이 없습니다.');
      process.exit(1);
    }

    const user = users[0];
    console.log('✅ Neon DB에서 사용자 확인:');
    console.log(`   User ID: ${user.id} (타입: ${typeof user.id})`);
    console.log(`   이메일: ${user.email}\n`);

    // 2. PlanetScale에서 partner 조회 (partner ID 225)
    const partnerResult = await psConnection.execute(
      `SELECT id, business_name, user_id, partner_type, services
       FROM partners
       WHERE id = 225`,
      []
    );

    if (!partnerResult.rows || partnerResult.rows.length === 0) {
      console.log('❌ Partner ID 225를 찾을 수 없습니다.');
      process.exit(1);
    }

    const partner: any = partnerResult.rows[0];
    console.log('✅ PlanetScale DB에서 파트너 확인:');
    console.log(`   Partner ID: ${partner.id}`);
    console.log(`   business_name: ${partner.business_name}`);
    console.log(`   user_id (수정 전): ${partner.user_id} (타입: ${typeof partner.user_id})`);
    console.log(`   partner_type: ${partner.partner_type}`);
    console.log(`   services: ${partner.services}\n`);

    // 3. user_id 업데이트 + services 설정
    console.log('🔧 연결 수정 중...');
    console.log(`   user_id를 ${user.id}로 업데이트`);
    console.log(`   services를 'accommodation'으로 설정\n`);

    const updateResult = await psConnection.execute(
      `UPDATE partners
       SET user_id = ?, services = 'accommodation'
       WHERE id = 225`,
      [user.id]
    );

    console.log('✅ 업데이트 완료!');
    console.log(`   영향받은 행: ${updateResult.rowsAffected}\n`);

    // 4. 검증
    const verifyResult = await psConnection.execute(
      `SELECT id, business_name, user_id, partner_type, services
       FROM partners
       WHERE id = 225`,
      []
    );

    const updated: any = verifyResult.rows![0];
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 수정 후 검증:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Partner ID: ${updated.id}`);
    console.log(`   business_name: ${updated.business_name}`);
    console.log(`   user_id: ${updated.user_id} (타입: ${typeof updated.user_id})`);
    console.log(`   partner_type: ${updated.partner_type}`);
    console.log(`   services: ${updated.services}`);

    // 타입 비교 체크
    const userId = Number(updated.user_id);
    if (userId === user.id) {
      console.log('\n✅ user_id 연결 정상 (타입 변환 후 일치)');
    } else {
      console.log(`\n❌ 여전히 불일치: ${userId} !== ${user.id}`);
    }

    if (updated.partner_type === 'lodging' || updated.services === 'accommodation') {
      console.log('✅ partner_type/services 정상');
    }

    console.log('\n🎉 수정 완료! 이제 lodging1@shinan.com으로 로그인하여 /vendor/lodging에 접속하세요.');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    console.error(error instanceof Error ? error.stack : error);
    process.exit(1);
  }
}

fixLodgingVendorConnection();
