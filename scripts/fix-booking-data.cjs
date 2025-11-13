require('dotenv').config();
const mysql = require('mysql2/promise');
const { encryptPhone } = require('../utils/encryption.cjs');

async function fixBookingData() {
  const connection = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true }
  });

  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('예약 데이터 수정');
    console.log('═══════════════════════════════════════════════════════\n');

    // 1. confirmed 예약 확인
    const [bookings] = await connection.execute(`
      SELECT id, booking_number, customer_phone, insurance_id
      FROM rentcar_bookings
      WHERE status = 'confirmed' OR status = 'picked_up'
      ORDER BY created_at DESC
    `);

    console.log(`총 ${bookings.length}건의 예약 확인\n`);

    for (const booking of bookings) {
      console.log(`─────────────────────────────────────────────────`);
      console.log(`예약번호: ${booking.booking_number}`);

      let updated = false;

      // customer_phone이 NULL이면 테스트 번호 추가 (평문, 테스트용)
      if (!booking.customer_phone) {
        console.log(`   ⚠️  customer_phone이 NULL - 테스트 번호 추가`);
        const testPhone = '010-1234-5678';

        await connection.execute(`
          UPDATE rentcar_bookings
          SET customer_phone = ?
          WHERE id = ?
        `, [testPhone, booking.id]);

        console.log(`   ✅ customer_phone 업데이트: ${testPhone} (평문)`);
        updated = true;
      }

      // insurance_id가 21이면 1로 변경 (기본 자차보험)
      if (booking.insurance_id === 21) {
        console.log(`   ⚠️  insurance_id가 21 (존재하지 않음) - 1로 변경`);

        // 보험료 재계산 (24시간 기준 1000원/시간 = 24000원)
        const insuranceFee = 24000;

        await connection.execute(`
          UPDATE rentcar_bookings
          SET insurance_id = 1,
              insurance_fee_krw = ?
          WHERE id = ?
        `, [insuranceFee, booking.id]);

        console.log(`   ✅ insurance_id 업데이트: 21 → 1 (기본 자차보험)`);
        console.log(`   ✅ insurance_fee_krw 업데이트: ${insuranceFee}원`);
        updated = true;
      }

      if (!updated) {
        console.log(`   ✓ 데이터 정상`);
      }
      console.log('');
    }

    console.log('✅ 예약 데이터 수정 완료\n');

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error.stack);
  } finally {
    await connection.end();
  }
}

fixBookingData();
