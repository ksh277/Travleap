/**
 * point_history 테이블 생성 스크립트 (Neon PostgreSQL)
 * 포인트 변경 이력 추적용
 */

const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function createPointHistoryTable() {
  const sql = neon(process.env.NEON_DATABASE_URL || process.env.POSTGRES_DATABASE_URL);

  try {
    console.log('🔧 point_history 테이블 생성 시작...\n');

    // 1. 테이블 존재 여부 확인
    const checkResult = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'point_history'
      ) as exists
    `;

    if (checkResult[0].exists) {
      console.log('ℹ️  point_history 테이블이 이미 존재합니다.');

      // 기존 데이터 확인
      const dataResult = await sql`SELECT COUNT(*) as count FROM point_history`;
      console.log(`📊 현재 ${dataResult[0].count}개의 포인트 이력이 있습니다.\n`);
      return;
    }

    // 2. 테이블 생성
    await sql`
      CREATE TABLE point_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        points_change INTEGER NOT NULL,
        points_before INTEGER NOT NULL,
        points_after INTEGER NOT NULL,
        reason TEXT,
        change_type VARCHAR(50) DEFAULT 'manual_adjustment',
        admin_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('✅ point_history 테이블 생성 완료!');

    // 3. 인덱스 생성
    await sql`CREATE INDEX idx_point_history_user_id ON point_history(user_id)`;
    await sql`CREATE INDEX idx_point_history_created_at ON point_history(created_at)`;

    console.log('✅ 인덱스 생성 완료!\n');

    // 4. 테이블 구조 확인
    const descResult = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'point_history'
      ORDER BY ordinal_position
    `;

    console.log('📋 테이블 구조:');
    console.table(descResult);

    console.log('\n✨ 설정 완료! 이제 포인트 조정 이력이 자동으로 기록됩니다.');

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    throw error;
  }
}

createPointHistoryTable()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('스크립트 실패:', error);
    process.exit(1);
  });
