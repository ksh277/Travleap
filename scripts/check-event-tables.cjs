/**
 * 이벤트 관련 테이블 확인
 */
require('dotenv').config();
const { connect } = require('@planetscale/database');

(async () => {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('📊 이벤트 관련 테이블 확인 중...\n');

    // listing_event 스키마
    console.log('=== listing_event 테이블 스키마 ===');
    const schemaResult = await connection.execute('DESCRIBE listing_event');
    schemaResult.rows.forEach(col => {
      console.log(`${col.Field}: ${col.Type}`);
    });

    // listing_event 데이터 확인
    const countResult = await connection.execute('SELECT COUNT(*) as count FROM listing_event');
    console.log(`\n데이터: ${countResult.rows[0].count}건`);

    // 이벤트 상품 확인
    console.log('\n=== 이벤트 상품 확인 (category_id=1861) ===');
    const eventsResult = await connection.execute(
      `SELECT
        l.id,
        l.title,
        l.price_from,
        l.is_active,
        l.is_published,
        le.event_date_start,
        le.event_date_end,
        le.venue,
        le.capacity
       FROM listings l
       LEFT JOIN listing_event le ON l.id = le.listing_id
       WHERE l.category_id = 1861
       LIMIT 5`
    );

    if (eventsResult.rows && eventsResult.rows.length > 0) {
      console.log(`✅ ${eventsResult.rows.length}개의 이벤트 상품 발견:`);
      eventsResult.rows.forEach((event, i) => {
        console.log(`[${i + 1}] ID: ${event.id}`);
        console.log(`    제목: ${event.title}`);
        console.log(`    가격: ${event.price_from}원`);
        console.log(`    활성: ${event.is_active ? 'YES' : 'NO'} / 공개: ${event.is_published ? 'YES' : 'NO'}`);
        console.log(`    일시: ${event.event_date_start || 'N/A'} ~ ${event.event_date_end || 'N/A'}`);
        console.log(`    장소: ${event.venue || 'N/A'}`);
        console.log(`    정원: ${event.capacity || 0}명`);
        console.log();
      });
    } else {
      console.log('❌ 이벤트 상품이 없습니다.');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
})();
