const { connect } = require('@planetscale/database');
require('dotenv').config();

(async () => {
  const db = connect({ url: process.env.DATABASE_URL });

  console.log('📢 admin_notifications 테이블 생성 중...\n');

  try {
    // admin_notifications 테이블 생성
    await db.execute(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(100) NOT NULL,
        priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
        title VARCHAR(255) NOT NULL,
        message TEXT,
        metadata JSON,
        is_read BOOLEAN DEFAULT false,
        read_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_type (type),
        INDEX idx_priority (priority),
        INDEX idx_is_read (is_read),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ admin_notifications 테이블 생성 완료!');

    console.log('\n📋 테이블 구조:');
    console.log('  • id: 알림 고유 ID');
    console.log('  • type: 알림 타입 (REFUND_POINT_DEDUCTION_FAILED 등)');
    console.log('  • priority: 우선순위 (LOW/MEDIUM/HIGH/CRITICAL)');
    console.log('  • title: 알림 제목');
    console.log('  • message: 알림 메시지');
    console.log('  • metadata: 추가 정보 (JSON)');
    console.log('  • is_read: 읽음 여부');
    console.log('  • read_at: 읽은 시간');
    console.log('  • created_at: 생성 시간');

    console.log('\n✅ 설정 완료! 이제 포인트 회수 실패 시 관리자에게 자동 알림됩니다.');

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('⚠️  admin_notifications 테이블이 이미 존재합니다.');
    } else {
      console.error('❌ Error:', error.message);
      console.error(error.stack);
    }
  }

  process.exit(0);
})();
