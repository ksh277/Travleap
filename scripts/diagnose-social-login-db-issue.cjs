/**
 * 소셜 로그인 데이터베이스 불일치 진단 스크립트
 *
 * 문제: 소셜 로그인 사용자가 PlanetScale과 Neon 두 DB에 걸쳐있음
 */

const { connect } = require('@planetscale/database');
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const planetscaleConnection = connect({ url: process.env.DATABASE_URL });
const neonSql = neon(process.env.POSTGRES_DATABASE_URL);

async function diagnose() {
  console.log('🔍 소셜 로그인 데이터베이스 진단 시작...\n');

  try {
    // 1. PlanetScale MySQL에서 소셜 로그인 사용자 조회
    console.log('📊 1. PlanetScale MySQL - 소셜 로그인 사용자 확인');
    console.log('='.repeat(60));
    const psResult = await planetscaleConnection.execute(
      `SELECT id, user_id, email, name, provider, provider_id, created_at
       FROM users
       WHERE provider IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 5`
    );

    console.log(`✅ PlanetScale에 소셜 로그인 사용자: ${psResult.rows?.length || 0}명\n`);

    if (psResult.rows && psResult.rows.length > 0) {
      psResult.rows.forEach((user, idx) => {
        console.log(`[${idx + 1}] ID: ${user.id} | Provider: ${user.provider} | Email: ${user.email}`);
        console.log(`    Name: ${user.name} | Created: ${user.created_at}`);
      });
    }

    // 2. Neon PostgreSQL에서 해당 사용자들 확인
    console.log('\n📊 2. Neon PostgreSQL - 소셜 로그인 사용자 확인');
    console.log('='.repeat(60));
    const neonResult = await neonSql`
      SELECT id, username, email, name, provider, provider_id, created_at
      FROM users
      WHERE provider IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 5
    `;

    console.log(`✅ Neon에 소셜 로그인 사용자: ${neonResult.length}명\n`);

    if (neonResult.length > 0) {
      neonResult.forEach((user, idx) => {
        console.log(`[${idx + 1}] ID: ${user.id} | Provider: ${user.provider} | Email: ${user.email}`);
        console.log(`    Name: ${user.name} | Created: ${user.created_at}`);
      });
    }

    // 3. ID 매칭 확인
    console.log('\n📊 3. 두 DB 간 사용자 ID 매칭 확인');
    console.log('='.repeat(60));

    if (psResult.rows && psResult.rows.length > 0) {
      for (const psUser of psResult.rows) {
        const neonMatch = await neonSql`
          SELECT id, email FROM users WHERE id = ${psUser.id}
        `;

        if (neonMatch.length > 0) {
          console.log(`✅ ID ${psUser.id}: PlanetScale ↔ Neon 일치 (${psUser.email})`);
        } else {
          console.log(`❌ ID ${psUser.id}: PlanetScale에만 존재 (${psUser.email})`);
          console.log(`   ⚠️  이 사용자는 프로필/주소 저장 불가능!`);
        }
      }
    }

    // 4. 최근 생성된 사용자 비교
    console.log('\n📊 4. 최근 생성된 사용자 DB 비교');
    console.log('='.repeat(60));

    const psTotal = await planetscaleConnection.execute(
      `SELECT COUNT(*) as count FROM users WHERE provider IS NOT NULL`
    );

    const neonTotal = await neonSql`
      SELECT COUNT(*) as count FROM users WHERE provider IS NOT NULL
    `;

    console.log(`PlanetScale 소셜 로그인 총 사용자: ${psTotal.rows?.[0]?.count || 0}명`);
    console.log(`Neon 소셜 로그인 총 사용자: ${neonTotal[0]?.count || 0}명`);

    const diff = (psTotal.rows?.[0]?.count || 0) - (neonTotal[0]?.count || 0);
    if (diff > 0) {
      console.log(`\n⚠️  경고: ${diff}명의 사용자가 PlanetScale에만 존재합니다!`);
      console.log(`   이들은 프로필 조회/주소 저장이 불가능합니다.`);
    } else if (diff < 0) {
      console.log(`\n⚠️  경고: ${-diff}명의 사용자가 Neon에만 존재합니다!`);
    } else {
      console.log(`\n✅ 두 DB의 소셜 로그인 사용자 수 일치`);
    }

    // 5. 일반 로그인 사용자 확인
    console.log('\n📊 5. 일반 로그인(이메일/비밀번호) 사용자 확인');
    console.log('='.repeat(60));

    const psNormal = await planetscaleConnection.execute(
      `SELECT COUNT(*) as count FROM users WHERE provider IS NULL AND password_hash IS NOT NULL AND password_hash != ''`
    );

    const neonNormal = await neonSql`
      SELECT COUNT(*) as count FROM users WHERE provider IS NULL AND password_hash IS NOT NULL AND password_hash != ''
    `;

    console.log(`PlanetScale 일반 로그인 사용자: ${psNormal.rows?.[0]?.count || 0}명`);
    console.log(`Neon 일반 로그인 사용자: ${neonNormal[0]?.count || 0}명`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ 진단 완료!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ 진단 중 오류 발생:', error.message);
    console.error('Stack:', error.stack);
  }
}

diagnose();
