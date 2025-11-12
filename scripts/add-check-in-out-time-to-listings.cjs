/**
 * listings 테이블에 체크인/체크아웃 시간 필드 추가
 */
require('dotenv').config();
const { connect } = require('@planetscale/database');

(async () => {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('📊 listings 테이블에 체크인/체크아웃 시간 필드 추가\n');
    console.log('='.repeat(60));

    // 1. 필드 추가
    console.log('\n=== 1. 필드 추가 ===\n');

    try {
      await connection.execute(`
        ALTER TABLE listings
        ADD COLUMN default_check_in_time TIME DEFAULT '16:00:00' COMMENT '기본 체크인 시간',
        ADD COLUMN default_check_out_time TIME DEFAULT '12:00:00' COMMENT '기본 체크아웃 시간'
      `);
      console.log('✅ 필드 추가 완료');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠️  필드가 이미 존재합니다');
      } else {
        throw error;
      }
    }

    // 2. 기존 숙박 상품에 기본값 설정
    console.log('\n=== 2. 숙박 카테고리 상품에 기본값 설정 ===\n');

    const updateResult = await connection.execute(`
      UPDATE listings
      SET
        default_check_in_time = '16:00:00',
        default_check_out_time = '12:00:00'
      WHERE category_id IN (
        SELECT id FROM categories WHERE slug IN ('stay', 'accommodation')
      )
    `);

    console.log(`✅ ${updateResult.rowsAffected || 0}개 상품 업데이트 완료`);

    // 3. 확인
    console.log('\n=== 3. 설정 확인 ===\n');

    const checkResult = await connection.execute(`
      SELECT
        l.id,
        l.title,
        l.default_check_in_time,
        l.default_check_out_time,
        c.name_ko as category
      FROM listings l
      JOIN categories c ON l.category_id = c.id
      WHERE c.slug IN ('stay', 'accommodation')
      LIMIT 5
    `);

    if (checkResult.rows && checkResult.rows.length > 0) {
      checkResult.rows.forEach(listing => {
        console.log(`[${listing.id}] ${listing.title}`);
        console.log(`    카테고리: ${listing.category}`);
        console.log(`    체크인: ${listing.default_check_in_time}`);
        console.log(`    체크아웃: ${listing.default_check_out_time}`);
        console.log();
      });
    }

    console.log('='.repeat(60));
    console.log('\n✅ 완료!\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
