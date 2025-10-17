/**
 * 모든 ENUM 컬럼 확인
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkEnums() {
  let connection;

  try {
    console.log('📡 Connecting to database...\n');

    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      ssl: { rejectUnauthorized: false }
    });

    // 모든 ENUM 컬럼 조회
    const [enums] = await connection.query(`
      SELECT
        TABLE_NAME,
        COLUMN_NAME,
        COLUMN_TYPE,
        COLUMN_DEFAULT,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
        AND DATA_TYPE = 'enum'
      ORDER BY TABLE_NAME, COLUMN_NAME
    `, [process.env.DATABASE_NAME]);

    console.log(`🔍 Found ${enums.length} ENUM columns:\n`);

    let currentTable = '';
    for (const col of enums) {
      if (currentTable !== col.TABLE_NAME) {
        currentTable = col.TABLE_NAME;
        console.log(`\n📋 Table: ${col.TABLE_NAME}`);
        console.log('─'.repeat(80));
      }

      // ENUM 값 추출
      const enumMatch = col.COLUMN_TYPE.match(/enum\((.*)\)/);
      const enumValues = enumMatch ? enumMatch[1] : '';

      console.log(`  ✓ ${col.COLUMN_NAME}`);
      console.log(`    Values: ${enumValues}`);
      console.log(`    Default: ${col.COLUMN_DEFAULT || 'NULL'}`);
      console.log(`    Nullable: ${col.IS_NULLABLE}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ ENUM 검사 완료\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkEnums();
