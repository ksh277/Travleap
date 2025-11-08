require('dotenv').config();
const { connect } = require('@planetscale/database');

async function deletePartnerListings() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('🗑️ 파트너 관리의 lodging 6개에 추가된 listings 삭제...\n');

  try {
    // 1. stay 카테고리 ID
    const categoryResult = await conn.execute(`
      SELECT id FROM categories WHERE slug = 'stay' LIMIT 1
    `);
    const categoryId = categoryResult.rows?.[0]?.id || 1857;

    // 2. 파트너 관리의 lodging 파트너들의 listings 확인
    const checkResult = await conn.execute(`
      SELECT l.id, l.partner_id, p.business_name, l.title
      FROM listings l
      JOIN partners p ON l.partner_id = p.id
      WHERE p.partner_type = 'lodging' AND l.category_id = ?
    `, [categoryId]);

    console.log(`삭제할 listings: ${checkResult.rows?.length || 0}개\n`);

    checkResult.rows?.forEach(r => {
      console.log(`- ID ${r.id}: ${r.business_name} - ${r.title}`);
    });

    // 3. 삭제
    if (checkResult.rows && checkResult.rows.length > 0) {
      await conn.execute(`
        DELETE l FROM listings l
        JOIN partners p ON l.partner_id = p.id
        WHERE p.partner_type = 'lodging' AND l.category_id = ?
      `, [categoryId]);

      console.log(`\n✅ ${checkResult.rows.length}개 listings 삭제 완료`);
      console.log('이제 /category/stay가 비어있습니다.');
      console.log('숙박 관리 탭에서 추가하면 그때 나타납니다.');
    } else {
      console.log('\n삭제할 listings가 없습니다.');
    }

  } catch (error) {
    console.error('❌ 오류:', error);
    throw error;
  }
}

deletePartnerListings()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
