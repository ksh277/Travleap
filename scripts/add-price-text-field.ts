/**
 * partners 테이블에 base_price_text 컬럼 추가
 * 자유 텍스트 가격 정보 입력을 위한 마이그레이션
 */

import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function addPriceTextField() {
  const connection = connect({
    url: process.env.DATABASE_URL
  });

  try {
    console.log('🔄 partners 테이블에 base_price_text 컬럼 추가 중...\n');

    // 먼저 컬럼이 이미 있는지 확인
    const { rows: columns } = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'partners'
        AND COLUMN_NAME = 'base_price_text'
    `);

    if (columns && columns.length > 0) {
      console.log('ℹ️  base_price_text 컬럼이 이미 존재합니다.\n');
      return;
    }

    // base_price_text 컬럼 추가 (TEXT 타입)
    await connection.execute(`
      ALTER TABLE partners
      ADD COLUMN base_price_text TEXT AFTER base_price
    `);

    console.log('✅ base_price_text 컬럼 추가 완료!\n');
    console.log('📝 이제 다음과 같은 가격 정보를 저장할 수 있습니다:');
    console.log('   - "방4개 전체 예약시 20,000원 할인"');
    console.log('   - "1박 50,000원, 주말 60,000원"');
    console.log('   - "30000" (숫자만 입력하면 자동으로 "30,000원" 표시)');
    console.log('   - "0" (0 입력하면 "무료" 표시)');
    console.log('   - "" (빈값이면 가격 미표시)\n');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

// 스크립트 실행
addPriceTextField()
  .then(() => {
    console.log('✅ 마이그레이션 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  });
