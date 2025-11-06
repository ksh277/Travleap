/**
 * 데이터베이스 스키마 및 데이터 확인 스크립트
 *
 * 확인 사항:
 * 1. listings 테이블 존재 여부 및 구조
 * 2. categories 테이블 존재 여부 및 구조
 * 3. partners 테이블 존재 여부 및 구조
 * 4. 각 테이블의 데이터 개수
 * 5. partner_type 컬럼 존재 여부
 * 6. is_published, is_active 컬럼 존재 여부
 */

const { connect } = require('@planetscale/database');

async function checkDatabaseStructure() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('\n🔍 ===== PlanetScale MySQL 데이터베이스 구조 확인 =====\n');

  const tablesToCheck = ['listings', 'categories', 'partners'];

  for (const tableName of tablesToCheck) {
    console.log(`\n📋 [${tableName}] 테이블 확인:`);
    console.log('─'.repeat(80));

    try {
      // 1. 테이블 존재 확인
      const tableExistsResult = await connection.execute(
        `SHOW TABLES LIKE '${tableName}'`
      );

      if (!tableExistsResult.rows || tableExistsResult.rows.length === 0) {
        console.log(`❌ [${tableName}] 테이블이 존재하지 않습니다!`);
        continue;
      }

      console.log(`✅ [${tableName}] 테이블 존재`);

      // 2. 테이블 구조 확인
      const columnsResult = await connection.execute(`DESCRIBE ${tableName}`);
      console.log(`\n컬럼 목록 (총 ${columnsResult.rows?.length || 0}개):`);

      const columns = columnsResult.rows || [];
      columns.forEach(col => {
        const nullable = col.Null === 'YES' ? 'NULL' : 'NOT NULL';
        const key = col.Key ? `[${col.Key}]` : '';
        const defaultVal = col.Default !== null ? `DEFAULT: ${col.Default}` : '';
        console.log(`  - ${col.Field.padEnd(25)} ${col.Type.padEnd(20)} ${nullable.padEnd(10)} ${key} ${defaultVal}`);
      });

      // 3. 중요 컬럼 확인
      const columnNames = columns.map(col => col.Field);

      if (tableName === 'listings') {
        const hasPublished = columnNames.includes('is_published');
        const hasActive = columnNames.includes('is_active');
        const hasCategoryId = columnNames.includes('category_id');
        const hasPartnerId = columnNames.includes('partner_id');

        console.log(`\n필수 컬럼 체크:`);
        console.log(`  ${hasPublished ? '✅' : '❌'} is_published 컬럼`);
        console.log(`  ${hasActive ? '✅' : '❌'} is_active 컬럼`);
        console.log(`  ${hasCategoryId ? '✅' : '❌'} category_id 컬럼`);
        console.log(`  ${hasPartnerId ? '✅' : '❌'} partner_id 컬럼`);
      }

      if (tableName === 'partners') {
        const hasPartnerType = columnNames.includes('partner_type');
        console.log(`\n필수 컬럼 체크:`);
        console.log(`  ${hasPartnerType ? '✅' : '❌'} partner_type 컬럼`);
      }

      // 4. 데이터 개수 확인
      const countResult = await connection.execute(
        `SELECT COUNT(*) as total FROM ${tableName}`
      );
      const total = countResult.rows?.[0]?.total || 0;
      console.log(`\n총 레코드 수: ${total}개`);

      // 5. 샘플 데이터 확인 (첫 3개)
      if (total > 0) {
        const sampleResult = await connection.execute(
          `SELECT * FROM ${tableName} LIMIT 3`
        );
        console.log(`\n샘플 데이터 (최대 3개):`);
        (sampleResult.rows || []).forEach((row, idx) => {
          console.log(`\n  [${idx + 1}]`, JSON.stringify(row, null, 2).split('\n').map((line, i) => i === 0 ? line : `     ${line}`).join('\n'));
        });
      }

      // 6. listings 테이블 특별 확인
      if (tableName === 'listings' && total > 0) {
        console.log(`\n상세 분석:`);

        // is_published=1 개수
        try {
          const publishedResult = await connection.execute(
            `SELECT COUNT(*) as count FROM listings WHERE is_published = 1`
          );
          const publishedCount = publishedResult.rows?.[0]?.count || 0;
          console.log(`  - is_published=1: ${publishedCount}개`);
        } catch (e) {
          console.log(`  - is_published 컬럼 없음`);
        }

        // is_active=1 개수
        try {
          const activeResult = await connection.execute(
            `SELECT COUNT(*) as count FROM listings WHERE is_active = 1`
          );
          const activeCount = activeResult.rows?.[0]?.count || 0;
          console.log(`  - is_active=1: ${activeCount}개`);
        } catch (e) {
          console.log(`  - is_active 컬럼 없음`);
        }

        // is_published=1 AND is_active=1 개수
        try {
          const bothResult = await connection.execute(
            `SELECT COUNT(*) as count FROM listings WHERE is_published = 1 AND is_active = 1`
          );
          const bothCount = bothResult.rows?.[0]?.count || 0;
          console.log(`  - is_published=1 AND is_active=1: ${bothCount}개`);
        } catch (e) {
          console.log(`  - 조건 확인 실패`);
        }

        // category별 개수
        try {
          const categoryResult = await connection.execute(
            `SELECT c.slug, c.name_ko, COUNT(l.id) as count
             FROM listings l
             LEFT JOIN categories c ON l.category_id = c.id
             WHERE l.is_published = 1 AND l.is_active = 1
             GROUP BY c.id, c.slug, c.name_ko`
          );
          console.log(`\n  카테고리별 상품 수 (is_published=1 AND is_active=1):`);
          (categoryResult.rows || []).forEach(row => {
            console.log(`    - ${row.slug || 'NULL'} (${row.name_ko || 'NULL'}): ${row.count}개`);
          });
        } catch (e) {
          console.log(`  - 카테고리별 집계 실패: ${e.message}`);
        }
      }

      // 7. partners 테이블 특별 확인
      if (tableName === 'partners' && total > 0) {
        console.log(`\n상세 분석:`);

        // partner_type별 개수
        try {
          const typeResult = await connection.execute(
            `SELECT partner_type, COUNT(*) as count FROM partners GROUP BY partner_type`
          );
          console.log(`  partner_type별 개수:`);
          (typeResult.rows || []).forEach(row => {
            console.log(`    - ${row.partner_type || 'NULL'}: ${row.count}개`);
          });
        } catch (e) {
          console.log(`  - partner_type 컬럼 없음 또는 에러: ${e.message}`);
        }

        // lodging 타입 개수
        try {
          const lodgingResult = await connection.execute(
            `SELECT COUNT(*) as count FROM partners WHERE partner_type = 'lodging'`
          );
          const lodgingCount = lodgingResult.rows?.[0]?.count || 0;
          console.log(`  - partner_type='lodging': ${lodgingCount}개`);
        } catch (e) {
          console.log(`  - lodging 조회 실패`);
        }
      }

    } catch (error) {
      console.error(`❌ [${tableName}] 확인 중 오류:`, error.message);
    }
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('✅ 데이터베이스 구조 확인 완료');
  console.log('='.repeat(80) + '\n');
}

// 실행
checkDatabaseStructure()
  .then(() => {
    console.log('스크립트 실행 완료');
    process.exit(0);
  })
  .catch(error => {
    console.error('스크립트 실행 오류:', error);
    process.exit(1);
  });
