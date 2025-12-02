/**
 * 옵션 시스템 전체 검증 스크립트
 */
const { connect } = require('@planetscale/database');
require('dotenv').config();

async function verifyOptionSystem() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║         옵션 시스템 전체 검증 시작                          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  let errors = [];
  let warnings = [];

  // 1. listing_options 테이블 구조 검증
  console.log('=== 1. listing_options 테이블 구조 ===');
  try {
    const cols = await conn.execute('DESCRIBE listing_options');
    const columnNames = cols.rows.map(r => r.Field);
    console.log('  컬럼:', columnNames.join(', '));

    // 필수 컬럼 확인
    const requiredCols = ['id', 'listing_id', 'option_type', 'name', 'price', 'available_count'];
    for (const col of requiredCols) {
      if (!columnNames.includes(col)) {
        errors.push(`listing_options에 ${col} 컬럼 없음`);
        console.log(`  ❌ ${col} 컬럼 없음!`);
      } else {
        console.log(`  ✅ ${col} 컬럼 존재`);
      }
    }
  } catch (e) {
    errors.push('listing_options 테이블 없음: ' + e.message);
    console.log('  ❌ listing_options 테이블이 없습니다!');
  }

  // 2. listing_options 데이터 확인
  console.log('\n=== 2. listing_options 데이터 ===');
  try {
    const count = await conn.execute('SELECT COUNT(*) as cnt FROM listing_options');
    console.log(`  총 ${count.rows[0].cnt}개 옵션`);

    const byType = await conn.execute(`
      SELECT option_type, COUNT(*) as cnt
      FROM listing_options
      GROUP BY option_type
    `);
    console.log('  타입별:');
    byType.rows.forEach(r => console.log(`    - ${r.option_type || 'NULL'}: ${r.cnt}개`));

    // 샘플 데이터
    const samples = await conn.execute(`
      SELECT lo.id, lo.listing_id, lo.option_type, lo.name, lo.price, lo.available_count, l.title as listing_title
      FROM listing_options lo
      LEFT JOIN listings l ON lo.listing_id = l.id
      LIMIT 5
    `);
    if (samples.rows.length > 0) {
      console.log('  샘플 데이터:');
      samples.rows.forEach(r => {
        console.log(`    [${r.id}] ${r.listing_title || 'N/A'} - ${r.option_type}: ${r.name} (${r.price}원, 재고:${r.available_count})`);
      });
    }
  } catch (e) {
    console.log('  ❌ 데이터 조회 실패:', e.message);
  }

  // 3. listings.has_options 필드 확인
  console.log('\n=== 3. listings.has_options 필드 ===');
  try {
    const hasField = await conn.execute("SHOW COLUMNS FROM listings LIKE 'has_options'");
    if (hasField.rows.length > 0) {
      console.log('  ✅ has_options 필드 존재:', hasField.rows[0].Type);

      const withOptions = await conn.execute(`
        SELECT category, COUNT(*) as cnt
        FROM listings
        WHERE has_options = 1
        GROUP BY category
      `);
      console.log('  has_options=1인 상품 카테고리별:');
      withOptions.rows.forEach(r => console.log(`    - ${r.category}: ${r.cnt}개`));
    } else {
      warnings.push('listings.has_options 필드 없음');
      console.log('  ⚠️ has_options 필드가 없습니다');
    }
  } catch (e) {
    console.log('  ❌', e.message);
  }

  // 4. bookings.selected_option_id 필드 확인
  console.log('\n=== 4. bookings.selected_option_id 필드 ===');
  try {
    const hasField = await conn.execute("SHOW COLUMNS FROM bookings LIKE 'selected_option_id'");
    if (hasField.rows.length > 0) {
      console.log('  ✅ selected_option_id 필드 존재:', hasField.rows[0].Type);

      // 옵션이 선택된 예약 확인
      const withOption = await conn.execute(`
        SELECT COUNT(*) as cnt FROM bookings WHERE selected_option_id IS NOT NULL
      `);
      console.log(`  옵션 선택된 예약: ${withOption.rows[0].cnt}개`);
    } else {
      warnings.push('bookings.selected_option_id 필드 없음');
      console.log('  ⚠️ selected_option_id 필드가 없습니다');
    }
  } catch (e) {
    console.log('  ❌', e.message);
  }

  // 5. booking_options 테이블 확인
  console.log('\n=== 5. booking_options 테이블 ===');
  try {
    const cols = await conn.execute('DESCRIBE booking_options');
    console.log('  ✅ booking_options 테이블 존재');
    console.log('  컬럼:', cols.rows.map(r => r.Field).join(', '));

    const count = await conn.execute('SELECT COUNT(*) as cnt FROM booking_options');
    console.log(`  총 ${count.rows[0].cnt}개 레코드`);
  } catch (e) {
    warnings.push('booking_options 테이블 없음');
    console.log('  ⚠️ booking_options 테이블이 없습니다 (선택적)');
  }

  // 6. 옵션-상품 연결 무결성 검사
  console.log('\n=== 6. 옵션-상품 연결 무결성 ===');
  try {
    const orphans = await conn.execute(`
      SELECT lo.id, lo.listing_id, lo.name
      FROM listing_options lo
      LEFT JOIN listings l ON lo.listing_id = l.id
      WHERE l.id IS NULL
      LIMIT 5
    `);
    if (orphans.rows.length > 0) {
      warnings.push(`고아 옵션 ${orphans.rows.length}개 발견`);
      console.log(`  ⚠️ 상품이 없는 옵션 ${orphans.rows.length}개 발견:`);
      orphans.rows.forEach(r => console.log(`    - ID:${r.id} listing_id:${r.listing_id} ${r.name}`));
    } else {
      console.log('  ✅ 모든 옵션이 유효한 상품에 연결됨');
    }
  } catch (e) {
    console.log('  ❌', e.message);
  }

  // 7. 재고 음수 확인
  console.log('\n=== 7. 재고 음수 확인 ===');
  try {
    const negativeStock = await conn.execute(`
      SELECT id, listing_id, name, available_count
      FROM listing_options
      WHERE available_count < 0
    `);
    if (negativeStock.rows.length > 0) {
      errors.push(`음수 재고 ${negativeStock.rows.length}개 발견`);
      console.log(`  ❌ 음수 재고 ${negativeStock.rows.length}개 발견!`);
      negativeStock.rows.forEach(r => console.log(`    - ID:${r.id} ${r.name}: ${r.available_count}`));
    } else {
      console.log('  ✅ 음수 재고 없음');
    }
  } catch (e) {
    console.log('  ❌', e.message);
  }

  // 결과 요약
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                      검증 결과                              ║');
  console.log('╠═══════════════════════════════════════════════════════════╣');
  console.log(`║  ❌ 오류: ${errors.length}개                                           `);
  console.log(`║  ⚠️  경고: ${warnings.length}개                                          `);
  console.log('╚═══════════════════════════════════════════════════════════╝');

  if (errors.length > 0) {
    console.log('\n❌ 오류 목록:');
    errors.forEach(e => console.log(`  - ${e}`));
  }

  if (warnings.length > 0) {
    console.log('\n⚠️ 경고 목록:');
    warnings.forEach(w => console.log(`  - ${w}`));
  }

  return { errors, warnings };
}

verifyOptionSystem()
  .then(result => {
    process.exit(result.errors.length > 0 ? 1 : 0);
  })
  .catch(err => {
    console.error('스크립트 실행 오류:', err);
    process.exit(1);
  });
