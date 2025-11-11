/**
 * 숙박 예약의 잘못된 category 수정
 * payments 테이블의 notes.category를 "여행" → "숙박"으로 변경
 */
require('dotenv').config();
const { connect } = require('@planetscale/database');

(async () => {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('🔧 숙박 예약 category 수정 시작...\n');

    // 1. BK-로 시작하는 모든 payments 조회
    const result = await connection.execute(`
      SELECT
        p.id,
        p.order_id_str,
        p.booking_id,
        p.notes,
        b.listing_id
      FROM payments p
      LEFT JOIN bookings b ON p.booking_id = b.id
      WHERE p.order_id_str LIKE 'BK-%'
      ORDER BY p.created_at DESC
    `);

    if (!result.rows || result.rows.length === 0) {
      console.log('ℹ️ BK- 결제 데이터 없음');
      return;
    }

    console.log(`✅ ${result.rows.length}개의 BK- 결제 데이터 발견\n`);

    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    let noListingIdCount = 0;

    for (const payment of result.rows) {
      // notes 파싱
      let notes = null;
      try {
        notes = payment.notes ? JSON.parse(payment.notes) : null;
      } catch (e) {
        console.error(`❌ Payment ID ${payment.id}: notes 파싱 실패`);
        continue;
      }

      if (!notes) {
        console.log(`⚠️  Payment ID ${payment.id}: notes 없음`);
        continue;
      }

      // listing_id로 실제 카테고리 조회
      if (!payment.listing_id) {
        console.log(`⚠️  Payment ID ${payment.id}: listing_id 없음 (건너뜀)`);
        noListingIdCount++;
        continue;
      }

      const categoryResult = await connection.execute(
        `SELECT c.name_ko
         FROM listings l
         JOIN categories c ON l.category_id = c.id
         WHERE l.id = ?`,
        [payment.listing_id]
      );

      if (!categoryResult.rows || categoryResult.rows.length === 0) {
        console.log(`⚠️  Payment ID ${payment.id}: listing_id=${payment.listing_id}의 카테고리 없음 (건너뜀)`);
        continue;
      }

      const correctCategory = categoryResult.rows[0].name_ko;

      // 현재 category와 비교
      if (notes.category === correctCategory) {
        console.log(`✅ Payment ID ${payment.id}: 이미 올바름 (${correctCategory})`);
        alreadyCorrectCount++;
        continue;
      }

      // category 수정 필요
      console.log(`🔧 Payment ID ${payment.id}: "${notes.category}" → "${correctCategory}"`);

      // notes 업데이트
      notes.category = correctCategory;
      const updatedNotes = JSON.stringify(notes);

      await connection.execute(
        `UPDATE payments SET notes = ? WHERE id = ?`,
        [updatedNotes, payment.id]
      );

      fixedCount++;
    }

    console.log('\n=== 수정 완료 ===');
    console.log(`✅ 수정됨: ${fixedCount}건`);
    console.log(`✅ 이미 올바름: ${alreadyCorrectCount}건`);
    console.log(`⚠️  listing_id 없음: ${noListingIdCount}건`);
    console.log(`📊 총 처리: ${result.rows.length}건`);

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
})();
