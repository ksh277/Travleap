/**
 * 기존 숙박 예약 번호 형식 확인 스크립트
 */
require('dotenv').config();
const { connect } = require('@planetscale/database');

(async () => {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('📊 숙박 예약 데이터 확인 중...\n');

    // bookings 테이블에서 숙박 예약 확인 (category_id = 1857)
    const result = await connection.execute(`
      SELECT
        b.id,
        b.booking_number,
        b.payment_status,
        b.status,
        b.created_at,
        l.category_id
      FROM bookings b
      LEFT JOIN listings l ON b.listing_id = l.id
      WHERE l.category_id = 1857
      ORDER BY b.created_at DESC
      LIMIT 20
    `);

    if (result.rows && result.rows.length > 0) {
      console.log('✅ 기존 숙박 예약 데이터 발견:');
      console.log('총', result.rows.length, '건\n');

      let withHyphen = 0;
      let withoutHyphen = 0;

      result.rows.forEach((row, index) => {
        const hasHyphen = row.booking_number.startsWith('BK-');
        if (hasHyphen) {
          withHyphen++;
        } else {
          withoutHyphen++;
        }

        console.log(`[${index + 1}] ID: ${row.id}`);
        console.log(`    예약번호: ${row.booking_number}`);
        console.log(`    형식: ${hasHyphen ? '✅ BK- (하이픈 있음)' : '❌ BK (하이픈 없음)'}`);
        console.log(`    상태: ${row.status} / 결제: ${row.payment_status}`);
        console.log(`    생성일: ${row.created_at}\n`);
      });

      console.log('=== 형식 분석 ===');
      console.log(`BK- 형식 (하이픈 있음): ${withHyphen}건`);
      console.log(`BK 형식 (하이픈 없음): ${withoutHyphen}건`);

      if (withoutHyphen > 0) {
        console.log('\n⚠️ 주의: 하이픈 없는 예약이 존재합니다.');
        console.log('수정 시 기존 예약에 영향이 없는지 확인 필요!');
      }

    } else {
      console.log('ℹ️ 숙박 예약 데이터 없음');
      console.log('→ 신규 기능이므로 안전하게 수정 가능');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
})();
