const { Pool } = require('@neondatabase/serverless');
require('dotenv').config();

async function getSchema() {
  const pool = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL });

  const result = await pool.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position
  `);

  console.log('=== Travleap users 테이블 스키마 ===\n');
  result.rows.forEach(row => {
    console.log(`${row.column_name} | ${row.data_type} | nullable: ${row.is_nullable} | default: ${row.column_default || 'none'}`);
  });

  await pool.end();
}

getSchema().catch(console.error);
