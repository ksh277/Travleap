#!/usr/bin/env tsx
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

async function setupBanners() {
  console.log('🎨 배너 테이블 설정 중...\n');

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // 1. banners 테이블 확인
    const tables = await connection.execute("SHOW TABLES LIKE 'banners'");
    console.log('📋 banners 테이블:', tables.rows.length > 0 ? '✅ 존재' : '❌ 없음');

    if (tables.rows.length === 0) {
      console.log('\n⚙️  banners 테이블 생성 중...');

      // banners 테이블 생성
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS banners (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          image_url VARCHAR(500) NOT NULL,
          title VARCHAR(200),
          link_url VARCHAR(500),
          display_order INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_active_order (is_active, display_order)
        )
      `);

      console.log('✅ banners 테이블 생성 완료\n');

      // 샘플 배너 데이터 추가
      console.log('📸 샘플 배너 추가 중...');
      await connection.execute(`
        INSERT INTO banners (image_url, title, link_url, display_order, is_active)
        VALUES
          ('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=400&fit=crop', '신안 여행의 모든 것', '/category/tour', 1, 1),
          ('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&h=400&fit=crop', '아름다운 신안 해변', '/category/tourist', 2, 1)
      `);

      console.log('✅ 샘플 배너 2개 추가 완료\n');
    }

    // 2. 배너 목록 조회
    const banners = await connection.execute('SELECT * FROM banners ORDER BY display_order');
    console.log(`📊 현재 배너: ${banners.rows.length}개\n`);

    if (banners.rows.length > 0) {
      banners.rows.forEach((b: any) => {
        console.log(`   ID: ${b.id}`);
        console.log(`   제목: ${b.title || '(제목없음)'}`);
        console.log(`   이미지: ${b.image_url}`);
        console.log(`   링크: ${b.link_url || '(링크없음)'}`);
        console.log(`   순서: ${b.display_order}`);
        console.log(`   활성: ${b.is_active ? '✅' : '❌'}`);
        console.log('');
      });
    } else {
      console.log('   배너가 없습니다.\n');
    }

    console.log('✅ 배너 설정 완료!');
  } catch (error: any) {
    console.error('❌ 오류 발생:', error.message);
    process.exit(1);
  }
}

setupBanners();
