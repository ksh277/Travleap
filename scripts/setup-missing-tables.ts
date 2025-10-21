// 누락된 테이블 생성 스크립트
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

async function setupMissingTables() {
  console.log('🔧 누락된 테이블 생성 시작...\n');

  try {
    const conn = connect(config);

    // 1. Orders 테이블 (bookings로 명명)
    console.log('📦 orders 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        listing_id INT,
        booking_date DATE NOT NULL,
        start_date DATE,
        end_date DATE,
        guests INT DEFAULT 1,
        total_amount DECIMAL(10, 2),
        status ENUM('pending', 'confirmed', 'cancelled', 'completed', 'refund_requested') DEFAULT 'pending',
        payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_listing (listing_id),
        INDEX idx_status (status),
        INDEX idx_booking_date (booking_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ orders 테이블 생성 완료\n');

    // 2. Reviews 테이블
    console.log('⭐ reviews 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        listing_id INT NOT NULL,
        user_id INT NOT NULL,
        rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
        title VARCHAR(200),
        content TEXT NOT NULL,
        images JSON,
        helpful_count INT DEFAULT 0,
        is_verified BOOLEAN DEFAULT false,
        admin_reply TEXT,
        admin_reply_at DATETIME,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_listing (listing_id),
        INDEX idx_user (user_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ reviews 테이블 생성 완료\n');

    // 3. Contacts 테이블
    console.log('📞 contacts 테이블 생성 중...');
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        subject VARCHAR(200),
        message TEXT NOT NULL,
        status ENUM('pending', 'replied', 'resolved', 'closed') DEFAULT 'pending',
        reply TEXT,
        replied_at DATETIME,
        replied_by INT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_status (status),
        INDEX idx_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ contacts 테이블 생성 완료\n');

    // 4. 샘플 데이터 추가 (테스트용)
    console.log('📝 샘플 데이터 추가 중...\n');

    // 샘플 주문 데이터
    console.log('🛒 샘플 주문 추가...');
    await conn.execute(`
      INSERT INTO orders (user_id, listing_id, booking_date, start_date, end_date, guests, total_amount, status, payment_status)
      VALUES
        (1, 1, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 7 DAY), DATE_ADD(CURDATE(), INTERVAL 9 DAY), 2, 150000, 'completed', 'paid'),
        (1, 2, DATE_SUB(CURDATE(), INTERVAL 5 DAY), DATE_ADD(CURDATE(), INTERVAL 14 DAY), DATE_ADD(CURDATE(), INTERVAL 16 DAY), 4, 280000, 'confirmed', 'paid'),
        (1, 3, DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_SUB(CURDATE(), INTERVAL 3 DAY), CURDATE(), 2, 50000, 'completed', 'paid'),
        (1, 4, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 DAY), DATE_ADD(CURDATE(), INTERVAL 1 DAY), 6, 90000, 'pending', 'pending')
      ON DUPLICATE KEY UPDATE id=id
    `);
    console.log('✅ 샘플 주문 4건 추가\n');

    // 샘플 리뷰 데이터
    console.log('⭐ 샘플 리뷰 추가...');
    await conn.execute(`
      INSERT INTO reviews (listing_id, user_id, rating, title, content, is_verified, status)
      VALUES
        (1, 1, 5, '정말 좋았어요!', '증도 슬로우걷기 투어 정말 힐링되는 시간이었습니다. 전문 해설사님 설명도 좋았고, 태평염전 풍경이 장관이었어요.', true, 'approved'),
        (1, 1, 4, '추천합니다', '가족과 함께 다녀왔는데 아이들도 재미있어했어요. 다만 여름에는 좀 덥습니다.', true, 'approved'),
        (2, 1, 5, '맛있어요', '천일염으로 만든 음식이라 건강한 맛이 나요. 특히 짱뚱어 구이가 일품!', true, 'approved'),
        (3, 1, 5, '꼭 가보세요', '태평염전 규모가 정말 크고 멋있어요. 무료 관람인데 볼거리가 많습니다.', true, 'approved'),
        (4, 1, 5, '체험 좋아요', '아이들과 천일염 만들기 체험했는데 정말 재미있었어요. 만든 소금도 가져갈 수 있어서 좋았습니다.', true, 'approved')
      ON DUPLICATE KEY UPDATE id=id
    `);
    console.log('✅ 샘플 리뷰 5건 추가\n');

    // 샘플 문의 데이터
    console.log('📞 샘플 문의 추가...');
    await conn.execute(`
      INSERT INTO contacts (name, email, phone, subject, message, status)
      VALUES
        ('김철수', 'test1@example.com', '010-1234-5678', '예약 문의', '증도 슬로우걷기 투어 예약하고 싶은데 가능한가요?', 'pending'),
        ('이영희', 'test2@example.com', '010-2345-6789', '환불 문의', '예약한 상품 환불 가능한가요?', 'pending'),
        ('박민수', 'test3@example.com', '010-3456-7890', '일정 변경', '예약 일정을 변경하고 싶습니다.', 'replied')
      ON DUPLICATE KEY UPDATE id=id
    `);
    console.log('✅ 샘플 문의 3건 추가\n');

    console.log('🎉 모든 테이블 생성 및 샘플 데이터 추가 완료!\n');
    console.log('이제 대시보드 통계가 정상적으로 표시됩니다.');

  } catch (error) {
    console.error('❌ 테이블 생성 실패:', error);
  }

  process.exit(0);
}

setupMissingTables();
