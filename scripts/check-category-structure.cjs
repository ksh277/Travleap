/**
 * 카테고리별 DB 구조 분석
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkCategoryStructure() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('=== 카테고리별 상태 분석 ===\n');

  try {
    // 1. categories 테이블 구조 확인
    console.log('1. categories 테이블 컬럼:');
    const catColumns = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'categories'
      ORDER BY ORDINAL_POSITION
    `);
    console.table(catColumns.rows);

    // 2. 카테고리 목록 확인
    console.log('\n2. 카테고리 목록:');
    const categories = await connection.execute(`
      SELECT * FROM categories LIMIT 20
    `);
    console.table(categories.rows);

    // 3. listings 테이블 주요 컬럼
    console.log('\n3. listings 테이블 주요 컬럼:');
    const listingsColumns = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'listings'
      ORDER BY ORDINAL_POSITION
    `);
    console.table(listingsColumns.rows);

    // 4. bookings 테이블 컬럼
    console.log('\n4. bookings 테이블 컬럼:');
    const bookingsColumns = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'bookings'
      ORDER BY ORDINAL_POSITION
    `);
    console.table(bookingsColumns.rows);

    // 5. 옵션/메뉴 관련 테이블
    console.log('\n5. 옵션/메뉴 관련 테이블:');
    const optionsTables = await connection.execute(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_NAME LIKE '%option%'
         OR TABLE_NAME LIKE '%menu%'
         OR TABLE_NAME LIKE '%extra%'
         OR TABLE_NAME LIKE '%room%'
    `);
    console.table(optionsTables.rows);

    // 6. 카테고리별 상품 수
    console.log('\n6. 카테고리별 상품 수:');
    const listingsCount = await connection.execute(`
      SELECT
        category_id,
        COUNT(*) as count
      FROM listings
      GROUP BY category_id
      ORDER BY category_id
    `);
    console.table(listingsCount.rows);

  } catch (error) {
    console.error('오류:', error.message);
  }

  console.log('\n=== 분석 완료 ===');
}

checkCategoryStructure();
