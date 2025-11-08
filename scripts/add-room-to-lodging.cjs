require('dotenv').config();
const { connect } = require('@planetscale/database');

async function addRoomToLodging() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('🏨 기존 숙박 파트너에 객실 추가...\n');

  try {
    // 1. stay 카테고리 ID 확인
    const categoryResult = await conn.execute(`
      SELECT id FROM categories WHERE slug = 'stay' LIMIT 1
    `);

    const categoryId = categoryResult.rows?.[0]?.id || 1857;
    console.log(`✅ stay 카테고리 ID: ${categoryId}\n`);

    // 2. lodging 파트너 중 첫 번째 선택
    const partnerResult = await conn.execute(`
      SELECT id, business_name
      FROM partners
      WHERE partner_type = 'lodging'
      ORDER BY id ASC
      LIMIT 1
    `);

    if (!partnerResult.rows || partnerResult.rows.length === 0) {
      console.error('❌ lodging 파트너가 없습니다!');
      return;
    }

    const partner = partnerResult.rows[0];
    console.log(`✅ 선택된 파트너: ${partner.business_name} (ID: ${partner.id})\n`);

    // 3. 객실 추가 (listings 테이블)
    const images = JSON.stringify([
      'https://images.unsplash.com/photo-1566073771259-6a8506099945',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b'
    ]);

    const roomResult = await conn.execute(`
      INSERT INTO listings (
        partner_id, category_id, title, description_md, location, address,
        price_from, images, is_published, is_active, is_featured,
        rating_avg, rating_count,
        created_at, updated_at
      ) VALUES (
        ?, ?, '디럭스 더블룸',
        '넓고 편안한 디럭스 더블룸입니다. 바다 전망과 함께 휴식을 취하실 수 있습니다.',
        '신안군', '전남 신안군',
        120000, ?, 1, 1, 0,
        4.5, 10,
        NOW(), NOW()
      )
    `, [partner.id, categoryId, images]);

    console.log(`✅ 객실 추가 완료 - ID: ${roomResult.insertId}\n`);

    // 4. 결과 확인
    const checkResult = await conn.execute(`
      SELECT
        p.id as partner_id,
        p.business_name,
        COUNT(l.id) as room_count,
        MIN(l.price_from) as min_price
      FROM partners p
      LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = ?
      WHERE p.id = ?
      GROUP BY p.id, p.business_name
    `, [categoryId, partner.id]);

    console.log('=== 결과 확인 ===');
    console.log(`업체명: ${checkResult.rows[0].business_name}`);
    console.log(`객실 수: ${checkResult.rows[0].room_count}개`);
    console.log(`최저가: ₩${checkResult.rows[0].min_price?.toLocaleString()}`);

    console.log('\n✅ 완료! 이제 /category/stay에 표시됩니다.');

  } catch (error) {
    console.error('❌ 오류:', error);
    throw error;
  }
}

addRoomToLodging()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
