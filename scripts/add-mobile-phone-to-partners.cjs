const mysql = require('mysql2/promise');
require('dotenv').config();

async function addMobilePhoneToPartners() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      ssl: { rejectUnauthorized: true }
    });

    console.log('✅ Connected to PlanetScale\n');

    // Check if mobile_phone column exists
    console.log('🔍 Checking if mobile_phone column exists...');
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM partners LIKE 'mobile_phone'
    `);

    if (columns.length > 0) {
      console.log('✅ mobile_phone column already exists');
    } else {
      console.log('📝 Adding mobile_phone column to partners table...');
      await connection.execute(`
        ALTER TABLE partners
        ADD COLUMN mobile_phone VARCHAR(50) NULL AFTER phone
      `);
      console.log('✅ mobile_phone column added successfully (휴대전화번호 010 등)');
    }

    // Show updated structure
    console.log('\n📋 Updated Phone-related Columns:');
    const [phoneColumns] = await connection.execute(`
      SHOW COLUMNS FROM partners WHERE Field LIKE '%phone%'
    `);
    console.table(phoneColumns.map(c => ({ Field: c.Field, Type: c.Type, Null: c.Null })));

    console.log('\n📝 Field Usage:');
    console.log('  - phone: 가게 전화번호 (061, 02 등)');
    console.log('  - mobile_phone: 휴대전화번호 (010 등)');
    console.log('  - 표시 우선순위: phone → mobile_phone (가게번호 우선, 없으면 휴대전화)');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

addMobilePhoneToPartners()
  .then(() => {
    console.log('\n✅ Migration complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
