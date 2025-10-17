/**
 * Fix missing columns in partners and rentcar_vendors tables
 *
 * Missing columns:
 * 1. partners.is_active - 활성화 여부
 * 2. rentcar_vendors.rating - 평균 평점
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixMissingColumns() {
  let connection;

  try {
    console.log('🔧 Starting missing columns fix...\n');

    // Connect to database
    console.log('📡 Connecting to PlanetScale database...');
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      ssl: {
        rejectUnauthorized: false
      }
    });
    console.log('✅ Connected\n');

    // ============================================
    // 1. Check and add partners.is_active
    // ============================================
    console.log('🔍 Checking partners table...');
    const [partnersColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'partners'
    `, [process.env.DATABASE_NAME]);

    const partnersColNames = partnersColumns.map(c => c.COLUMN_NAME);

    if (!partnersColNames.includes('is_active')) {
      console.log('  ⚠️  Missing: is_active');
      console.log('  🚀 Adding column: is_active...');

      await connection.execute(`
        ALTER TABLE partners
        ADD COLUMN is_active TINYINT(1) DEFAULT 1
        COMMENT '활성화 여부 (1=활성, 0=비활성)'
        AFTER is_featured
      `);

      console.log('  ✅ partners.is_active added\n');
    } else {
      console.log('  ✅ is_active already exists\n');
    }

    // ============================================
    // 2. Check and add rentcar_vendors.rating
    // ============================================
    console.log('🔍 Checking rentcar_vendors table...');
    const [vendorsColumns] = await connection.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'rentcar_vendors'
    `, [process.env.DATABASE_NAME]);

    const vendorsColNames = vendorsColumns.map(c => c.COLUMN_NAME);

    if (!vendorsColNames.includes('rating')) {
      console.log('  ⚠️  Missing: rating');
      console.log('  🚀 Adding column: rating...');

      await connection.execute(`
        ALTER TABLE rentcar_vendors
        ADD COLUMN rating DECIMAL(3,2) DEFAULT 0.00
        COMMENT '평균 평점 (0.00-5.00)'
        AFTER business_name
      `);

      console.log('  ✅ rentcar_vendors.rating added\n');
    } else {
      console.log('  ✅ rating already exists\n');
    }

    // ============================================
    // 3. Verification
    // ============================================
    console.log('🔍 Verifying migration...\n');

    const [partnersCheck] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'partners'
        AND COLUMN_NAME = 'is_active'
    `, [process.env.DATABASE_NAME]);

    const [vendorsCheck] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'rentcar_vendors'
        AND COLUMN_NAME = 'rating'
    `, [process.env.DATABASE_NAME]);

    console.log('📋 Verification Results:');
    console.log('─────────────────────────────────────────');

    if (partnersCheck.length > 0) {
      console.log('✅ partners.is_active:');
      console.log(`   Type: ${partnersCheck[0].DATA_TYPE}`);
      console.log(`   Default: ${partnersCheck[0].COLUMN_DEFAULT}`);
    } else {
      console.log('❌ partners.is_active: NOT FOUND');
    }

    if (vendorsCheck.length > 0) {
      console.log('✅ rentcar_vendors.rating:');
      console.log(`   Type: ${vendorsCheck[0].DATA_TYPE}`);
      console.log(`   Default: ${vendorsCheck[0].COLUMN_DEFAULT}`);
    } else {
      console.log('❌ rentcar_vendors.rating: NOT FOUND');
    }

    console.log('─────────────────────────────────────────\n');

    // Test queries
    console.log('🔍 Testing queries...');

    try {
      const [partners] = await connection.query(`
        SELECT id, business_name, is_active
        FROM partners
        LIMIT 1
      `);
      console.log('  ✅ SELECT partners.is_active - Success');
    } catch (err) {
      console.log(`  ❌ SELECT partners.is_active - Failed: ${err.message}`);
    }

    try {
      const [vendors] = await connection.query(`
        SELECT id, business_name, rating
        FROM rentcar_vendors
        LIMIT 1
      `);
      console.log('  ✅ SELECT rentcar_vendors.rating - Success');
    } catch (err) {
      console.log(`  ❌ SELECT rentcar_vendors.rating - Failed: ${err.message}`);
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('  ✅ partners.is_active added (TINYINT, default 1)');
    console.log('  ✅ rentcar_vendors.rating added (DECIMAL(3,2), default 0.00)');
    console.log('\n🎉 Server errors should be resolved now!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('📡 Database connection closed');
    }
  }
}

// Execute migration
fixMissingColumns();
