const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: true
    }
  });

  try {
    console.log('📡 Connected to PlanetScale DB');

    // Read SQL file
    const sqlPath = path.join(__dirname, '..', 'database', 'partners-table-enhancement.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split by semicolon and filter out empty statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('SELECT'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.length > 0) {
        try {
          console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
          await connection.execute(stmt);
          console.log(`✅ Statement ${i + 1} completed\n`);
        } catch (error) {
          // Ignore "column already exists" errors
          if (error.code === 'ER_DUP_FIELDNAME') {
            console.log(`⚠️  Column already exists, skipping...\n`);
          } else {
            console.error(`❌ Error executing statement ${i + 1}:`, error.message);
            throw error;
          }
        }
      }
    }

    // Verify columns
    console.log('\n🔍 Verifying new columns...');
    const [rows] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'partners'
        AND COLUMN_NAME IN (
          'business_name', 'contact_name', 'business_address', 'location', 'services',
          'base_price', 'images', 'lat', 'lng', 'is_verified', 'approved_at'
        )
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 New columns added:');
    rows.forEach(row => {
      console.log(`   - ${row.COLUMN_NAME} (${row.DATA_TYPE})`);
    });

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
    console.log('\n🔌 Database connection closed');
  }
}

runMigration()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
