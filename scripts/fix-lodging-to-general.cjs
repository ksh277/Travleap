require('dotenv').config();
const { connect } = require('@planetscale/database');

async function fixLodgingToGeneral() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('🔧 기존 lodging 6개를 일반 파트너로 변경...\n');

  try {
    // 1. 현재 lodging 파트너 확인
    const checkResult = await conn.execute(`
      SELECT id, business_name, partner_type
      FROM partners
      WHERE partner_type = 'lodging'
    `);

    console.log(`변경할 파트너: ${checkResult.rows?.length || 0}개\n`);
    checkResult.rows?.forEach(p => {
      console.log(`- ID ${p.id}: ${p.business_name} (${p.partner_type})`);
    });

    // 2. partner_type을 NULL로 변경
    await conn.execute(`
      UPDATE partners
      SET partner_type = NULL
      WHERE partner_type = 'lodging'
    `);

    console.log(`\n✅ ${checkResult.rows?.length || 0}개 파트너를 일반 파트너로 변경 완료`);

    // 3. 결과 확인
    const verifyResult = await conn.execute(`
      SELECT partner_type, COUNT(*) as count
      FROM partners
      GROUP BY partner_type
    `);

    console.log('\n=== 파트너 현황 ===');
    verifyResult.rows?.forEach(r => {
      console.log(`${r.partner_type || '일반'}: ${r.count}개`);
    });

    const totalResult = await conn.execute(`
      SELECT COUNT(*) as count FROM partners
    `);
    console.log(`\n총 파트너: ${totalResult.rows?.[0]?.count}개`);

  } catch (error) {
    console.error('❌ 오류:', error);
    throw error;
  }
}

fixLodgingToGeneral()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
