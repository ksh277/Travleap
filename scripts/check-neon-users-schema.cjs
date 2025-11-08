const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function checkSchema() {
  const databaseUrl = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;
  const sql = neon(databaseUrl);

  try {
    console.log('📋 Checking Neon users table schema...\n');

    const schema = await sql`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;

    console.log('✅ Users table columns:');
    console.table(schema);

    // Check for social login columns specifically
    const hasProvider = schema.some(col => col.column_name === 'provider');
    const hasProviderId = schema.some(col => col.column_name === 'provider_id');

    console.log('\n🔍 Social login columns:');
    console.log(`  provider: ${hasProvider ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  provider_id: ${hasProviderId ? '✅ EXISTS' : '❌ MISSING'}`);

    // Check indexes
    console.log('\n📊 Checking indexes...');
    const indexes = await sql`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'users'
      AND indexname LIKE '%provider%'
    `;

    if (indexes.length > 0) {
      console.log('✅ Provider indexes:');
      indexes.forEach(idx => {
        console.log(`  - ${idx.indexname}`);
        console.log(`    ${idx.indexdef}`);
      });
    } else {
      console.log('⚠️  No provider indexes found');
    }

    // Test query
    console.log('\n🧪 Testing social login query...');
    const testQuery = await sql`
      SELECT id, email, name, provider, provider_id
      FROM users
      WHERE provider IS NOT NULL
      LIMIT 5
    `;

    if (testQuery.length > 0) {
      console.log(`✅ Found ${testQuery.length} social login users:`);
      testQuery.forEach(user => {
        console.log(`  - ${user.email} (${user.provider}:${user.provider_id})`);
      });
    } else {
      console.log('ℹ️  No social login users found (this is OK if social login is new)');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Details:', error);
  }
}

checkSchema();
