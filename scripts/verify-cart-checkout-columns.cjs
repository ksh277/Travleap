/**
 * 장바구니/결제 시스템 컬럼 검증
 * listings 테이블의 가격 컬럼명 확인
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function verifyColumns() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🔍 LISTINGS 테이블 가격 컬럼 확인\n');
    console.log('=' + '='.repeat(80));

    // 1. 테이블 구조 확인
    console.log('\n1️⃣ 가격 관련 컬럼 스키마:\n');

    const schemaResult = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'listings'
      AND (COLUMN_NAME LIKE '%price%' OR COLUMN_NAME LIKE '%fee%')
      ORDER BY ORDINAL_POSITION
    `);

    console.table(schemaResult.rows);

    // 2. admission_fee_* 컬럼이 존재하는지 확인
    console.log('\n2️⃣ admission_fee_* 컬럼 존재 여부:\n');

    const admissionFeeColumns = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'listings'
      AND COLUMN_NAME LIKE 'admission_fee_%'
    `);

    if (admissionFeeColumns.rows.length > 0) {
      console.log('⚠️  admission_fee_* 컬럼 발견:');
      console.table(admissionFeeColumns.rows);
    } else {
      console.log('✅ admission_fee_* 컬럼 없음 (adult_price, child_price 등 사용)');
    }

    // 3. 실제 데이터 샘플 확인
    console.log('\n3️⃣ 카테고리별 가격 데이터 샘플:\n');

    const sampleData = await connection.execute(`
      SELECT
        l.id,
        l.title,
        c.name as category_name,
        l.price_from,
        l.adult_price,
        l.child_price,
        l.senior_price,
        l.infant_price
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE l.category_id IN (3, 4, 5, 6, 7)
      AND l.is_active = 1
      LIMIT 10
    `);

    console.table(sampleData.rows);

    // 4. NULL 값 체크
    console.log('\n4️⃣ 가격 컬럼 NULL 현황:\n');

    const nullCheck = await connection.execute(`
      SELECT
        c.name as category_name,
        COUNT(*) as total_listings,
        SUM(CASE WHEN adult_price IS NULL THEN 1 ELSE 0 END) as adult_price_null,
        SUM(CASE WHEN child_price IS NULL THEN 1 ELSE 0 END) as child_price_null,
        SUM(CASE WHEN senior_price IS NULL THEN 1 ELSE 0 END) as senior_price_null,
        SUM(CASE WHEN infant_price IS NULL THEN 1 ELSE 0 END) as infant_price_null
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE l.category_id IN (3, 4, 5, 6, 7)
      AND l.is_active = 1
      GROUP BY c.name
    `);

    console.table(nullCheck.rows);

    console.log('\n✅ 검증 완료');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    throw error;
  }
}

verifyColumns();
