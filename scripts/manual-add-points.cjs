require('dotenv').config();
const { connect } = require('@planetscale/database');
const { Pool } = require('@neondatabase/serverless');

async function manualAddPoints() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log('사용법: node scripts/manual-add-points.cjs <user_id> <points> <reason>');
    console.log('예: node scripts/manual-add-points.cjs 11 420 "주문 ORDER_1761922261162_7787 적립 보상"');
    process.exit(1);
  }

  const userId = parseInt(args[0]);
  const pointsToAdd = parseInt(args[1]);
  const reason = args[2];

  if (isNaN(userId) || isNaN(pointsToAdd)) {
    console.error('❌ user_id와 points는 숫자여야 합니다.');
    process.exit(1);
  }

  const connection = connect({ url: process.env.DATABASE_URL });
  const poolNeon = new Pool({ connectionString: process.env.POSTGRES_DATABASE_URL });

  try {
    console.log(`💰 수동 포인트 적립 시작...`);
    console.log(`   사용자 ID: ${userId}`);
    console.log(`   적립 포인트: ${pointsToAdd}P`);
    console.log(`   사유: ${reason}\n`);

    // 1. 트랜잭션 시작
    await poolNeon.query('BEGIN');

    // 2. 사용자 정보 조회 (FOR UPDATE로 잠금)
    const userResult = await poolNeon.query(
      'SELECT id, name, email, total_points FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      throw new Error(`사용자를 찾을 수 없습니다: ${userId}`);
    }

    const user = userResult.rows[0];
    const currentPoints = user.total_points || 0;
    const newBalance = currentPoints + pointsToAdd;

    console.log(`👤 사용자 정보:`);
    console.log(`   이름: ${user.name}`);
    console.log(`   이메일: ${user.email}`);
    console.log(`   현재 포인트: ${currentPoints}P`);
    console.log(`   적립 후 포인트: ${newBalance}P\n`);

    // 3. user_points 테이블에 기록 추가 (PlanetScale)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365); // 1년 후 만료
    const expiresAtStr = expiresAt.toISOString().slice(0, 19).replace('T', ' ');

    const insertResult = await connection.execute(`
      INSERT INTO user_points (
        user_id,
        points,
        point_type,
        reason,
        related_order_id,
        balance_after,
        expires_at,
        created_at
      ) VALUES (?, ?, 'earn', ?, ?, ?, ?, NOW())
    `, [userId, pointsToAdd, reason, 'manual', newBalance, expiresAtStr]);

    console.log(`✅ user_points 기록 추가 완료 (ID: ${insertResult.insertId})`);

    // 4. users 테이블 업데이트 (Neon)
    await poolNeon.query(
      'UPDATE users SET total_points = $1 WHERE id = $2',
      [newBalance, userId]
    );

    console.log(`✅ users 테이블 업데이트 완료`);

    // 5. 커밋
    await poolNeon.query('COMMIT');

    console.log(`\n🎉 포인트 적립 완료!`);
    console.log(`   ${user.email}님께 ${pointsToAdd}P가 적립되었습니다.`);
    console.log(`   최종 잔액: ${newBalance}P\n`);

  } catch (error) {
    console.error('❌ 오류 발생:', error.message);
    try {
      await poolNeon.query('ROLLBACK');
      console.log('⚠️  트랜잭션 롤백됨');
    } catch (rollbackError) {
      console.error('❌ 롤백 실패:', rollbackError);
    }
    process.exit(1);
  } finally {
    await poolNeon.end();
  }
}

manualAddPoints();
