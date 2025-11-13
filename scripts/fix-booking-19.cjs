require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixBooking19() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('예약 #19 수정');
    console.log('═══════════════════════════════════════════════════════\n');

    // 1. 예약 정보 조회
    const [bookings] = await connection.execute(`
      SELECT * FROM rentcar_bookings WHERE id = 19
    `);

    if (bookings.length === 0) {
      console.log('❌ 예약 #19를 찾을 수 없습니다.\n');
      return;
    }

    const booking = bookings[0];
    console.log('예약번호:', booking.booking_number);
    console.log('차량:', booking.vehicle_id);
    console.log('총액:', booking.total_krw);

    // 2. customer_phone 추가
    if (!booking.customer_phone) {
      console.log('\n📞 customer_phone 추가: 010-9999-9999');
      await connection.execute(`
        UPDATE rentcar_bookings
        SET customer_phone = ?
        WHERE id = 19
      `, ['010-9999-9999']);
    }

    // 3. insurance 추가 (기본 자차보험, 24시간 x 1000원/시간)
    if (!booking.insurance_id) {
      console.log('\n🛡️  보험 추가: 기본 자차보험 (ID 1, ₩24,000)');
      await connection.execute(`
        UPDATE rentcar_bookings
        SET insurance_id = 1,
            insurance_fee_krw = 24000
        WHERE id = 19
      `, []);
    }

    // 4. extras total_price_krw 계산 및 업데이트
    console.log('\n📦 옵션 금액 계산:');
    const [extras] = await connection.execute(`
      SELECT * FROM rentcar_booking_extras WHERE booking_id = 19
    `);

    console.log(`   총 ${extras.length}개 옵션 발견`);

    // 대여 시간 계산 (24시간)
    const rentalHours = 24;

    for (const extra of extras) {
      const quantity = extra.quantity || 1;
      const unitPrice = extra.unit_price_krw;
      let totalPrice = 0;

      // extra의 price_type 조회
      const [extraInfo] = await connection.execute(`
        SELECT price_type FROM rentcar_extras WHERE id = ?
      `, [extra.extra_id]);

      const priceType = extraInfo[0]?.price_type || 'per_rental';

      if (priceType === 'per_rental') {
        totalPrice = unitPrice * quantity;
      } else if (priceType === 'per_day') {
        totalPrice = unitPrice * Math.ceil(rentalHours / 24) * quantity;
      } else if (priceType === 'per_hour') {
        totalPrice = unitPrice * Math.ceil(rentalHours) * quantity;
      } else {
        totalPrice = unitPrice * quantity;
      }

      console.log(`   - Extra ID ${extra.extra_id}: ${priceType}`);
      console.log(`     단가: ₩${unitPrice.toLocaleString()} x ${quantity}`);
      console.log(`     합계: ₩${totalPrice.toLocaleString()}`);

      await connection.execute(`
        UPDATE rentcar_booking_extras
        SET total_price_krw = ?
        WHERE booking_id = 19 AND extra_id = ?
      `, [totalPrice, extra.extra_id]);
    }

    console.log('\n✅ 예약 #19 수정 완료\n');

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

fixBooking19();
