const mysql = require('mysql2/promise');
require('dotenv').config();

async function createPartnerReviewsTables() {
  let connection;

  try {
    // Connect to PlanetScale
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      ssl: {
        rejectUnauthorized: true
      }
    });

    console.log('✅ Connected to PlanetScale');

    // Create partner_reviews table
    console.log('\n📝 Creating partner_reviews table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS partner_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        partner_id INT NOT NULL,
        user_id INT NOT NULL,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT NOT NULL,
        helpful_count INT DEFAULT 0,
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_partner_id (partner_id),
        INDEX idx_user_id (user_id),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ partner_reviews table created');

    // Create review_helpful table
    console.log('\n📝 Creating review_helpful table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS review_helpful (
        id INT AUTO_INCREMENT PRIMARY KEY,
        review_id INT NOT NULL,
        user_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_review_user (review_id, user_id),
        INDEX idx_review_id (review_id),
        INDEX idx_user_id (user_id)
      )
    `);
    console.log('✅ review_helpful table created');

    // Check if partners table has rating and review_count columns
    console.log('\n📝 Checking partners table columns...');
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM partners LIKE 'rating'
    `);

    if (columns.length === 0) {
      console.log('📝 Adding rating and review_count columns to partners table...');
      await connection.execute(`
        ALTER TABLE partners
        ADD COLUMN rating DECIMAL(3,2) DEFAULT 0.00,
        ADD COLUMN review_count INT DEFAULT 0
      `);
      console.log('✅ Columns added to partners table');
    } else {
      console.log('✅ Partners table already has rating columns');
    }

    console.log('\n✅ All tables created successfully!');
    console.log('\n📊 Review System Tables:');
    console.log('  - partner_reviews: Stores reviews for partners');
    console.log('  - review_helpful: Tracks which users marked reviews as helpful');
    console.log('  - partners: Updated with rating and review_count columns');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

createPartnerReviewsTables()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
