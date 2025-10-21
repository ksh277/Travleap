// 샘플 문의 데이터 추가
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

async function addSampleContacts() {
  console.log('📞 샘플 문의 데이터 추가 시작...\n');

  try {
    const conn = connect(config);

    // 샘플 문의 추가
    await conn.execute(`
      INSERT INTO contacts (name, email, message, status, created_at)
      VALUES
        ('김철수', 'kim@example.com', '증도 슬로우걷기 투어 예약하고 싶은데 가능한가요?', 'pending', NOW()),
        ('이영희', 'lee@example.com', '예약한 상품 환불 가능한가요?', 'pending', NOW()),
        ('박민수', 'park@example.com', '예약 일정을 변경하고 싶습니다.', 'pending', NOW()),
        ('최지연', 'choi@example.com', '체험 프로그램 소요시간이 어떻게 되나요?', 'pending', NOW()),
        ('정우성', 'jung@example.com', '파트너 신청 절차가 궁금합니다.', 'replied', DATE_SUB(NOW(), INTERVAL 2 DAY))
    `);

    console.log('✅ 샘플 문의 5건 추가 완료\n');

    // 확인
    const result = await conn.execute('SELECT COUNT(*) as count FROM contacts WHERE status = "pending"');
    const pendingCount = result.rows[0]?.count || 0;

    console.log(`📊 대기 중인 문의: ${pendingCount}건`);

  } catch (error) {
    console.error('❌ 문의 추가 실패:', error);
  }

  process.exit(0);
}

addSampleContacts();
