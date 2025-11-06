/**
 * listings 테이블 is_published 컬럼 수정
 *
 * 문제: api/listings.js는 is_published=1 조건으로 조회하지만,
 *       상품 추가 스크립트는 is_published를 설정하지 않음
 *
 * 해결:
 * 1. is_published 컬럼이 없으면 추가
 * 2. 기존 활성화된 상품들의 is_published를 1로 업데이트
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function fixListingsPublished() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n🔧 listings 테이블 is_published 컬럼 수정 시작...\n');

  try {
    // 1. 현재 상태 확인
    console.log('1️⃣ 현재 listings 테이블 구조 확인...');
    const columnsResult = await connection.execute('DESCRIBE listings');
    const columns = (columnsResult.rows || []).map(col => col.Field);
    const hasPublished = columns.includes('is_published');

    console.log(`   is_published 컬럼: ${hasPublished ? '✅ 존재함' : '❌ 없음'}`);

    // 2. is_published 컬럼이 없으면 추가
    if (!hasPublished) {
      console.log('\n2️⃣ is_published 컬럼 추가 중...');
      await connection.execute(`
        ALTER TABLE listings
        ADD COLUMN is_published TINYINT(1) DEFAULT 1
      `);
      console.log('   ✅ is_published 컬럼 추가 완료');
    } else {
      console.log('\n2️⃣ is_published 컬럼이 이미 존재함 - 스킵');
    }

    // 3. 현재 상품 개수 확인
    console.log('\n3️⃣ 현재 상품 상태 확인...');

    const totalResult = await connection.execute(
      'SELECT COUNT(*) as count FROM listings'
    );
    const total = totalResult.rows?.[0]?.count || 0;
    console.log(`   총 상품: ${total}개`);

    const activeResult = await connection.execute(
      'SELECT COUNT(*) as count FROM listings WHERE is_active = 1'
    );
    const activeCount = activeResult.rows?.[0]?.count || 0;
    console.log(`   활성화된 상품 (is_active=1): ${activeCount}개`);

    let publishedCount = 0;
    try {
      const publishedResult = await connection.execute(
        'SELECT COUNT(*) as count FROM listings WHERE is_published = 1'
      );
      publishedCount = publishedResult.rows?.[0]?.count || 0;
      console.log(`   게시된 상품 (is_published=1): ${publishedCount}개`);
    } catch (e) {
      console.log(`   게시된 상품 확인 불가 (is_published 컬럼 없음)`);
    }

    // 4. is_published 업데이트
    console.log('\n4️⃣ is_published 업데이트 중...');
    console.log('   조건: is_active=1인 모든 상품의 is_published를 1로 설정');

    const updateResult = await connection.execute(`
      UPDATE listings
      SET is_published = 1
      WHERE is_active = 1
    `);

    console.log(`   ✅ ${updateResult.rowsAffected || 0}개 상품 업데이트 완료`);

    // 5. 최종 확인
    console.log('\n5️⃣ 최종 상태 확인...');

    const finalPublishedResult = await connection.execute(
      'SELECT COUNT(*) as count FROM listings WHERE is_published = 1'
    );
    const finalPublishedCount = finalPublishedResult.rows?.[0]?.count || 0;

    const finalBothResult = await connection.execute(
      'SELECT COUNT(*) as count FROM listings WHERE is_published = 1 AND is_active = 1'
    );
    const finalBothCount = finalBothResult.rows?.[0]?.count || 0;

    console.log(`   is_published=1: ${finalPublishedCount}개`);
    console.log(`   is_published=1 AND is_active=1: ${finalBothCount}개`);

    // 6. 카테고리별 확인
    console.log('\n6️⃣ 카테고리별 게시된 상품 확인...');
    try {
      const categoryResult = await connection.execute(`
        SELECT
          l.category,
          COUNT(*) as count
        FROM listings l
        WHERE l.is_published = 1 AND l.is_active = 1
        GROUP BY l.category
        ORDER BY l.category
      `);

      if (categoryResult.rows && categoryResult.rows.length > 0) {
        categoryResult.rows.forEach(row => {
          console.log(`   ${row.category || '(NULL)'}: ${row.count}개`);
        });
      } else {
        console.log('   ⚠️ 게시된 상품이 없습니다');
      }
    } catch (e) {
      console.log(`   ⚠️ 카테고리별 집계 실패: ${e.message}`);
    }

    console.log('\n✅ 수정 완료!');
    console.log('\n📝 다음 단계:');
    console.log('   1. 카테고리 페이지 새로고침');
    console.log('   2. 상품 카드가 표시되는지 확인');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

fixListingsPublished()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 스크립트 실행 실패');
    process.exit(1);
  });
