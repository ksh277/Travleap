/**
 * listings 테이블의 category 필드를 categories 테이블의 slug로 업데이트
 *
 * 문제: category_id는 1857(숙박)인데 category 필드는 "여행"으로 남아있음
 * 해결: category_id를 기준으로 categories.slug 값으로 업데이트
 */
require('dotenv').config();
const { connect } = require('@planetscale/database');

(async () => {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('📊 listings 테이블 category 필드 데이터 정합성 수정\n');
    console.log('='.repeat(80));

    // 현재 상태 확인
    console.log('\n1️⃣ 수정 전 상태 확인:');
    const beforeResult = await connection.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN l.category != c.slug THEN 1 ELSE 0 END) as mismatched
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE l.category_id IS NOT NULL
    `);

    console.log(`   총 레코드: ${beforeResult.rows[0].total}`);
    console.log(`   불일치: ${beforeResult.rows[0].mismatched}개\n`);

    // 샘플 불일치 데이터 표시
    console.log('2️⃣ 불일치 샘플:');
    const sampleResult = await connection.execute(`
      SELECT
        l.id,
        l.title,
        l.category as current_category,
        c.slug as correct_category,
        c.name_ko
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE l.category_id IS NOT NULL AND l.category != c.slug
      LIMIT 10
    `);

    if (sampleResult.rows && sampleResult.rows.length > 0) {
      sampleResult.rows.forEach(row => {
        console.log(`   ID ${row.id}: "${row.current_category}" → "${row.correct_category}" (${row.name_ko})`);
      });
    } else {
      console.log('   ✅ 불일치 없음');
    }

    // 수정 진행
    console.log('\n3️⃣ category 필드 업데이트 중...');

    // MySQL에서는 UPDATE JOIN 사용
    const updateResult = await connection.execute(`
      UPDATE listings l
      INNER JOIN categories c ON l.category_id = c.id
      SET l.category = c.slug
      WHERE l.category_id IS NOT NULL AND l.category != c.slug
    `);

    console.log(`   ✅ ${updateResult.rowsAffected || 0}개 레코드 업데이트 완료\n`);

    // 수정 후 확인
    console.log('4️⃣ 수정 후 상태 확인:');
    const afterResult = await connection.execute(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN l.category != c.slug THEN 1 ELSE 0 END) as mismatched
      FROM listings l
      LEFT JOIN categories c ON l.category_id = c.id
      WHERE l.category_id IS NOT NULL
    `);

    console.log(`   총 레코드: ${afterResult.rows[0].total}`);
    console.log(`   불일치: ${afterResult.rows[0].mismatched}개`);

    if (afterResult.rows[0].mismatched === 0) {
      console.log('\n✅ 모든 데이터 정합성 확보!');
    } else {
      console.log('\n⚠️ 여전히 불일치 데이터 있음');
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ 완료!\n');

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
