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
    console.log('🔧 Adding missing columns to users table...');

    const columnsToAdd = [
      {
        name: 'avatar',
        sql: 'VARCHAR(500) NULL',
        description: '프로필 사진 URL'
      },
      {
        name: 'phone',
        sql: 'VARCHAR(20) NULL',
        description: '전화번호'
      },
      {
        name: 'preferred_language',
        sql: 'VARCHAR(10) DEFAULT \'ko\'',
        description: '선호 언어'
      },
      {
        name: 'preferred_currency',
        sql: 'VARCHAR(3) DEFAULT \'KRW\'',
        description: '선호 통화'
      },
      {
        name: 'marketing_consent',
        sql: 'INTEGER DEFAULT 0',
        description: '마케팅 수신 동의'
      }
    ];

    const results = [];

    for (const column of columnsToAdd) {
      try {
        await sql.unsafe(`
          ALTER TABLE users
          ADD COLUMN IF NOT EXISTS ${column.name} ${column.sql}
        `);
        console.log(`✅ ${column.name} column added: ${column.description}`);
        results.push({ column: column.name, status: 'added', description: column.description });
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  ${column.name} column already exists`);
          results.push({ column: column.name, status: 'exists', description: column.description });
        } else {
          console.error(`❌ Error adding ${column.name}:`, error.message);
          results.push({ column: column.name, status: 'error', error: error.message });
        }
      }
    }

    console.log('🎉 Missing columns migration completed!');

    return res.status(200).json({
      success: true,
      message: 'Missing user columns added successfully',
      results
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
