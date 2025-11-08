require('dotenv').config();
const { connect } = require('@planetscale/database');

async function addRoomsToAllLodging() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('🏨 모든 숙박 파트너에 객실 추가...\n');

  try {
    // 1. stay 카테고리 ID
    const categoryResult = await conn.execute(`
      SELECT id FROM categories WHERE slug = 'stay' LIMIT 1
    `);
    const categoryId = categoryResult.rows?.[0]?.id || 1857;

    // 2. 객실이 없는 lodging 파트너 조회
    const partnersResult = await conn.execute(`
      SELECT p.id, p.business_name
      FROM partners p
      LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = ?
      WHERE p.partner_type = 'lodging'
      GROUP BY p.id, p.business_name
      HAVING COUNT(l.id) = 0
    `, [categoryId]);

    const partners = partnersResult.rows || [];
    console.log(`객실이 없는 숙박 파트너: ${partners.length}개\n`);

    if (partners.length === 0) {
      console.log('✅ 모든 파트너에 객실이 있습니다!');
      return;
    }

    const images = JSON.stringify([
      'https://images.unsplash.com/photo-1566073771259-6a8506099945',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b'
    ]);

    // 3. 각 파트너에 객실 추가
    for (const partner of partners) {
      const price = 100000 + Math.floor(Math.random() * 100000); // 10만~20만원

      await conn.execute(`
        INSERT INTO listings (
          partner_id, category_id, title, description_md, location, address,
          price_from, images, is_published, is_active, is_featured,
          rating_avg, rating_count,
          created_at, updated_at
        ) VALUES (
          ?, ?, '스탠다드룸',
          '깨끗하고 편안한 객실입니다.',
          '신안군', '전남 신안군',
          ?, ?, 1, 1, 0,
          4.2, 5,
          NOW(), NOW()
        )
      `, [partner.id, categoryId, price, images]);

      console.log(`✅ ${partner.business_name} - 객실 추가 (₩${price.toLocaleString()})`);
    }

    // 4. 최종 확인
    const finalResult = await conn.execute(`
      SELECT
        p.id,
        p.business_name,
        COUNT(l.id) as room_count,
        MIN(l.price_from) as min_price
      FROM partners p
      LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = ?
      WHERE p.partner_type = 'lodging'
      GROUP BY p.id, p.business_name
      ORDER BY p.id
    `, [categoryId]);

    console.log('\n=== 최종 결과 ===');
    finalResult.rows?.forEach(p => {
      console.log(`${p.business_name}: ${p.room_count}개 객실, 최저 ₩${p.min_price?.toLocaleString()}`);
    });

    const withRooms = finalResult.rows?.filter(p => p.room_count > 0).length || 0;
    console.log(`\n✅ 완료! /category/stay에 ${withRooms}개 업체 표시됩니다.`);

  } catch (error) {
    console.error('❌ 오류:', error);
    throw error;
  }
}

addRoomsToAllLodging()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
