/**
 * bookings 테이블에 체크인/체크아웃 정보 필드 추가
 * - check_in_info: 체크인 시 기록되는 정보 (객실 상태, 실제 투숙객 수, 담당자 등)
 * - check_out_info: 체크아웃 시 기록되는 정보 (객실 상태, 손해 배상, 추가 요금 등)
 */
require('dotenv').config();
const { connect } = require('@planetscale/database');

(async () => {
  try {
    const connection = connect({ url: process.env.DATABASE_URL });

    console.log('📊 bookings 테이블에 체크인/체크아웃 정보 필드 추가 중...\n');
    console.log('='.repeat(80));

    // check_in_info 필드 추가
    console.log('\n1️⃣ check_in_info JSON 필드 추가...');
    try {
      await connection.execute('ALTER TABLE bookings ADD COLUMN check_in_info JSON NULL');
      console.log('   ✅ check_in_info 추가 완료');
    } catch (error) {
      if (error.message.includes('Duplicate column')) {
        console.log('   ℹ️  check_in_info 필드가 이미 존재합니다');
      } else {
        throw error;
      }
    }

    // check_out_info 필드 추가
    console.log('\n2️⃣ check_out_info JSON 필드 추가...');
    try {
      await connection.execute('ALTER TABLE bookings ADD COLUMN check_out_info JSON NULL');
      console.log('   ✅ check_out_info 추가 완료');
    } catch (error) {
      if (error.message.includes('Duplicate column')) {
        console.log('   ℹ️  check_out_info 필드가 이미 존재합니다');
      } else {
        throw error;
      }
    }

    // 변경사항 확인
    console.log('\n3️⃣ 변경사항 확인 중...');
    const result = await connection.execute(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = 'bookings'
       AND COLUMN_NAME IN ('check_in_info', 'check_out_info')
       ORDER BY ORDINAL_POSITION`
    );

    if (result.rows && result.rows.length > 0) {
      console.log('   ✅ 추가된 필드:');
      result.rows.forEach(row => {
        console.log(`      - ${row.COLUMN_NAME}: ${row.DATA_TYPE} (${row.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ 모든 필드 추가 완료!\n');

    console.log('📝 사용 예시:');
    console.log('   check_in_info: { room_condition: "good", actual_guests_count: 2, checked_in_by: 123, checked_in_at: "2025-11-13T..." }');
    console.log('   check_out_info: { room_condition: "good", damages: "", damage_cost: 0, late_checkout_fee: 0, checked_out_by: 123, checked_out_at: "2025-11-13T..." }');

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
