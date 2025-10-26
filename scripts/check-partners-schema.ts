import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const planetscale = connect({
  url: process.env.DATABASE_URL
});

async function checkSchema() {
  console.log('🔍 partners 테이블 스키마 확인...\n');

  const result = await planetscale.execute('DESCRIBE partners');

  console.log('📋 partners 테이블 컬럼 정보:\n');
  result.rows.forEach((row: any) => {
    console.log(`  - ${row.Field}: ${row.Type} ${row.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${row.Default ? `DEFAULT ${row.Default}` : ''}`);
  });
}

checkSchema()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 오류:', error);
    process.exit(1);
  });
