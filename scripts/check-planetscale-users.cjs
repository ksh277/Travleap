const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkPlanetScaleUsers() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🔍 PlanetScale users 테이블 확인...\n');

    const tables = await connection.execute('SHOW TABLES LIKE "users"');

    if (!tables.rows || tables.rows.length === 0) {
      console.log('❌ PlanetScale에 users 테이블이 없습니다!\n');
      return;
    }

    console.log('✅ PlanetScale에 users 테이블 존재\n');

    const structure = await connection.execute('DESCRIBE users');
    console.log('📋 테이블 구조:');
    console.table(structure.rows);

    const hasProvider = structure.rows.some(row => row.Field === 'provider');
    const hasProviderId = structure.rows.some(row => row.Field === 'provider_id');

    console.log('\n🔍 소셜 로그인 컬럼:');
    console.log('  provider:', hasProvider ? '✅' : '❌');
    console.log('  provider_id:', hasProviderId ? '✅' : '❌');

    const totalUsers = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log('\n👥 총 사용자:', totalUsers.rows[0].count);

    if (hasProvider) {
      const socialUsers = await connection.execute('SELECT provider, COUNT(*) as count FROM users WHERE provider IS NOT NULL GROUP BY provider');
      if (socialUsers.rows && socialUsers.rows.length > 0) {
        console.log('\n✅ 소셜 로그인 사용자:');
        socialUsers.rows.forEach(row => console.log('  -', row.provider + ':', row.count));
      }
    }

  } catch (error) {
    console.error('\n❌ 오류:', error.message);
  }
}

checkPlanetScaleUsers();
