require('dotenv').config();
const { connect } = require('@planetscale/database');

async function createTestAccommodation() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('🏨 테스트 숙박 업체 생성 중...\n');

  try {
    // 1. stay 카테고리 ID 확인
    const categoryResult = await conn.execute(`
      SELECT id FROM categories WHERE slug = 'stay' LIMIT 1
    `);

    const categoryId = categoryResult.rows?.[0]?.id;
    console.log(`✅ stay 카테고리 ID: ${categoryId}\n`);

    if (!categoryId) {
      console.error('❌ stay 카테고리가 없습니다!');
      return;
    }

    // 2. 테스트 파트너 생성 (partner_type='lodging')
    const partnerResult = await conn.execute(`
      INSERT INTO partners (
        user_id, partner_type, business_name, contact_name, email, phone,
        location, business_address, description,
        tier, status, is_active, is_verified, is_featured,
        created_at, updated_at
      ) VALUES (
        1, 'lodging', '테스트 호텔', '홍길동', 'test-hotel@example.com', '010-1234-5678',
        '신안군', '전남 신안군 임자면 대광해수욕장길 123', '테스트용 호텔입니다. 아름다운 바다 전망을 자랑합니다.',
        'gold', 'approved', 1, 1, 1,
        NOW(), NOW()
      )
    `);

    const partnerId = partnerResult.insertId;
    console.log(`✅ 파트너 생성 완료 - ID: ${partnerId}\n`);

    // 3. 테스트 객실 생성 (listings 테이블)
    const images = JSON.stringify([
      'https://images.unsplash.com/photo-1566073771259-6a8506099945',
      'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b'
    ]);

    const room1Result = await conn.execute(`
      INSERT INTO listings (
        partner_id, category_id, title, description_md, location, address,
        price_from, images, is_published, is_active, is_featured,
        rating_avg, rating_count,
        created_at, updated_at
      ) VALUES (
        ?, ?, '디럭스 더블룸',
        '넓은 바다 전망의 디럭스 더블룸입니다. 킹사이즈 침대와 발코니가 제공됩니다.',
        '신안군', '전남 신안군 임자면 대광해수욕장길 123',
        150000, ?, 1, 1, 0,
        4.5, 12,
        NOW(), NOW()
      )
    `, [partnerId, categoryId, images]);

    console.log(`✅ 객실 1 생성 완료 - ID: ${room1Result.insertId}`);

    const room2Result = await conn.execute(`
      INSERT INTO listings (
        partner_id, category_id, title, description_md, location, address,
        price_from, images, is_published, is_active, is_featured,
        rating_avg, rating_count,
        created_at, updated_at
      ) VALUES (
        ?, ?, '스탠다드 트윈룸',
        '편안한 스탠다드 트윈룸입니다. 2개의 싱글 침대가 제공됩니다.',
        '신안군', '전남 신안군 임자면 대광해수욕장길 123',
        120000, ?, 1, 1, 0,
        4.3, 8,
        NOW(), NOW()
      )
    `, [partnerId, categoryId, images]);

    console.log(`✅ 객실 2 생성 완료 - ID: ${room2Result.insertId}`);

    // 4. 결과 확인
    const checkResult = await conn.execute(`
      SELECT
        p.id as partner_id,
        p.business_name,
        COUNT(l.id) as room_count,
        MIN(l.price_from) as min_price,
        MAX(l.price_from) as max_price
      FROM partners p
      LEFT JOIN listings l ON p.id = l.partner_id AND l.category_id = ?
      WHERE p.id = ?
      GROUP BY p.id, p.business_name
    `, [categoryId, partnerId]);

    console.log('\n=== 생성 결과 ===');
    console.log(checkResult.rows[0]);

    console.log('\n✅ 테스트 숙박 업체 생성 완료!');
    console.log('   - 파트너: 테스트 호텔');
    console.log('   - 객실: 2개 (디럭스 더블룸, 스탠다드 트윈룸)');
    console.log('   - 가격: ₩120,000 ~ ₩150,000');
    console.log('\n🌐 확인: https://travelap.vercel.app/category/stay');

  } catch (error) {
    console.error('❌ 오류:', error);
    throw error;
  }
}

createTestAccommodation()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
