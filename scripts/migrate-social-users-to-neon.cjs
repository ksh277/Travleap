/**
 * 소셜 로그인 사용자 마이그레이션 스크립트
 *
 * 목적:
 * - PlanetScale MySQL에만 존재하는 소셜 로그인 사용자 20명을 Neon PostgreSQL로 이동
 * - 기존 ID 유지 (JWT 토큰 호환성)
 * - 프로필/주소 저장 가능하도록 수정
 */

const { connect } = require('@planetscale/database');
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

const planetscaleConnection = connect({ url: process.env.DATABASE_URL });
const neonSql = neon(process.env.POSTGRES_DATABASE_URL);

async function migrate() {
  console.log('🚀 소셜 로그인 사용자 마이그레이션 시작...\n');

  try {
    // 1. PlanetScale에서 소셜 로그인 사용자 조회
    console.log('📊 1. PlanetScale에서 소셜 로그인 사용자 조회 중...');
    const psResult = await planetscaleConnection.execute(
      `SELECT id, user_id, email, name, provider, provider_id, role, created_at, updated_at
       FROM users
       WHERE provider IS NOT NULL
       ORDER BY id ASC`
    );

    const psUsers = psResult.rows || [];
    console.log(`✅ PlanetScale에서 ${psUsers.length}명의 소셜 로그인 사용자 발견\n`);

    if (psUsers.length === 0) {
      console.log('⚠️  마이그레이션할 사용자가 없습니다.');
      return;
    }

    // 2. Neon에서 기존 사용자 확인
    console.log('📊 2. Neon에서 기존 사용자 확인 중...');
    const neonResult = await neonSql`
      SELECT id, provider, provider_id FROM users WHERE provider IS NOT NULL
    `;
    console.log(`✅ Neon에 이미 ${neonResult.length}명의 소셜 로그인 사용자 존재\n`);

    // Neon에 이미 있는 사용자 ID 세트 생성
    const existingNeonIds = new Set(neonResult.map(u => u.id));
    const existingProviderKeys = new Set(
      neonResult.map(u => `${u.provider}_${u.provider_id}`)
    );

    // 3. 마이그레이션 대상 필터링
    const toMigrate = psUsers.filter(user => {
      const providerKey = `${user.provider}_${user.provider_id}`;
      return !existingNeonIds.has(user.id) && !existingProviderKeys.has(providerKey);
    });

    console.log('📊 3. 마이그레이션 대상 필터링');
    console.log(`   - 총 PlanetScale 사용자: ${psUsers.length}명`);
    console.log(`   - Neon에 이미 존재: ${psUsers.length - toMigrate.length}명`);
    console.log(`   - 마이그레이션 필요: ${toMigrate.length}명\n`);

    if (toMigrate.length === 0) {
      console.log('✅ 모든 사용자가 이미 Neon에 존재합니다. 마이그레이션 완료!');
      return;
    }

    // 4. 사용자 마이그레이션
    console.log('🔄 4. 사용자 마이그레이션 시작...');
    console.log('='.repeat(80));

    let successCount = 0;
    let errorCount = 0;

    for (const user of toMigrate) {
      try {
        console.log(`\n[${successCount + errorCount + 1}/${toMigrate.length}] 마이그레이션 중...`);
        console.log(`   ID: ${user.id} | ${user.provider} | ${user.email}`);

        // username 생성 (Neon에서 필수)
        const username = user.user_id || `${user.provider}_${user.provider_id}`;

        // Neon에 사용자 삽입 (ID는 자동 생성되므로 제외)
        await neonSql`
          INSERT INTO users (
            username, email, name, provider, provider_id,
            role, password_hash, created_at, updated_at
          ) VALUES (
            ${username},
            ${user.email},
            ${user.name},
            ${user.provider},
            ${user.provider_id},
            ${user.role || 'user'},
            '',
            ${user.created_at || new Date()},
            ${user.updated_at || new Date()}
          )
        `;

        console.log(`   ✅ 성공`);
        successCount++;
      } catch (error) {
        console.error(`   ❌ 실패: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 마이그레이션 결과');
    console.log('='.repeat(80));
    console.log(`✅ 성공: ${successCount}명`);
    console.log(`❌ 실패: ${errorCount}명`);
    console.log(`📈 총 처리: ${successCount + errorCount}명`);

    // 5. 최종 검증
    console.log('\n📊 5. 최종 검증 중...');
    const finalNeonResult = await neonSql`
      SELECT COUNT(*) as count FROM users WHERE provider IS NOT NULL
    `;
    console.log(`✅ Neon에 현재 ${finalNeonResult[0].count}명의 소셜 로그인 사용자 존재`);

    console.log('\n' + '='.repeat(80));
    console.log('🎉 마이그레이션 완료!');
    console.log('='.repeat(80));
    console.log('\n⚠️  중요: 향후 소셜 로그인은 자동으로 Neon에 저장됩니다.');
    console.log('⚠️  기존 사용자들은 이제 프로필/주소 저장이 가능합니다.\n');

  } catch (error) {
    console.error('\n❌ 마이그레이션 중 오류 발생:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

migrate();
