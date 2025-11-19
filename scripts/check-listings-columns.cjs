/**
 * listings 테이블의 실제 컬럼 구조 확인
 * 목적: cart checkout에서 사용하는 price 관련 컬럼이 실제로 존재하는지 검증
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function checkListingsColumns() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🔍 listings 테이블 컬럼 구조 확인 중...\n');

    // 1. DESCRIBE로 테이블 구조 확인
    const describeResult = await connection.execute('DESCRIBE listings');

    console.log('📊 listings 테이블 전체 컬럼 목록:');
    console.log('=' + '='.repeat(80));
    describeResult.rows.forEach(col => {
      console.log(`  ${col.Field.padEnd(30)} ${col.Type.padEnd(20)} ${col.Null} ${col.Key} ${col.Default || 'NULL'}`);
    });
    console.log('=' + '='.repeat(80) + '\n');

    // 2. Price 관련 컬럼만 필터링
    const priceColumns = describeResult.rows.filter(col =>
      col.Field.includes('price') || col.Field.includes('fee') || col.Field.includes('admission')
    );

    console.log('💰 Price 관련 컬럼:');
    console.log('-'.repeat(80));
    if (priceColumns.length > 0) {
      priceColumns.forEach(col => {
        console.log(`  ✅ ${col.Field.padEnd(30)} ${col.Type}`);
      });
    } else {
      console.log('  ⚠️ Price 관련 컬럼을 찾을 수 없습니다!');
    }
    console.log('-'.repeat(80) + '\n');

    // 3. 카테고리별로 샘플 데이터 조회
    const categories = [
      { name: '팝업', category_id: 1857 },
      { name: '투어', category_id: 1855 },
      { name: '음식', category_id: 1858 },
      { name: '관광지', category_id: 1859 },
      { name: '이벤트', category_id: 1861 },
      { name: '체험', category_id: 1862 }
    ];

    for (const cat of categories) {
      const sampleResult = await connection.execute(`
        SELECT
          id,
          title,
          category_id,
          price_from,
          price_to
        FROM listings
        WHERE category_id = ?
        AND is_active = 1
        LIMIT 1
      `, [cat.category_id]);

      if (sampleResult.rows && sampleResult.rows.length > 0) {
        const sample = sampleResult.rows[0];
        console.log(`📦 ${cat.name} 카테고리 샘플:`);
        console.log(`    listing_id: ${sample.id}`);
        console.log(`    제목: ${sample.title}`);
        console.log(`    price_from: ${sample.price_from || 'NULL'}`);
        console.log(`    price_to: ${sample.price_to || 'NULL'}`);

        // 특정 컬럼이 있는지 시도
        try {
          const detailResult = await connection.execute(`
            SELECT
              adult_price,
              child_price,
              infant_price,
              senior_price
            FROM listings
            WHERE id = ?
            LIMIT 1
          `, [sample.id]);

          if (detailResult.rows && detailResult.rows.length > 0) {
            const detail = detailResult.rows[0];
            console.log(`    ✅ adult_price: ${detail.adult_price || 'NULL'}`);
            console.log(`    ✅ child_price: ${detail.child_price || 'NULL'}`);
            console.log(`    ✅ infant_price: ${detail.infant_price || 'NULL'}`);
            console.log(`    ✅ senior_price: ${detail.senior_price || 'NULL'}`);
          }
        } catch (err) {
          console.log(`    ❌ adult_price, child_price 등의 컬럼이 존재하지 않음: ${err.message}`);
        }

        // admission_fee_* 컬럼 시도
        try {
          const feeResult = await connection.execute(`
            SELECT
              admission_fee_adult,
              admission_fee_child,
              admission_fee_senior,
              admission_fee_infant
            FROM listings
            WHERE id = ?
            LIMIT 1
          `, [sample.id]);

          if (feeResult.rows && feeResult.rows.length > 0) {
            const fee = feeResult.rows[0];
            console.log(`    ✅ admission_fee_adult: ${fee.admission_fee_adult || 'NULL'}`);
            console.log(`    ✅ admission_fee_child: ${fee.admission_fee_child || 'NULL'}`);
            console.log(`    ✅ admission_fee_senior: ${fee.admission_fee_senior || 'NULL'}`);
            console.log(`    ✅ admission_fee_infant: ${fee.admission_fee_infant || 'NULL'}`);
          }
        } catch (err) {
          console.log(`    ❌ admission_fee_* 컬럼이 존재하지 않음: ${err.message}`);
        }

        console.log('');
      } else {
        console.log(`⚠️ ${cat.name} 카테고리에 활성 상품이 없습니다.\n`);
      }
    }

    // 4. cart checkout 시 사용되는 컬럼 검증
    console.log('\n🛒 Cart Checkout에서 필요한 컬럼 검증:');
    console.log('-'.repeat(80));

    const requiredColumns = [
      'price_from',
      'adult_price',
      'child_price',
      'infant_price',
      'senior_price'
    ];

    const existingColumns = describeResult.rows.map(col => col.Field);

    requiredColumns.forEach(col => {
      if (existingColumns.includes(col)) {
        console.log(`  ✅ ${col.padEnd(20)} - 존재함`);
      } else {
        console.log(`  ❌ ${col.padEnd(20)} - 존재하지 않음 (api/orders.js에서 사용 중!)`);
      }
    });

    console.log('-'.repeat(80) + '\n');

    console.log('✅ 컬럼 구조 확인 완료\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    console.error('상세:', error.message);
  } finally {
    process.exit(0);
  }
}

checkListingsColumns();
