require('dotenv').config();
const { connect } = require('@planetscale/database');

console.log('🔧 admin_audit_logs 테이블 생성\n');

(async () => {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    // admin_audit_logs 테이블 생성
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        admin_id INT NOT NULL COMMENT '관리자 user_id',
        action VARCHAR(50) NOT NULL COMMENT '수행한 작업 (refund, update, delete 등)',
        target_type VARCHAR(50) NOT NULL COMMENT '대상 타입 (payment, booking, order, user 등)',
        target_id INT NULL COMMENT '대상 ID',
        details JSON NULL COMMENT '상세 정보 (환불금액, 사유 등)',
        ip_address VARCHAR(45) NULL COMMENT 'IP 주소',
        user_agent TEXT NULL COMMENT 'User Agent',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_admin_id (admin_id),
        INDEX idx_action (action),
        INDEX idx_target (target_type, target_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='관리자 작업 감사 로그'
    `);

    console.log('✅ admin_audit_logs 테이블 생성 완료\n');

    // 테이블 구조 확인
    const result = await connection.execute('DESCRIBE admin_audit_logs');
    console.log('📋 테이블 구조:');
    result.rows.forEach(row => {
      console.log(`   ${row.Field}: ${row.Type} ${row.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ 완료!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📝 용도:');
    console.log('- 관리자가 수행한 모든 중요 작업을 기록');
    console.log('- 환불, 주문 수정, 사용자 정보 변경 등');
    console.log('- 보안 감사 및 문제 추적에 사용');

  } catch (error) {
    console.error('❌ 오류:', error.message);
    console.error(error);
  }
})();
