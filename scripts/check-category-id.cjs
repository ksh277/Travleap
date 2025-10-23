require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkCategoryId() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('\n=== categories 테이블 확인 ===\n');

    // categories 테이블 구조 확인
    const categoriesSchema = await connection.execute('DESCRIBE categories');
    console.log('categories 테이블 구조:');
    categoriesSchema.rows.forEach(row => {
      console.log(`  ${row.Field.padEnd(20)} ${row.Type}`);
    });

    // stay 카테고리 확인
    console.log('\n=== stay 카테고리 조회 ===\n');
    const stayCategory = await connection.execute(
      `SELECT * FROM categories WHERE slug = 'stay' OR name_ko LIKE '%숙박%' OR name_en LIKE '%stay%'`
    );

    if (stayCategory.rows && stayCategory.rows.length > 0) {
      console.log('Stay 카테고리 발견:');
      stayCategory.rows.forEach(cat => {
        console.log(`  ID: ${cat.id}, Name: ${cat.name}, Slug: ${cat.slug}`);
      });
    } else {
      console.log('Stay 카테고리 없음 - 모든 카테고리 조회:\n');
      const allCategories = await connection.execute('SELECT * FROM categories');
      allCategories.rows.forEach(cat => {
        console.log(`  ID: ${cat.id}, Name: ${cat.name}, Slug: ${cat.slug || 'N/A'}`);
      });
    }

    // listings 테이블의 category 값들 확인
    console.log('\n=== listings 테이블의 category 값 확인 ===\n');
    const distinctCategories = await connection.execute(
      `SELECT DISTINCT category, category_id FROM listings LIMIT 10`
    );

    if (distinctCategories.rows && distinctCategories.rows.length > 0) {
      console.log('현재 사용 중인 category 값들:');
      distinctCategories.rows.forEach(row => {
        console.log(`  category: "${row.category}", category_id: ${row.category_id}`);
      });
    }

  } catch (error) {
    console.error('\nError:', error.message);
  }
}

checkCategoryId();
