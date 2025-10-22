const { connect } = require('@planetscale/database');
require('dotenv').config();

const connection = connect({ url: process.env.DATABASE_URL });

(async () => {
  console.log('🔧 기존 차량들에 시간당 요금 자동 계산 중...');

  try {
    // 시간당 요금 = (일일 요금 / 24) * 1.2 (20% 할증)
    await connection.execute(
      `UPDATE rentcar_vehicles
       SET hourly_rate_krw = ROUND((daily_rate_krw / 24) * 1.2 / 1000) * 1000
       WHERE hourly_rate_krw IS NULL`
    );

    console.log('✅ 시간당 요금 자동 계산 완료');

    // 확인
    const result = await connection.execute(
      `SELECT id, display_name, daily_rate_krw, hourly_rate_krw
       FROM rentcar_vehicles
       LIMIT 10`
    );

    console.log('\n샘플 데이터:');
    result.rows.forEach(row => {
      console.log(`  ${row.display_name}: 일일 ₩${row.daily_rate_krw.toLocaleString()} / 시간 ₩${row.hourly_rate_krw?.toLocaleString() || 'N/A'}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ 오류:', error);
    process.exit(1);
  }
})();
