import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

async function enhanceReviewsSchema() {
  const conn = connect(config);

  console.log('🔧 리뷰 시스템 스키마 강화 중...\n');

  // 1. reviews 테이블에 새 컬럼 추가
  console.log('1️⃣  reviews 테이블에 컬럼 추가 중...');

  const columnsToAdd = [
    { name: 'review_images', sql: 'ADD COLUMN review_images JSON' },
    { name: 'booking_id', sql: 'ADD COLUMN booking_id BIGINT' },
    { name: 'is_hidden', sql: 'ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE' },
    { name: 'hidden_reason', sql: 'ADD COLUMN hidden_reason VARCHAR(500)' }
  ];

  for (const col of columnsToAdd) {
    try {
      await conn.execute(`ALTER TABLE reviews ${col.sql}`);
      console.log(`   ✅ ${col.name} 컬럼 추가됨`);
    } catch (error: any) {
      if (error.message.includes('Duplicate column')) {
        console.log(`   ⚠️  ${col.name} 이미 존재함`);
      } else {
        console.log(`   ❌ ${col.name} 추가 실패:`, error.message);
      }
    }
  }

  // Add index
  try {
    await conn.execute(`ALTER TABLE reviews ADD INDEX idx_booking_id (booking_id)`);
    console.log('   ✅ idx_booking_id 인덱스 추가됨\n');
  } catch (error: any) {
    if (error.message.includes('Duplicate key')) {
      console.log('   ⚠️  idx_booking_id 인덱스 이미 존재함\n');
    }
  }

  // 2. review_reports 테이블 생성 (리뷰 신고)
  console.log('2️⃣  review_reports 테이블 생성 중...');

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS review_reports (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      review_id BIGINT NOT NULL,
      reporter_user_id BIGINT NOT NULL,
      reason ENUM('spam', 'offensive', 'fake', 'inappropriate', 'other') NOT NULL,
      description TEXT,
      status ENUM('pending', 'reviewed', 'resolved', 'dismissed') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_review_id (review_id),
      INDEX idx_reporter (reporter_user_id),
      INDEX idx_status (status)
    )
  `);
  console.log('   ✅ review_reports 테이블 생성됨\n');

  // 3. review_helpful 테이블 생성 (도움됨 기능)
  console.log('3️⃣  review_helpful 테이블 생성 중...');

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS review_helpful (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      review_id BIGINT NOT NULL,
      user_id BIGINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_review (review_id, user_id),
      INDEX idx_review_id (review_id),
      INDEX idx_user_id (user_id)
    )
  `);
  console.log('   ✅ review_helpful 테이블 생성됨\n');

  console.log('🎉 리뷰 시스템 스키마 강화 완료!');
  console.log('\n추가된 기능:');
  console.log('  ✅ 리뷰 이미지 업로드 (review_images)');
  console.log('  ✅ 예약 검증 (booking_id)');
  console.log('  ✅ 리뷰 신고 (review_reports 테이블)');
  console.log('  ✅ 도움됨 기능 (review_helpful 테이블)');
  console.log('  ✅ 리뷰 숨김 기능 (is_hidden, hidden_reason)');

  process.exit(0);
}

enhanceReviewsSchema().catch(error => {
  console.error('❌ 에러:', error);
  process.exit(1);
});
