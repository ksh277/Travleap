/**
 * Add video support columns to banners table
 */
require('dotenv').config();
const { connect } = require('@planetscale/database');

async function addVideoColumns() {
  console.log('🚀 Starting migration: Add video columns to banners table...');

  const config = {
    url: process.env.DATABASE_URL
  };

  if (!config.url) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  const db = connect(config);

  try {
    // 1. Add media_type column
    console.log('📝 Adding media_type column...');
    try {
      await db.execute(`ALTER TABLE banners ADD COLUMN media_type ENUM('image', 'video') DEFAULT 'image' AFTER is_active`);
      console.log('✅ media_type column added to banners');
    } catch (error) {
      if (error.message && error.message.includes('Duplicate column')) {
        console.log('ℹ️  media_type column already exists');
      } else {
        throw error;
      }
    }

    // 2. Add video_url column
    console.log('📝 Adding video_url column...');
    try {
      await db.execute(`ALTER TABLE banners ADD COLUMN video_url VARCHAR(500) NULL AFTER media_type`);
      console.log('✅ video_url column added to banners');
    } catch (error) {
      if (error.message && error.message.includes('Duplicate column')) {
        console.log('ℹ️  video_url column already exists');
      } else {
        throw error;
      }
    }

    console.log('✅ Migration completed successfully!');

    // Verify columns
    console.log('\n📋 Verifying table structure...');
    const result = await db.execute('DESCRIBE banners');
    console.log('\nColumns in banners table:');
    result.rows.forEach(row => {
      console.log(`  - ${row.Field} (${row.Type})`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }

  console.log('\n✨ All done!');
  process.exit(0);
}

addVideoColumns();
