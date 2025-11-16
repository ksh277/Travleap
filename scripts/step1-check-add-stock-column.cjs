/**
 * 1단계: listings 테이블에 stock 컬럼 확인 및 추가
 *
 * 작업:
 * 1. listings 테이블 구조 조회
 * 2. stock 컬럼 존재 여부 확인
 * 3. 없으면 추가 SQL 생성
 */

const { connect } = require('@planetscale/database');

async function checkAndAddStockColumn() {
  console.log('='.repeat(60));
  console.log('1단계: listings 테이블 stock 컬럼 확인');
  console.log('='.repeat(60) + '\n');

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // listings 테이블 스키마 조회
    console.log('📋 listings 테이블 구조 조회 중...\n');
    const result = await connection.execute('DESCRIBE listings');

    const columns = result.rows || [];
    console.log(`총 ${columns.length}개 컬럼 발견\n`);

    // stock 컬럼 찾기
    const stockColumn = columns.find(col => col.Field === 'stock');

    if (stockColumn) {
      console.log('✅ stock 컬럼이 이미 존재합니다!');
      console.log('\n컬럼 정보:');
      console.log(`  필드명: ${stockColumn.Field}`);
      console.log(`  타입: ${stockColumn.Type}`);
      console.log(`  NULL 허용: ${stockColumn.Null}`);
      console.log(`  기본값: ${stockColumn.Default}`);
      console.log(`  Extra: ${stockColumn.Extra}`);

      // 샘플 데이터 확인
      console.log('\n📊 현재 재고 데이터 샘플:');
      const sampleData = await connection.execute(
        'SELECT id, title, category, stock FROM listings WHERE stock IS NOT NULL LIMIT 5'
      );

      if (sampleData.rows && sampleData.rows.length > 0) {
        sampleData.rows.forEach(row => {
          console.log(`  ID ${row.id}: ${row.title} (${row.category}) - 재고: ${row.stock}`);
        });
      } else {
        console.log('  재고가 설정된 상품이 없습니다.');
      }

      console.log('\n✅ 1단계 완료: stock 컬럼 사용 가능');
      return { success: true, exists: true };

    } else {
      console.log('❌ stock 컬럼이 없습니다.\n');
      console.log('📝 추가할 SQL:');
      const sql = `ALTER TABLE listings ADD COLUMN stock INT DEFAULT 0 COMMENT '재고 수량 (0=무제한)';`;
      console.log(`  ${sql}\n`);

      console.log('⚠️  주의: 이 스크립트는 컬럼을 자동으로 추가하지 않습니다.');
      console.log('   수동으로 위 SQL을 실행하거나, migration 스크립트를 사용하세요.\n');

      // migration 스크립트에 추가할 코드 생성
      console.log('📄 Migration 스크립트 예시:');
      console.log(`
await connection.execute(\`
  ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS stock INT DEFAULT 0 COMMENT '재고 수량 (0=무제한)'
\`);
console.log('✅ listings.stock 컬럼 추가 완료');
      `.trim());

      return { success: false, exists: false, sql };
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    return { success: false, error: error.message };
  }
}

// 실행
checkAndAddStockColumn()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 1단계 성공!');
      process.exit(0);
    } else {
      console.log('\n⚠️  1단계 완료 (수동 작업 필요)');
      process.exit(0);
    }
  })
  .catch(error => {
    console.error('\n❌ 치명적 오류:', error);
    process.exit(1);
  });
