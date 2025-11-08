const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function runMigration() {
  console.log('🔧 Adding social login columns to Neon users table...\n');

  const databaseUrl = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ Database URL not configured');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  try {
    // 1. provider 컬럼 추가
    try {
      await sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS provider VARCHAR(20) NULL
      `;
      console.log('✅ provider column added');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  provider column already exists');
      } else {
        throw error;
      }
    }

    // 2. provider_id 컬럼 추가
    try {
      await sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS provider_id VARCHAR(100) NULL
      `;
      console.log('✅ provider_id column added');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  provider_id column already exists');
      } else {
        throw error;
      }
    }

    // 3. 인덱스 추가 (성능 향상)
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_users_provider
        ON users(provider, provider_id)
      `;
      console.log('✅ Index created on provider + provider_id');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  Index already exists');
      } else {
        throw error;
      }
    }

    // 4. 현재 users 테이블 스키마 확인
    console.log('\n📋 Checking users table schema...');
    const schemaResult = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('provider', 'provider_id')
      ORDER BY ordinal_position
    `;

    if (schemaResult.length > 0) {
      console.log('\n✅ Social login columns verified:');
      schemaResult.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    } else {
      console.log('\n⚠️  Warning: Could not verify columns');
    }

    console.log('\n🎉 Social login migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }
}

runMigration().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
