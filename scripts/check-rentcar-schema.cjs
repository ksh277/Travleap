const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || 'aws.connect.psdb.cloud',
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME || 'travleap',
    ssl: {
      rejectUnauthorized: true
    }
  });

  console.log('✅ Connected to database');

  const [columns] = await connection.execute(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'rentcar_vehicles'
    AND TABLE_SCHEMA = 'travleap'
    ORDER BY ORDINAL_POSITION
  `);

  console.log('\n📋 rentcar_vehicles table columns:');
  columns.forEach((col, i) => {
    console.log(`  ${i + 1}. ${col.COLUMN_NAME}`);
  });

  await connection.end();
}

checkSchema().catch(console.error);
