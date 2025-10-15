import { db } from '../utils/database-cloud';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🔄 PMS 컬럼 마이그레이션 시작...');

    // SQL 파일 읽기
    const sqlPath = path.join(__dirname, 'add-pms-columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // SQL 문을 세미콜론으로 분리
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT'));

    for (const statement of statements) {
      try {
        await db.execute(statement);
        console.log(`✅ 실행 완료: ${statement.substring(0, 50)}...`);
      } catch (error: any) {
        // ALTER TABLE IF NOT EXISTS는 이미 존재하면 오류가 날 수 있음
        if (!error.message.includes('Duplicate column')) {
          console.warn(`⚠️  ${error.message}`);
        }
      }
    }

    console.log('✅ 마이그레이션 완료!');
    process.exit(0);
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  }
}

runMigration();
