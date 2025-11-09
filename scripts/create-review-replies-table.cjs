/**
 * review_replies 테이블 생성 스크립트
 * 관리자가 리뷰에 답변을 달 수 있는 테이블
 */

const { connect } = require('@planetscale/database');
require('dotenv').config();

async function createReviewRepliesTable() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('🔧 review_replies 테이블 생성 시작...\n');

    // 1. 테이블 존재 여부 확인
    const checkResult = await connection.execute(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
      AND table_name = 'review_replies'
    `);

    if (checkResult.rows && checkResult.rows[0].count > 0) {
      console.log('ℹ️  review_replies 테이블이 이미 존재합니다.');

      // 기존 데이터 확인
      const dataResult = await connection.execute('SELECT COUNT(*) as count FROM review_replies');
      console.log(`📊 현재 ${dataResult.rows[0].count}개의 답변이 있습니다.\n`);
      return;
    }

    // 2. 테이블 생성
    await connection.execute(`
      CREATE TABLE review_replies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        review_id INT NOT NULL,
        reply_text TEXT NOT NULL,
        admin_name VARCHAR(100) DEFAULT '관리자',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_review_id (review_id),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✅ review_replies 테이블 생성 완료!\n');

    // 3. 테이블 구조 확인
    const descResult = await connection.execute('DESCRIBE review_replies');
    console.log('📋 테이블 구조:');
    console.table(descResult.rows);

    console.log('\n✨ 설정 완료! 이제 관리자 페이지에서 리뷰에 답변을 달 수 있습니다.');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

createReviewRepliesTable()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('스크립트 실패:', error);
    process.exit(1);
  });
