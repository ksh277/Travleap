/**
 * partner_type ENUM 확장
 * 3개 타입 → 8개 타입
 */

require('dotenv').config();
const { connect } = require('@planetscale/database');

async function fixPartnerTypeEnum() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n' + '='.repeat(70));
  console.log('partner_type ENUM 확장: 3개 → 8개 벤더 타입');
  console.log('='.repeat(70) + '\n');

  try {
    // 현재 ENUM 값 확인
    const currentSchema = await connection.execute('DESCRIBE partners');
    const partnerTypeField = currentSchema.rows.find(row => row.Field === 'partner_type');

    console.log('현재 partner_type:', partnerTypeField?.Type);

    // ENUM 확장
    console.log('\nENUM 확장 중...');
    await connection.execute(`
      ALTER TABLE partners
      MODIFY COLUMN partner_type ENUM('general', 'lodging', 'rentcar', 'popup', 'food', 'attraction', 'travel', 'event', 'experience') DEFAULT 'general'
    `);

    console.log('✅ partner_type ENUM 확장 완료!');

    // 결과 확인
    const updatedSchema = await connection.execute('DESCRIBE partners');
    const updatedField = updatedSchema.rows.find(row => row.Field === 'partner_type');

    console.log('\n업데이트된 partner_type:', updatedField?.Type);

    console.log('\n' + '='.repeat(70));
    console.log('완료! 이제 8개 벤더 타입 모두 지원');
    console.log('='.repeat(70));
    console.log(`
지원 벤더 타입:
  1. general (기본)
  2. lodging (숙박)
  3. rentcar (렌트카)
  4. popup (팝업)
  5. food (음식)
  6. attraction (관광지)
  7. travel (여행)
  8. event (행사)
  9. experience (체험)
`);

  } catch (error) {
    console.error('\n✗ 오류 발생:', error.message);
    console.error(error);
  }
}

fixPartnerTypeEnum();
