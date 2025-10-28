const { neon } = require('@neondatabase/serverless');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const databaseUrl = process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    return res.status(500).json({
      success: false,
      error: 'Database URL not configured'
    });
  }

  const sql = neon(databaseUrl);

  try {
    console.log('🔧 Adding social login columns to users table...');

    // provider 컬럼 추가 (nullable, 일반 로그인은 NULL)
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

    // provider_id 컬럼 추가 (nullable, 일반 로그인은 NULL)
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

    // provider + provider_id에 인덱스 추가 (소셜 로그인 조회 성능 향상)
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

    console.log('🎉 Social login columns migration completed!');

    return res.status(200).json({
      success: true,
      message: 'Social login columns added successfully',
      columns: ['provider', 'provider_id']
    });

  } catch (error) {
    console.error('❌ Migration error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.toString()
    });
  }
}
