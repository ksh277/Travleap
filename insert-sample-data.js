import { connect } from '@planetscale/database';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  url: process.env.VITE_PLANETSCALE_HOST?.replace(/'/g, '') || '',
  username: process.env.VITE_PLANETSCALE_USERNAME || '',
  password: process.env.VITE_PLANETSCALE_PASSWORD || ''
};

async function insertSampleData() {
  console.log('=== 샘플 데이터 삽입 ===\n');

  try {
    const conn = connect(config);

    // 1. 카테고리 데이터
    console.log('1. 카테고리 데이터 삽입 중...');
    await conn.execute(`
      INSERT INTO categories (slug, name_ko, name_en, icon, color_hex, sort_order) VALUES
      ('tour', '투어/체험', 'Tours & Experiences', 'map', '#FF6B6B', 1),
      ('stay', '숙박', 'Accommodation', 'bed', '#4ECDC4', 2),
      ('food', '맛집', 'Restaurants', 'utensils', '#45B7D1', 3),
      ('attraction', '관광지', 'Attractions', 'camera', '#96CEB4', 4),
      ('event', '축제/이벤트', 'Events & Festivals', 'calendar', '#FECA57', 5),
      ('rentcar', '렌터카', 'Car Rental', 'car', '#6C5CE7', 6)
    `);
    console.log('✅ 카테고리 6개 삽입 완료');

    // 2. 관리자 계정
    console.log('2. 관리자 계정 생성 중...');
    await conn.execute(`
      INSERT INTO users (user_id, email, password_hash, name, role) VALUES
      ('admin001', 'admin@shinan.com', '$2y$10$example_hash', '관리자', 'admin')
    `);
    console.log('✅ 관리자 계정 생성 완료');

    // 3. 샘플 사용자 계정
    console.log('3. 샘플 사용자 계정 생성 중...');
    await conn.execute(`
      INSERT INTO users (user_id, email, password_hash, name, phone, role) VALUES
      ('user001', 'user1@example.com', '$2y$10$example_hash', '김신안', '010-1234-5678', 'user'),
      ('user002', 'user2@example.com', '$2y$10$example_hash', '이여행', '010-2345-6789', 'user'),
      ('partner001', 'partner1@example.com', '$2y$10$example_hash', '박사업', '010-3456-7890', 'partner')
    `);
    console.log('✅ 샘플 사용자 3개 생성 완료');

    // 4. 파트너 정보
    console.log('4. 파트너 정보 생성 중...');
    await conn.execute(`
      INSERT INTO partners (user_id, business_name, contact_name, email, phone, tier, is_verified, status, description) VALUES
      (4, '신안 여행사', '박사업', 'partner1@example.com', '010-3456-7890', 'gold', TRUE, 'approved', '신안군 전 지역 여행 상품을 제공하는 전문 여행사입니다.')
    `);
    console.log('✅ 파트너 정보 1개 생성 완료');

    // 5. 여행 상품 데이터
    console.log('5. 여행 상품 데이터 삽입 중...');
    await conn.execute(`
      INSERT INTO listings (category_id, partner_id, title, description_md, short_description, price_from, location, rating_avg, duration, max_capacity, images, is_published, featured_score) VALUES
      (1, 1, '신안 천일염 체험', '# 신안 천일염 체험\\n\\n전통적인 천일염 제조 과정을 직접 체험해보세요. 갯벌에서 직접 소금을 수확하고, 천일염이 만들어지는 과정을 배울 수 있습니다.', '전통적인 천일염 제조 과정을 직접 체험해보세요', 25000, '신안군 증도면', 4.8, '2시간', 20, '[\"https://via.placeholder.com/400x300\"]', TRUE, 5),
      (1, 1, '증도 슬로시티 투어', '# 증도 슬로시티 투어\\n\\n유네스코 생물권보전지역 증도의 아름다운 자연을 만나보세요. 염전, 갯벌, 해변을 천천히 둘러보며 여유로운 시간을 보낼 수 있습니다.', '유네스코 생물권보전지역 증도의 아름다운 자연을 만나보세요', 35000, '신안군 증도면', 4.6, '4시간', 15, '[\"https://via.placeholder.com/400x300\"]', TRUE, 4),
      (2, 1, '신안 펜션 바다뷰', '# 신안 펜션 바다뷰\\n\\n바다가 한눈에 보이는 아늑한 펜션에서 힐링하세요. 깨끗한 시설과 아름다운 바다 전망이 여러분을 기다립니다.', '바다가 한눈에 보이는 아늑한 펜션에서 힐링하세요', 120000, '신안군 자은도', 4.7, '1박', 6, '[\"https://via.placeholder.com/400x300\"]', TRUE, 3),
      (1, 1, '흑산도 등대 트레킹', '# 흑산도 등대 트레킹\\n\\n흑산도의 상징인 등대까지 트레킹하며 절경을 감상하세요. 아름다운 해안선과 등대의 역사를 함께 배울 수 있습니다.', '흑산도의 상징인 등대까지 트레킹하며 절경을 감상하세요', 30000, '신안군 흑산면', 4.5, '3시간', 12, '[\"https://via.placeholder.com/400x300\"]', TRUE, 2),
      (3, 1, '신안 특산물 투어', '# 신안 특산물 투어\\n\\n신안의 대표 특산물을 직접 보고 맛보는 투어입니다. 천일염, 젓갈, 해산물 등을 체험하고 구매할 수 있습니다.', '신안의 대표 특산물을 직접 보고 맛보는 투어', 40000, '신안군 전역', 4.9, '5시간', 10, '[\"https://via.placeholder.com/400x300\"]', TRUE, 5)
    `);
    console.log('✅ 여행 상품 5개 삽입 완료');

    // 6. 투어 상세 정보
    console.log('6. 투어 상세 정보 삽입 중...');
    await conn.execute(`
      INSERT INTO listing_tour (listing_id, tour_type, duration_hours, meeting_point, included_md, excluded_md, difficulty_level) VALUES
      (1, 'salt_experience', 2, '증도 염전 입구', '- 전문 가이드\\n- 체험 도구\\n- 기념품', '- 개인 용품\\n- 식사', 'easy'),
      (2, 'city', 4, '증도 터미널', '- 전문 가이드\\n- 점심 식사\\n- 교통편', '- 개인 용품', 'easy'),
      (4, 'activity', 3, '흑산도 항구', '- 전문 가이드\\n- 안전 장비\\n- 간식', '- 개인 용품\\n- 식사', 'moderate'),
      (5, 'experience', 5, '신안군청 앞', '- 전문 가이드\\n- 시식\\n- 교통편', '- 개인 구매 비용', 'easy')
    `);
    console.log('✅ 투어 상세 정보 4개 삽입 완료');

    // 7. 샘플 리뷰
    console.log('7. 샘플 리뷰 삽입 중...');
    await conn.execute(`
      INSERT INTO reviews (listing_id, user_id, rating, title, comment_md, pros, cons, visit_date, is_verified) VALUES
      (1, 2, 5, '정말 좋은 체험이었어요!', '천일염 만드는 과정을 직접 볼 수 있어서 아이들이 너무 좋아했습니다. 가이드님도 친절하게 설명해주셔서 많이 배웠어요.', '가이드 설명이 자세함, 체험이 재미있음, 기념품도 좋음', '날씨가 더워서 조금 힘들었음', '2024-08-15', TRUE),
      (2, 3, 4, '자연이 아름다운 곳', '증도의 자연 경관이 정말 멋있었습니다. 힐링이 되었어요. 다만 이동시간이 좀 길어서 아쉬웠습니다.', '경치가 아름다움, 가이드가 친절함, 점심이 맛있음', '이동시간이 조금 김', '2024-08-10', TRUE),
      (3, 2, 5, '바다뷰가 환상적!', '펜션에서 보는 바다 전망이 정말 좋았습니다. 시설도 깨끗하고 조용해서 휴식하기 좋았어요.', '뷰가 좋음, 시설이 깨끗함, 조용한 환경', '주변에 편의시설이 적음', '2024-07-20', TRUE),
      (1, 3, 4, '아이들과 함께 좋아요', '아이들이 체험하기에 좋은 프로그램이었습니다. 교육적이면서도 재미있었어요.', '교육적 가치, 아이들이 좋아함', '체험 시간이 짧음', '2024-08-20', TRUE)
    `);
    console.log('✅ 샘플 리뷰 4개 삽입 완료');

    // 8. 샘플 쿠폰
    console.log('8. 샘플 쿠폰 삽입 중...');
    await conn.execute(`
      INSERT INTO coupons (code, title, description, discount_type, discount_value, min_amount, usage_limit, valid_from, valid_until, is_active) VALUES
      ('WELCOME10', '신규 회원 10% 할인', '신규 회원을 위한 특별 할인 쿠폰', 'percentage', 10, 50000, 100, NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), TRUE),
      ('SUMMER2024', '여름 휴가 20% 할인', '여름 성수기 특별 할인 쿠폰', 'percentage', 20, 100000, 50, NOW(), DATE_ADD(NOW(), INTERVAL 2 MONTH), TRUE),
      ('FIXED5000', '5천원 즉시 할인', '5만원 이상 구매시 5천원 할인', 'fixed', 5000, 50000, 200, NOW(), DATE_ADD(NOW(), INTERVAL 3 MONTH), TRUE)
    `);
    console.log('✅ 샘플 쿠폰 3개 삽입 완료');

    // 최종 데이터 확인
    console.log('\n=== 최종 데이터 현황 ===');

    const tables = [
      { name: 'users', label: '👥 사용자' },
      { name: 'categories', label: '📂 카테고리' },
      { name: 'partners', label: '🤝 파트너' },
      { name: 'listings', label: '🏝️ 여행 상품' },
      { name: 'listing_tour', label: '🚶 투어 상세' },
      { name: 'reviews', label: '⭐ 리뷰' },
      { name: 'coupons', label: '🎫 쿠폰' }
    ];

    for (const table of tables) {
      const result = await conn.execute(`SELECT COUNT(*) as count FROM ${table.name}`);
      console.log(`${table.label}: ${result.rows[0].count}개`);
    }

    console.log('\n🎉 신안 여행 플랫폼 샘플 데이터 삽입 완료!');
    console.log('✅ 이제 애플리케이션에서 실제 데이터를 사용할 수 있습니다.');

  } catch (error) {
    console.error('❌ 샘플 데이터 삽입 실패:', error);
  }
}

insertSampleData();