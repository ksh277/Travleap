const { connect } = require('@planetscale/database');
require('dotenv').config();

async function fixUserCouponsTable() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('========================================');
  console.log('   user_coupons 테이블 수정');
  console.log('========================================\n');

  // 1. 현재 테이블 구조 확인
  console.log('1️⃣ 현재 테이블 구조 확인...\n');

  const columns = await conn.execute(`
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'user_coupons'
    ORDER BY ORDINAL_POSITION
  `);

  console.log('   현재 컬럼:');
  columns.rows.forEach(c => {
    console.log(`   - ${c.COLUMN_NAME} (${c.DATA_TYPE})`);
  });
  console.log('');

  // 2. expires_at 컬럼 존재 여부 확인
  const hasExpiresAt = columns.rows.some(c => c.COLUMN_NAME === 'expires_at');

  if (hasExpiresAt) {
    console.log('✅ expires_at 컬럼이 이미 존재합니다.\n');
  } else {
    console.log('2️⃣ expires_at 컬럼 추가 중...\n');

    try {
      await conn.execute(`
        ALTER TABLE user_coupons
        ADD COLUMN expires_at DATETIME NULL
      `);
      console.log('   ✅ expires_at 컬럼 추가 완료!\n');
    } catch (err) {
      console.log(`   ❌ 오류: ${err.message}\n`);
    }
  }

  // 3. 기존 발급 쿠폰에 만료일 설정 (쿠폰의 valid_until 기준)
  console.log('3️⃣ 기존 발급 쿠폰에 만료일 설정...\n');

  try {
    const updateResult = await conn.execute(`
      UPDATE user_coupons uc
      JOIN coupons c ON uc.coupon_id = c.id
      SET uc.expires_at = c.valid_until
      WHERE uc.expires_at IS NULL
    `);
    console.log(`   ✅ ${updateResult.rowsAffected || 0}개 쿠폰 만료일 설정 완료\n`);
  } catch (err) {
    console.log(`   ⚠️ 업데이트 중 오류 (무시): ${err.message}\n`);
  }

  // 4. 최종 확인
  console.log('4️⃣ 최종 테이블 구조 확인...\n');

  const finalColumns = await conn.execute(`
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'user_coupons'
    ORDER BY ORDINAL_POSITION
  `);

  console.log('   ┌─────────────────────────────────────┐');
  console.log('   │ user_coupons 테이블 구조           │');
  console.log('   ├─────────────────────────────────────┤');
  finalColumns.rows.forEach(c => {
    const nullable = c.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
    console.log(`   │ ${c.COLUMN_NAME.padEnd(15)} │ ${c.DATA_TYPE.padEnd(10)} │ ${nullable.padEnd(8)} │`);
  });
  console.log('   └─────────────────────────────────────┘\n');

  console.log('========================================');
  console.log('   완료 ✅');
  console.log('========================================');
}

fixUserCouponsTable().catch(console.error);
