/**
 * PlanetScale MySQL - Social Login Columns Migration
 *
 * Adds provider and provider_id columns to users table in PlanetScale MySQL
 * (Note: Neon PostgreSQL already has these columns via api/add-social-login-columns.js)
 */

const { connect } = require('@planetscale/database');

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

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return res.status(500).json({
      success: false,
      error: 'PlanetScale DATABASE_URL not configured'
    });
  }

  const connection = connect({ url: databaseUrl });

  try {
    console.log('🔧 [PlanetScale] Adding social login columns to users table...');

    const results = [];

    // 1. provider 컬럼 추가
    try {
      await connection.execute(`
        ALTER TABLE users
        ADD COLUMN provider VARCHAR(20) NULL
      `);
      console.log('✅ [PlanetScale] provider column added');
      results.push({ column: 'provider', status: 'added' });
    } catch (error) {
      if (error.message.includes('Duplicate column') || error.message.includes('already exists')) {
        console.log('ℹ️  [PlanetScale] provider column already exists');
        results.push({ column: 'provider', status: 'exists' });
      } else {
        console.error('❌ [PlanetScale] Error adding provider column:', error.message);
        results.push({ column: 'provider', status: 'error', error: error.message });
      }
    }

    // 2. provider_id 컬럼 추가
    try {
      await connection.execute(`
        ALTER TABLE users
        ADD COLUMN provider_id VARCHAR(100) NULL
      `);
      console.log('✅ [PlanetScale] provider_id column added');
      results.push({ column: 'provider_id', status: 'added' });
    } catch (error) {
      if (error.message.includes('Duplicate column') || error.message.includes('already exists')) {
        console.log('ℹ️  [PlanetScale] provider_id column already exists');
        results.push({ column: 'provider_id', status: 'exists' });
      } else {
        console.error('❌ [PlanetScale] Error adding provider_id column:', error.message);
        results.push({ column: 'provider_id', status: 'error', error: error.message });
      }
    }

    // 3. 인덱스 생성 (소셜 로그인 조회 성능 향상)
    try {
      await connection.execute(`
        CREATE INDEX idx_users_provider ON users(provider, provider_id)
      `);
      console.log('✅ [PlanetScale] Index created on provider + provider_id');
      results.push({ index: 'idx_users_provider', status: 'created' });
    } catch (error) {
      if (error.message.includes('Duplicate key') || error.message.includes('already exists')) {
        console.log('ℹ️  [PlanetScale] Index already exists');
        results.push({ index: 'idx_users_provider', status: 'exists' });
      } else {
        console.error('❌ [PlanetScale] Error creating index:', error.message);
        results.push({ index: 'idx_users_provider', status: 'error', error: error.message });
      }
    }

    console.log('🎉 [PlanetScale] Social login migration completed!');

    return res.status(200).json({
      success: true,
      message: 'Social login columns added to PlanetScale MySQL users table',
      results
    });

  } catch (error) {
    console.error('❌ [PlanetScale] Migration error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      details: error.toString()
    });
  }
}
