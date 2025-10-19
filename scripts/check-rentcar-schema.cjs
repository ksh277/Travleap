const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME || 'travleap',
      ssl: { rejectUnauthorized: true }
    });

    const [columns] = await connection.execute(`
      DESCRIBE rentcar_vehicles
    `);

    console.log('\nrentcar_vehicles 테이블 컬럼:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkSchema();
