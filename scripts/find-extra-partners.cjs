require('dotenv').config();
const { connect } = require('@planetscale/database');

async function findExtraPartners() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('🔍 파트너 관리에 나오지 않는 파트너 찾기...\n');

  try {
    // 1. 전체 파트너
    const allPartners = await conn.execute('SELECT * FROM partners ORDER BY id');
    console.log(`전체 파트너: ${allPartners.rows.length}개\n`);

    // 2. 파트너 관리 API가 반환하는 파트너들
    const displayedPartners = await conn.execute(`
      SELECT *
      FROM partners p
      WHERE (p.partner_type NOT IN ('lodging', 'rentcar') OR p.partner_type IS NULL)
      ORDER BY p.created_at DESC
    `);
    console.log(`파트너 관리에 표시되는 파트너: ${displayedPartners.rows.length}개\n`);

    // 3. 표시되는 파트너의 ID 목록
    const displayedIds = new Set(displayedPartners.rows.map(p => p.id));

    // 4. 표시되지 않는 파트너들 찾기
    const extraPartners = allPartners.rows.filter(p => !displayedIds.has(p.id));

    console.log(`파트너 관리에 나오지 않는 파트너: ${extraPartners.length}개\n`);

    if (extraPartners.length > 0) {
      console.log('=== 삭제 대상 파트너 ===\n');
      extraPartners.forEach(p => {
        console.log(`ID ${p.id}: ${p.business_name || p.email}`);
        console.log(`  - 타입: ${p.partner_type || 'NULL'}`);
        console.log(`  - 이메일: ${p.email}`);
        console.log(`  - 생성일: ${p.created_at}\n`);
      });

      console.log(`\n총 ${extraPartners.length}개의 파트너를 삭제하시겠습니까?`);
      console.log(`삭제할 ID: ${extraPartners.map(p => p.id).join(', ')}`);
    } else {
      console.log('✅ 삭제할 파트너가 없습니다!');
    }

  } catch (error) {
    console.error('❌ 오류:', error);
    throw error;
  }
}

findExtraPartners()
  .then(() => process.exit(0))
  .catch(err => { console.error(err); process.exit(1); });
