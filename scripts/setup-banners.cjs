/**
 * 배너 테이블 생성 및 샘플 데이터 삽입 스크립트
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function setupBanners() {
  console.log('\n' + '='.repeat(80));
  console.log('🎨 배너 테이블 설정 시작');
  console.log('='.repeat(80));

  try {
    const conn = connect({ url: process.env.DATABASE_URL });

    // 1. 테이블 생성
    console.log('\n1️⃣  home_banners 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS home_banners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        image_url VARCHAR(500) NOT NULL COMMENT '배너 이미지 URL',
        title VARCHAR(200) DEFAULT NULL COMMENT '배너 제목',
        link_url VARCHAR(500) DEFAULT NULL COMMENT '클릭 시 이동할 URL',
        display_order INT NOT NULL DEFAULT 0 COMMENT '표시 순서',
        is_active BOOLEAN NOT NULL DEFAULT TRUE COMMENT '활성화 여부',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_display_order (display_order),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='홈페이지 배너 관리'
    `);
    console.log('✅ 테이블 생성 완료');

    // 2. 기존 데이터 확인
    console.log('\n2️⃣  기존 배너 데이터 확인 중...');
    const existingData = await conn.execute('SELECT COUNT(*) as count FROM home_banners');
    const count = existingData.rows[0]?.count || 0;
    console.log(`📊 기존 배너 수: ${count}개`);

    // 3. 샘플 데이터 삽입 (기존 데이터가 없는 경우만)
    if (count === 0) {
      console.log('\n3️⃣  샘플 배너 데이터 삽입 중...');
      await conn.execute(`
        INSERT INTO home_banners (image_url, title, link_url, display_order, is_active) VALUES
        ('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=400&fit=crop', '신안 여름 특별 할인', '/search?category=stay', 0, TRUE),
        ('https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=1200&h=400&fit=crop', '갯벌 체험 프로그램', '/category/experience', 1, TRUE),
        ('https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=1200&h=400&fit=crop', '홍도 투어 예약 오픈', '/category/tour', 2, TRUE)
      `);
      console.log('✅ 샘플 데이터 3개 삽입 완료');
    } else {
      console.log('ℹ️  기존 배너가 있어 샘플 데이터를 삽입하지 않습니다.');
    }

    // 4. 최종 확인
    console.log('\n4️⃣  배너 데이터 최종 확인...');
    const banners = await conn.execute(`
      SELECT id, title, image_url, link_url, display_order, is_active
      FROM home_banners
      ORDER BY display_order ASC
    `);

    console.log('\n📋 현재 배너 목록:');
    console.log('-'.repeat(80));
    banners.rows.forEach((banner, index) => {
      console.log(`${index + 1}. ${banner.title || '제목 없음'}`);
      console.log(`   순서: ${banner.display_order} | 활성: ${banner.is_active ? '✅' : '❌'}`);
      console.log(`   이미지: ${banner.image_url}`);
      console.log(`   링크: ${banner.link_url || '없음'}`);
      console.log('-'.repeat(80));
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ 배너 설정 완료!');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ 에러 발생:', error);
    process.exit(1);
  }
}

setupBanners();
