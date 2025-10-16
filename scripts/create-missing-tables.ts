// 누락된 테이블 생성 스크립트
import 'dotenv/config';
import { db } from '../utils/database';

async function createMissingTables() {
  console.log('🔧 누락된 테이블 생성 시작...');

  try {
    // 1. home_banners 테이블 생성
    console.log('📦 home_banners 테이블 생성 중...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS home_banners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200),
        image_url VARCHAR(500) NOT NULL,
        link_url VARCHAR(500),
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_active (is_active),
        INDEX idx_order (display_order)
      )
    `);
    console.log('✅ home_banners 테이블 생성 완료');

    // 2. activity_images 테이블 생성
    console.log('📦 activity_images 테이블 생성 중...');
    await db.execute(`
      CREATE TABLE IF NOT EXISTS activity_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(200),
        image_url VARCHAR(500) NOT NULL,
        link_url VARCHAR(500),
        size ENUM('small', 'medium', 'large', 'full') DEFAULT 'medium',
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_active (is_active),
        INDEX idx_size (size),
        INDEX idx_order (display_order)
      )
    `);
    console.log('✅ activity_images 테이블 생성 완료');

    // 3. 테이블 확인
    const tables = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name IN ('home_banners', 'activity_images')
    `);

    console.log('\n📋 생성된 테이블:');
    tables.forEach((table: any) => {
      console.log(`  ✅ ${table.table_name || table.TABLE_NAME}`);
    });

    // 4. 샘플 데이터 추가 (선택사항)
    console.log('\n📝 샘플 데이터 추가 중...');

    // home_banners 샘플 데이터
    await db.execute(`
      INSERT INTO home_banners (title, image_url, link_url, display_order, is_active)
      VALUES
        ('신안 여행 특가', 'https://via.placeholder.com/1200x400?text=Banner+1', '/category/tour', 1, TRUE),
        ('렌트카 할인 이벤트', 'https://via.placeholder.com/1200x400?text=Banner+2', '/category/rentcar', 2, TRUE),
        ('숙박 프로모션', 'https://via.placeholder.com/1200x400?text=Banner+3', '/category/stay', 3, TRUE)
    `);
    console.log('  ✅ home_banners 샘플 데이터 3개 추가');

    // activity_images 샘플 데이터
    await db.execute(`
      INSERT INTO activity_images (title, image_url, link_url, size, display_order, is_active)
      VALUES
        ('증도 갯벌 체험', 'https://via.placeholder.com/400x300?text=Activity+1', '/listings/1', 'large', 1, TRUE),
        ('홍도 관광', 'https://via.placeholder.com/400x300?text=Activity+2', '/listings/2', 'medium', 2, TRUE),
        ('신안 섬 투어', 'https://via.placeholder.com/400x300?text=Activity+3', '/listings/3', 'medium', 3, TRUE),
        ('퍼플섬 탐방', 'https://via.placeholder.com/400x300?text=Activity+4', '/listings/4', 'small', 4, TRUE)
    `);
    console.log('  ✅ activity_images 샘플 데이터 4개 추가');

    console.log('\n✅ 모든 테이블 생성 및 데이터 추가 완료!');
  } catch (error) {
    console.error('❌ 테이블 생성 실패:', error);
    throw error;
  }
}

// 스크립트 실행
createMissingTables()
  .then(() => {
    console.log('✅ 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 오류:', error);
    process.exit(1);
  });
