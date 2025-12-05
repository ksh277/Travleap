/**
 * 포인트 시스템 (Neon PostgreSQL 단일화)
 * - 결제 시 2% 적립 (배송비 제외)
 * - 포인트 사용 및 만료 관리
 *
 * 마이그레이션: 2024-12 PlanetScale → Neon PostgreSQL
 */

import { getNeonPool } from './neon-database.js';

/**
 * 포인트 적립
 *
 * @param userId - 사용자 ID
 * @param points - 적립할 포인트
 * @param reason - 적립 사유
 * @param relatedOrderId - 관련 주문 번호
 * @param relatedPaymentId - 관련 결제 ID
 * @param expiresInDays - 만료 일수 (기본 365일)
 */
export async function earnPoints(
  userId: number,
  points: number,
  reason: string,
  relatedOrderId?: string,
  relatedPaymentId?: number,
  expiresInDays: number = 365
): Promise<boolean> {
  const pool = getNeonPool();

  try {
    // 트랜잭션 시작
    await pool.query('BEGIN');

    // 1. 현재 포인트 조회 (FOR UPDATE로 락)
    const userResult = await pool.query(
      'SELECT total_points FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (userResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      throw new Error('User not found');
    }

    const currentPoints = userResult.rows[0].total_points || 0;
    const newBalance = currentPoints + points;

    // 2. 만료일 계산
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // 3. 포인트 내역 추가
    await pool.query(`
      INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, related_payment_id, balance_after, expires_at, created_at)
      VALUES ($1, $2, 'earn', $3, $4, $5, $6, $7, NOW())
    `, [userId, points, reason, relatedOrderId || null, relatedPaymentId || null, newBalance, expiresAt]);

    // 4. 사용자 포인트 업데이트
    await pool.query('UPDATE users SET total_points = $1 WHERE id = $2', [newBalance, userId]);

    // 트랜잭션 커밋
    await pool.query('COMMIT');

    console.log(`✅ [Points] User ${userId} earned ${points} points. New balance: ${newBalance}`);
    return true;

  } catch (error) {
    try {
      await pool.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('❌ [Points] Rollback failed:', rollbackError);
    }
    console.error('❌ [Points] Failed to earn points:', error);
    return false;
  }
}

/**
 * 포인트 사용
 *
 * @param userId - 사용자 ID
 * @param points - 사용할 포인트
 * @param reason - 사용 사유
 * @param relatedOrderId - 관련 주문 번호
 */
export async function usePoints(
  userId: number,
  points: number,
  reason: string,
  relatedOrderId?: string
): Promise<{ success: boolean; message?: string }> {
  const pool = getNeonPool();

  try {
    // 트랜잭션 시작 및 FOR UPDATE 락
    await pool.query('BEGIN');

    // 1. 현재 포인트 조회 (FOR UPDATE로 동시성 제어)
    const userResult = await pool.query(
      'SELECT total_points FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (userResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return { success: false, message: '사용자를 찾을 수 없습니다.' };
    }

    const currentPoints = userResult.rows[0].total_points || 0;

    // 2. 잔액 확인
    if (currentPoints < points) {
      await pool.query('ROLLBACK');
      console.warn(`⚠️ [Points] User ${userId} 포인트 부족: 보유 ${currentPoints}P, 사용 시도 ${points}P`);
      return { success: false, message: `보유 포인트가 부족합니다. (보유: ${currentPoints}P, 사용: ${points}P)` };
    }

    const newBalance = currentPoints - points;

    // 3. 포인트 내역 추가 (음수로 저장)
    await pool.query(`
      INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after, created_at)
      VALUES ($1, $2, 'use', $3, $4, $5, NOW())
    `, [userId, -points, reason, relatedOrderId || null, newBalance]);

    // 4. 사용자 포인트 업데이트
    await pool.query('UPDATE users SET total_points = $1 WHERE id = $2', [newBalance, userId]);

    // 트랜잭션 커밋
    await pool.query('COMMIT');

    console.log(`✅ [Points] User ${userId} used ${points} points. New balance: ${newBalance}`);
    return { success: true };

  } catch (error) {
    try {
      await pool.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('❌ [Points] Rollback failed:', rollbackError);
    }
    console.error('❌ [Points] Failed to use points:', error);
    return { success: false, message: '포인트 사용 중 오류가 발생했습니다.' };
  }
}

/**
 * 결제 완료 시 포인트 자동 적립
 *
 * @param userId - 사용자 ID
 * @param totalAmount - 총 결제 금액
 * @param shippingFee - 배송비
 * @param orderId - 주문 번호
 * @param paymentId - 결제 ID
 * @returns 적립된 포인트
 */
export async function earnPointsFromPayment(
  userId: number,
  totalAmount: number,
  shippingFee: number,
  orderId: string,
  paymentId: number
): Promise<number> {
  // 배송비를 제외한 금액의 2% 적립
  const productAmount = totalAmount - shippingFee;
  const pointsToEarn = Math.floor(productAmount * 0.02);

  if (pointsToEarn > 0) {
    await earnPoints(
      userId,
      pointsToEarn,
      `주문 적립 (주문번호: ${orderId})`,
      orderId,
      paymentId,
      365 // 1년 후 만료
    );
  }

  return pointsToEarn;
}

/**
 * 사용된 포인트 환불 (결제 실패/취소 시)
 *
 * @param userId - 사용자 ID
 * @param points - 환불할 포인트
 * @param reason - 환불 사유
 * @param relatedOrderId - 관련 주문 번호
 */
export async function refundPoints(
  userId: number,
  points: number,
  reason: string,
  relatedOrderId?: string
): Promise<{ success: boolean; message?: string }> {
  const pool = getNeonPool();

  try {
    // 트랜잭션 시작
    await pool.query('BEGIN');

    // 1. 현재 포인트 조회 (FOR UPDATE로 락)
    const userResult = await pool.query(
      'SELECT total_points FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );

    if (userResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return { success: false, message: '사용자를 찾을 수 없습니다.' };
    }

    const currentPoints = userResult.rows[0].total_points || 0;
    const newBalance = currentPoints + points;

    // 2. 포인트 내역 추가 (환불로 다시 적립)
    await pool.query(`
      INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after, created_at)
      VALUES ($1, $2, 'refund', $3, $4, $5, NOW())
    `, [userId, points, reason, relatedOrderId || null, newBalance]);

    // 3. 사용자 포인트 업데이트
    await pool.query('UPDATE users SET total_points = $1 WHERE id = $2', [newBalance, userId]);

    // 트랜잭션 커밋
    await pool.query('COMMIT');

    console.log(`✅ [Points] User ${userId} refunded ${points} points. New balance: ${newBalance}`);
    return { success: true };

  } catch (error) {
    try {
      await pool.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('❌ [Points] Rollback failed:', rollbackError);
    }
    console.error('❌ [Points] Failed to refund points:', error);
    return { success: false, message: '포인트 환불 중 오류가 발생했습니다.' };
  }
}

/**
 * 환불 시 포인트 차감 (적립된 포인트 회수)
 *
 * @param userId - 사용자 ID
 * @param orderId - 주문 번호
 */
export async function refundPointsFromOrder(userId: number, orderId: string): Promise<boolean> {
  const pool = getNeonPool();

  try {
    // 트랜잭션 시작
    await pool.query('BEGIN');

    // 1. 해당 주문으로 적립된 포인트 조회
    const earnedResult = await pool.query(`
      SELECT points, id FROM user_points
      WHERE user_id = $1 AND related_order_id = $2 AND point_type = 'earn' AND points > 0
    `, [userId, orderId]);

    if (earnedResult.rows.length === 0) {
      await pool.query('COMMIT'); // 적립 내역 없음 - 정상 종료
      console.log(`ℹ️  [Points] No earned points found for order ${orderId}`);
      return true;
    }

    const pointsToRefund = earnedResult.rows[0].points;

    // 2. 현재 포인트 조회 (FOR UPDATE로 락)
    const userResult = await pool.query(
      'SELECT total_points FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    const currentPoints = userResult.rows[0].total_points || 0;

    // 3. 포인트가 부족하면 0으로 설정
    const newBalance = Math.max(0, currentPoints - pointsToRefund);

    // 4. 포인트 내역 추가 (차감)
    await pool.query(`
      INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after, created_at)
      VALUES ($1, $2, 'admin', $3, $4, $5, NOW())
    `, [userId, -pointsToRefund, `환불로 인한 포인트 차감 (주문번호: ${orderId})`, orderId, newBalance]);

    // 5. 사용자 포인트 업데이트
    await pool.query('UPDATE users SET total_points = $1 WHERE id = $2', [newBalance, userId]);

    // 트랜잭션 커밋
    await pool.query('COMMIT');

    console.log(`✅ [Points] User ${userId} deducted ${pointsToRefund} points. New balance: ${newBalance}`);
    return true;

  } catch (error) {
    try {
      await pool.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('❌ [Points] Rollback failed:', rollbackError);
    }
    console.error('❌ [Points] Failed to refund points:', error);
    return false;
  }
}

/**
 * 포인트 내역 조회
 *
 * @param userId - 사용자 ID
 * @param limit - 조회 개수
 */
export async function getPointHistory(userId: number, limit: number = 50): Promise<any[]> {
  const pool = getNeonPool();

  try {
    const result = await pool.query(`
      SELECT
        id,
        points,
        point_type,
        reason,
        related_order_id,
        balance_after,
        expires_at,
        created_at
      FROM user_points
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);

    return result.rows;

  } catch (error) {
    console.error('❌ [Points] Failed to get point history:', error);
    return [];
  }
}

/**
 * 만료된 포인트 처리 (크론 작업용)
 */
export async function expirePoints(): Promise<number> {
  const pool = getNeonPool();

  try {
    const now = new Date();

    // 1. 만료된 포인트 조회 (이미 만료 처리된 것 제외)
    // PostgreSQL에서는 CONCAT 대신 || 연산자 사용
    const expiredResult = await pool.query(`
      SELECT up1.user_id, up1.points, up1.id
      FROM user_points up1
      WHERE up1.point_type = 'earn'
        AND up1.expires_at <= $1
        AND up1.expires_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM user_points up2
          WHERE up2.point_type = 'expire'
          AND up2.reason = '포인트 만료 (ID: ' || up1.id::text || ')'
        )
    `, [now]);

    let expiredCount = 0;

    for (const point of expiredResult.rows) {
      // 트랜잭션 시작
      await pool.query('BEGIN');

      try {
        // 2. 사용자 현재 포인트 조회 (FOR UPDATE로 락)
        const userResult = await pool.query(
          'SELECT total_points FROM users WHERE id = $1 FOR UPDATE',
          [point.user_id]
        );
        const currentPoints = userResult.rows[0].total_points || 0;
        const newBalance = Math.max(0, currentPoints - point.points);

        // 3. 만료 내역 추가 (ID 포함하여 중복 방지)
        await pool.query(`
          INSERT INTO user_points (user_id, points, point_type, reason, balance_after, created_at)
          VALUES ($1, $2, 'expire', $3, $4, NOW())
        `, [point.user_id, -point.points, `포인트 만료 (ID: ${point.id})`, newBalance]);

        // 4. 사용자 포인트 업데이트
        await pool.query('UPDATE users SET total_points = $1 WHERE id = $2', [newBalance, point.user_id]);

        // 트랜잭션 커밋
        await pool.query('COMMIT');
        expiredCount++;
      } catch (err) {
        await pool.query('ROLLBACK');
        console.error(`❌ [Points] Failed to expire point ID ${point.id}:`, err);
      }
    }

    console.log(`✅ [Points] Expired ${expiredCount} point records`);
    return expiredCount;

  } catch (error) {
    console.error('❌ [Points] Failed to expire points:', error);
    return 0;
  }
}

/**
 * 사용자의 현재 포인트 잔액 조회
 *
 * @param userId - 사용자 ID
 */
export async function getPointBalance(userId: number): Promise<number> {
  const pool = getNeonPool();

  try {
    const result = await pool.query(
      'SELECT total_points FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return 0;
    }

    return result.rows[0].total_points || 0;

  } catch (error) {
    console.error('❌ [Points] Failed to get point balance:', error);
    return 0;
  }
}
