/**
 * lodging1@shinan.com 계정과 벤더 연결 상태 확인
 */

import { neon } from '@neondatabase/serverless';
import { connect } from '@planetscale/database';
import dotenv from 'dotenv';

dotenv.config();

async function checkLodgingVendor() {
  if (!process.env.POSTGRES_DATABASE_URL || !process.env.DATABASE_URL) {
    console.error('❌ 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  const neonSql = neon(process.env.POSTGRES_DATABASE_URL);
  const psConnection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🔍 lodging1@shinan.com 계정 상태 확인\n');

    // 1. Neon에서 user 조회
    const users = await neonSql`
      SELECT id, email, name, role, created_at
      FROM users
      WHERE email = 'lodging1@shinan.com'
    `;

    if (users.length === 0) {
      console.log('❌ Neon DB에 계정이 없습니다.');
      console.log('   스크립트 실행: npm run api -- scripts/create-lodging-vendor-account.ts\n');
      return;
    }

    const user = users[0];
    console.log('✅ Neon DB - users 테이블:');
    console.log(`   User ID: ${user.id}`);
    console.log(`   이메일: ${user.email}`);
    console.log(`   이름: ${user.name}`);
    console.log(`   역할: ${user.role}`);
    console.log(`   생성일: ${user.created_at}\n`);

    // 2. PlanetScale에서 partner 조회
    const partnerResult = await psConnection.execute(
      `SELECT id, business_name, email, phone, user_id, partner_type, services, status
       FROM partners
       WHERE user_id = ?`,
      [user.id]
    );

    if (!partnerResult.rows || partnerResult.rows.length === 0) {
      console.log('❌ PlanetScale DB에 연결된 partner가 없습니다!');
      console.log(`   user_id = ${user.id}로 검색했지만 매칭되는 partner가 없습니다.\n`);

      // 이메일로도 확인
      const emailResult = await psConnection.execute(
        `SELECT id, business_name, email, phone, user_id, partner_type, services, status
         FROM partners
         WHERE email = ?`,
        ['lodging1@shinan.com']
      );

      if (emailResult.rows && emailResult.rows.length > 0) {
        console.log('⚠️  이메일로는 찾았지만 user_id가 연결 안됨:');
        const p: any = emailResult.rows[0];
        console.log(`   Partner ID: ${p.id}`);
        console.log(`   business_name: ${p.business_name}`);
        console.log(`   email: ${p.email}`);
        console.log(`   user_id: ${p.user_id} (NULL이거나 다른 값)`);
        console.log(`   partner_type: ${p.partner_type}`);
        console.log(`   services: ${p.services}`);
        console.log(`   status: ${p.status}\n`);

        console.log('🔧 수정 방법:');
        console.log(`   UPDATE partners SET user_id = ${user.id} WHERE id = ${p.id};\n`);
      } else {
        console.log('   이메일로도 찾을 수 없습니다. partner 레코드가 아예 없습니다.\n');
      }

      return;
    }

    const partner: any = partnerResult.rows[0];
    console.log('✅ PlanetScale DB - partners 테이블:');
    console.log(`   Partner ID: ${partner.id}`);
    console.log(`   business_name: ${partner.business_name}`);
    console.log(`   email: ${partner.email}`);
    console.log(`   phone: ${partner.phone}`);
    console.log(`   user_id: ${partner.user_id} ${partner.user_id === user.id ? '✅' : '❌ 불일치!'}`);
    console.log(`   partner_type: ${partner.partner_type}`);
    console.log(`   services: ${partner.services}`);
    console.log(`   status: ${partner.status}\n`);

    // 3. 검증
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧪 검증 결과:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let allGood = true;

    // 타입 변환 후 비교 (SQL은 자동 타입 변환을 하므로 이것이 실제 동작)
    const userIdMatch = Number(partner.user_id) === Number(user.id);

    if (!userIdMatch) {
      console.log('❌ user_id 불일치!');
      console.log(`   Neon: ${user.id} (${typeof user.id})`);
      console.log(`   PlanetScale: ${partner.user_id} (${typeof partner.user_id})`);
      allGood = false;
    } else {
      console.log('✅ user_id 연결 정상');
      if (typeof partner.user_id !== typeof user.id) {
        console.log(`   ℹ️  타입 차이 있음: Neon(${typeof user.id}) vs PlanetScale(${typeof partner.user_id})`);
        console.log('   ℹ️  SQL 쿼리는 자동 타입 변환을 하므로 API는 정상 작동합니다');
      }
    }

    if (partner.partner_type !== 'lodging' && partner.services !== 'accommodation') {
      console.log(`❌ partner_type/services 오류: ${partner.partner_type}/${partner.services}`);
      console.log('   partner_type="lodging" 또는 services="accommodation"이어야 함');
      allGood = false;
    } else {
      console.log('✅ partner_type/services 정상');
    }

    if (allGood) {
      console.log('\n🎉 모든 설정이 정상입니다!');
      console.log('   로그인 테스트를 진행하세요.');
    } else {
      console.log('\n⚠️  문제가 발견되었습니다. 위 내용을 확인하세요.');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    console.error(error instanceof Error ? error.stack : error);
    process.exit(1);
  }
}

checkLodgingVendor();
