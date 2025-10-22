/**
 * PlanetScale reviews 테이블 재생성 스크립트
 * 기존 reviews 테이블을 삭제하고 깨끗하게 다시 생성합니다.
 */

import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function recreateReviewsTable() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🗑️  기존 reviews 테이블 삭제 중...');
    await connection.execute('DROP TABLE IF EXISTS reviews');
    console.log('✅ reviews 테이블 삭제 완료');

    console.log('\n📝 새로운 reviews 테이블 생성 중...');
    await connection.execute(`
      CREATE TABLE reviews (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        listing_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        rating INT NOT NULL,
        title VARCHAR(200),
        comment_md TEXT,
        review_type ENUM('listing', 'partner', 'blog') DEFAULT 'listing',
        is_verified BOOLEAN DEFAULT FALSE,
        helpful_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_listing_id (listing_id),
        INDEX idx_user_id (user_id),
        INDEX idx_rating (rating),
        INDEX idx_created_at (created_at)
      )
    `);
    console.log('✅ reviews 테이블 생성 완료');

    console.log('\n✅ reviews 테이블 재생성 완료!');
    console.log('이제 리뷰를 작성할 수 있습니다.');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

recreateReviewsTable()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
