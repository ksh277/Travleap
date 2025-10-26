import { config } from 'dotenv';
import { db } from '../utils/database';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// .env 파일 로드
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPaymentsMigration() {
  try {
    console.log('🔄 payments 테이블 컬럼 마이그레이션 시작...\n');

    // SQL 파일 읽기
    const sqlPath = path.join(__dirname, '../database/add-payment-columns-migration.sql');

    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL 파일을 찾을 수 없습니다: ${sqlPath}`);
    }

    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // SQL 문을 세미콜론으로 분리 (주석 제거)
    const statements = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))  // 주석 라인 제거
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`📝 ${statements.length}개의 SQL 문 실행 예정\n`);

    let successCount = 0;
    let skipCount = 0;

    for (const statement of statements) {
      try {
        await db.execute(statement);
        const preview = statement.substring(0, 80).replace(/\s+/g, ' ');
        console.log(`✅ 실행 완료: ${preview}...`);
        successCount++;
      } catch (error: any) {
        // Duplicate column 에러는 무시 (이미 컬럼이 존재하는 경우)
        if (error.message.includes('Duplicate column')) {
          const columnMatch = statement.match(/ADD COLUMN (\w+)/);
          const columnName = columnMatch ? columnMatch[1] : 'unknown';
          console.log(`⏭️  이미 존재: ${columnName}`);
          skipCount++;
        } else {
          console.error(`❌ 에러: ${error.message}`);
          console.error(`   SQL: ${statement.substring(0, 100)}...`);
          // 치명적 에러가 아니면 계속 진행
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ 마이그레이션 완료!`);
    console.log(`   성공: ${successCount}개`);
    console.log(`   건너뜀: ${skipCount}개 (이미 존재)`);
    console.log('='.repeat(50));

    // 최종 테이블 구조 확인
    console.log('\n📊 payments 테이블 구조 확인 중...\n');
    const columns = await db.query(`
      SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'payments'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('payments 테이블 컬럼:');
    console.log('-'.repeat(100));
    columns.forEach((col: any) => {
      console.log(`  ${col.COLUMN_NAME.padEnd(30)} ${col.COLUMN_TYPE.padEnd(20)} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log('-'.repeat(100));
    console.log(`총 ${columns.length}개 컬럼\n`);

    process.exit(0);
  } catch (error: any) {
    console.error('❌ 마이그레이션 실패:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runPaymentsMigration();
