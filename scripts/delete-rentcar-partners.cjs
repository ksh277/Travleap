require('dotenv').config();
const { connect } = require('@planetscale/database');

async function deleteRentcarPartners() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('🗑️ rentcar 파트너 삭제 시작...\n');

  try {
    // 1. 삭제 전 확인
    const beforeCount = await conn.execute('SELECT COUNT(*) as count FROM partners');
    console.log(`삭제 전 전체 파트너: ${beforeCount.rows[0].count}개\n`);

    const rentcarPartners = await conn.execute(`
      SELECT id, business_name, email, created_at
      FROM partners
      WHERE partner_type = 'rentcar'
    `);

    console.log(`삭제할 rentcar 파트너: ${rentcarPartners.rows.length}개\n`);

    if (rentcarPartners.rows.length === 0) {
      console.log('✅ 삭제할 rentcar 파트너가 없습니다.');
      return;
    }

    rentcarPartners.rows.forEach(p => {
      console.log(`  - ID ${p.id}: ${p.business_name} (${p.email})`);
    });

    // 2. 삭제 실행
    console.log('\n🔧 삭제 중...\n');

    const deleteResult = await conn.execute(`
      DELETE FROM partners
      WHERE partner_type = 'rentcar'
    `);

    console.log(`✅ ${rentcarPartners.rows.length}개의 rentcar 파트너 삭제 완료\n`);

    // 3. 삭제 후 확인
    const afterCount = await conn.execute('SELECT COUNT(*) as count FROM partners');
    console.log(`삭제 후 전체 파트너: ${afterCount.rows[0].count}개\n`);

    const remaining = await conn.execute(`
      SELECT partner_type, COUNT(*) as count
      FROM partners
      GROUP BY partner_type
    `);

    console.log('파트너 타입별 분포:');
    remaining.rows.forEach(r => {
      console.log(`  - ${r.partner_type || 'NULL'}: ${r.count}개`);
    });

  } catch (error) {
    console.error('❌ 오류:', error);
    throw error;
  }
}

deleteRentcarPartners()
  .then(() => {
    console.log('\n✅ 작업 완료!');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ 작업 실패:', err);
    process.exit(1);
  });
