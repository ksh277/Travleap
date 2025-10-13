const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: { rejectUnauthorized: false }
  });

  console.log('📋 Checking listings table structure:\n');
  const [cols] = await conn.query('DESCRIBE listings');
  cols.forEach(c => {
    console.log(`  - ${c.Field}: ${c.Type}${c.Null === 'YES' ? ' (nullable)' : ''}`);
  });

  await conn.end();
})();
