import { db } from '../utils/database-cloud';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🔄 누락된 테이블 생성 시작...');

    // SQL 파일 읽기
    const sqlPath = path.join(__dirname, 'fix-missing-tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // SQL 문을 세미콜론으로 분리
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT'));

    console.log(`📝 실행할 SQL 문: ${statements.length}개`);

    for (const statement of statements) {
      try {
        await db.execute(statement);
        const firstLine = statement.substring(0, 100).replace(/\s+/g, ' ');
        console.log(`✅ 실행 완료: ${firstLine}...`);
      } catch (error: any) {
        // 테이블이 이미 존재하면 무시
        if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
          console.log(`ℹ️  테이블이 이미 존재합니다.`);
        } else {
          console.warn(`⚠️  ${error.message}`);
        }
      }
    }

    console.log('\n✅ 마이그레이션 완료!');
    console.log('📋 생성된 테이블:');
    console.log('   - home_banners (배너 관리)');
    console.log('   - activity_images (액티비티 이미지)');
    console.log('   - vendor_settings (벤더 설정)');
    console.log('   - payment_events (결제 이벤트)');
    console.log('   - booking_logs (예약 로그)');

    process.exit(0);
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  }
}

runMigration();
