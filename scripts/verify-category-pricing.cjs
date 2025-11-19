/**
 * 카테고리별 가격 시스템 검증
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function verifyCategoryPricing() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('📊 카테고리별 가격 시스템 확인\n');
    console.log('=' + '='.repeat(80));

    // 1. 카테고리 목록과 ID 확인
    console.log('\n1️⃣ 전체 카테고리 목록:\n');

    const categories = await connection.execute(`
      SELECT id, name_ko, name_en, slug
      FROM categories
      ORDER BY id
    `);

    console.table(categories.rows);

    // 2. pages/api/orders.js에 정의된 booking-based categories
    const bookingBasedCategories = [1855, 1858, 1859, 1861, 1862];
    console.log('\n2️⃣ Booking-based categories (인원별 가격 사용):\n');
    console.log('Category IDs:', bookingBasedCategories);

    const bookingCats = await connection.execute(`
      SELECT id, name_ko, name_en, slug
      FROM categories
      WHERE id IN (?, ?, ?, ?, ?)
    `, bookingBasedCategories);

    console.table(bookingCats.rows);

    // 3. 각 카테고리별 가격 컬럼 사용 현황
    console.log('\n3️⃣ 카테고리별 가격 컬럼 사용 현황:\n');

    const priceUsage = await connection.execute(`
      SELECT
        c.id as category_id,
        c.name_ko,
        COUNT(l.id) as total_listings,
        SUM(CASE WHEN l.adult_price IS NOT NULL AND l.adult_price > 0 THEN 1 ELSE 0 END) as has_adult_price,
        SUM(CASE WHEN l.child_price IS NOT NULL AND l.child_price > 0 THEN 1 ELSE 0 END) as has_child_price,
        SUM(CASE WHEN l.senior_price IS NOT NULL AND l.senior_price > 0 THEN 1 ELSE 0 END) as has_senior_price,
        SUM(CASE WHEN l.infant_price IS NOT NULL AND l.infant_price > 0 THEN 1 ELSE 0 END) as has_infant_price
      FROM categories c
      LEFT JOIN listings l ON c.id = l.category_id AND l.is_active = 1
      GROUP BY c.id, c.name_ko
      ORDER BY c.id
    `);

    console.table(priceUsage.rows);

    // 4. 주요 카테고리 샘플 데이터
    console.log('\n4️⃣ 관광지/투어/체험 샘플 데이터:\n');

    const samples = await connection.execute(`
      SELECT
        l.id,
        l.title,
        c.name_ko as category,
        l.price_from,
        l.adult_price,
        l.child_price,
        l.senior_price,
        l.infant_price
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE l.category_id IN (1855, 1858, 1859, 1861, 1862)
      AND l.is_active = 1
      LIMIT 5
    `);

    console.table(samples.rows);

    console.log('\n✅ 검증 완료');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    throw error;
  }
}

verifyCategoryPricing();
