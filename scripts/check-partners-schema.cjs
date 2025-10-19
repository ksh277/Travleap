const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || 'aws.connect.psdb.cloud',
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME || 'travleap',
    ssl: { rejectUnauthorized: true }
  });

  console.log('✅ Connected to database\n');

  // partners 테이블
  const [partnersColumns] = await connection.execute(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'partners'
    AND TABLE_SCHEMA = 'travleap'
    ORDER BY ORDINAL_POSITION
  `);

  console.log('📋 partners table columns:');
  partnersColumns.forEach((col, i) => {
    console.log(`  ${i + 1}. ${col.COLUMN_NAME}`);
  });

  // listings 테이블
  const [listingsColumns] = await connection.execute(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'listings'
    AND TABLE_SCHEMA = 'travleap'
    ORDER BY ORDINAL_POSITION
    LIMIT 30
  `);

  console.log('\n📋 listings table columns (first 30):');
  listingsColumns.forEach((col, i) => {
    console.log(`  ${i + 1}. ${col.COLUMN_NAME}`);
  });

  // accommodation_rooms 테이블
  const [roomsColumns] = await connection.execute(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'accommodation_rooms'
    AND TABLE_SCHEMA = 'travleap'
    ORDER BY ORDINAL_POSITION
  `);

  console.log('\n📋 accommodation_rooms table columns:');
  if (roomsColumns.length > 0) {
    roomsColumns.forEach((col, i) => {
      console.log(`  ${i + 1}. ${col.COLUMN_NAME}`);
    });
  } else {
    console.log('  ❌ Table does not exist!');
  }

  await connection.end();
}

checkSchema().catch(console.error);
