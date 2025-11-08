require('dotenv').config();
const { connect } = require('@planetscale/database');

async function testStayAPI() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('🔍 /category/stay API 시뮬레이션...\n');

  try {
    // 1. stay 카테고리 ID 확인
    const categoryResult = await conn.execute(`
      SELECT id FROM categories WHERE slug = 'stay' LIMIT 1
    `);

    const categoryId = categoryResult.rows?.[0]?.id || 1857;
    console.log(`stay 카테고리 ID: ${categoryId}\n`);

    // 2. /api/accommodations의 실제 쿼리
    const hotelsResult = await conn.execute(`
      SELECT
        p.id as partner_id,
        p.business_name,
        COUNT(DISTINCT l.id) as room_count,
        MIN(l.price_from) as min_price,
        MAX(l.price_from) as max_price
      FROM partners p
      LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = ? AND l.is_published = 1 AND l.is_active = 1
      WHERE p.is_active = 1 AND (p.partner_type = 'lodging' OR p.partner_type IS NULL)
      GROUP BY p.id, p.business_name
      HAVING room_count > 0
    `, [categoryId, categoryId]);

    console.log(`=== /category/stay에 표시될 호텔: ${hotelsResult.rows?.length || 0}개 ===\n`);

    if (hotelsResult.rows && hotelsResult.rows.length > 0) {
      hotelsResult.rows.forEach(hotel => {
        console.log(`✅ ${hotel.business_name}`);
        console.log(`   - 객실 수: ${hotel.room_count}개`);
        console.log(`   - 가격: ₩${hotel.min_price?.toLocaleString()} ~ ₩${hotel.max_price?.toLocaleString()}\n`);
      });
    } else {
      console.log('❌ 표시될 호텔이 없습니다!\n');

      // 3. 왜 안 나타나는지 분석
      console.log('=== 문제 분석 ===\n');

      // lodging 파트너 확인
      const lodgingPartners = await conn.execute(`
        SELECT id, business_name, is_active
        FROM partners
        WHERE partner_type = 'lodging'
      `);
      console.log(`lodging 파트너: ${lodgingPartners.rows?.length || 0}개`);
      lodgingPartners.rows?.forEach(p => {
        console.log(`  - ID ${p.id}: ${p.business_name} (active: ${p.is_active})`);
      });

      // 객실 확인
      console.log('\n객실 (listings) 확인:');
      const rooms = await conn.execute(`
        SELECT l.id, l.partner_id, l.title, l.category_id, l.is_published, l.is_active, p.business_name
        FROM listings l
        JOIN partners p ON l.partner_id = p.id
        WHERE p.partner_type = 'lodging'
      `);
      console.log(`lodging 파트너의 객실: ${rooms.rows?.length || 0}개`);
      rooms.rows?.forEach(r => {
        console.log(`  - ${r.business_name}: ${r.title} (cat: ${r.category_id}, pub: ${r.is_published}, act: ${r.is_active})`);
      });
    }

  } catch (error) {
    console.error('❌ 오류:', error);
    throw error;
  }
}

testStayAPI()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
