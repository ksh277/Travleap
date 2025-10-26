/**
 * 포인트 시스템
 * - 결제 시 2% 적립 (배송비 제외)
 * - 포인트 사용 및 만료 관리
 */

import { getDatabase } from './database.js';

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
  const db = getDatabase();

  try {
    // 1. 현재 포인트 조회
    const users = await db.query('SELECT total_points FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      throw new Error('User not found');
    }

    const currentPoints = users[0].total_points || 0;
    const newBalance = currentPoints + points;

    // 2. 포인트 내역 추가
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await db.execute(`
      INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, related_payment_id, balance_after, expires_at)
      VALUES (?, ?, 'earn', ?, ?, ?, ?, ?)
    `, [userId, points, reason, relatedOrderId, relatedPaymentId, newBalance, expiresAt]);

    // 3. 사용자 포인트 업데이트
    await db.execute('UPDATE users SET total_points = ? WHERE id = ?', [newBalance, userId]);

    console.log(`✅ [Points] User ${userId} earned ${points} points. New balance: ${newBalance}`);
    return true;

  } catch (error) {
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
  const db = getDatabase();

  try {
    // 1. 현재 포인트 조회
    const users = await db.query('SELECT total_points FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return { success: false, message: '사용자를 찾을 수 없습니다.' };
    }

    const currentPoints = users[0].total_points || 0;

    // 2. 잔액 확인
    if (currentPoints < points) {
      return { success: false, message: `보유 포인트가 부족합니다. (보유: ${currentPoints}P, 사용: ${points}P)` };
    }

    const newBalance = currentPoints - points;

    // 3. 포인트 내역 추가 (음수로 저장)
    await db.execute(`
      INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after)
      VALUES (?, ?, 'use', ?, ?, ?)
    `, [userId, -points, reason, relatedOrderId, newBalance]);

    // 4. 사용자 포인트 업데이트
    await db.execute('UPDATE users SET total_points = ? WHERE id = ?', [newBalance, userId]);

    console.log(`✅ [Points] User ${userId} used ${points} points. New balance: ${newBalance}`);
    return { success: true };

  } catch (error) {
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
 * 환불 시 포인트 차감
 *
 * @param userId - 사용자 ID
 * @param orderId - 주문 번호
 */
export async function refundPointsFromOrder(userId: number, orderId: string): Promise<boolean> {
  const db = getDatabase();

  try {
    // 1. 해당 주문으로 적립된 포인트 조회
    const earnedPoints = await db.query(`
      SELECT points, id FROM user_points
      WHERE user_id = ? AND related_order_id = ? AND point_type = 'earn' AND points > 0
    `, [userId, orderId]);

    if (earnedPoints.length === 0) {
      console.log(`ℹ️  [Points] No earned points found for order ${orderId}`);
      return true;
    }

    const pointsToRefund = earnedPoints[0].points;

    // 2. 현재 포인트 조회
    const users = await db.query('SELECT total_points FROM users WHERE id = ?', [userId]);
    const currentPoints = users[0].total_points || 0;

    // 3. 포인트가 부족하면 0으로 설정
    const newBalance = Math.max(0, currentPoints - pointsToRefund);

    // 4. 포인트 내역 추가 (차감)
    await db.execute(`
      INSERT INTO user_points (user_id, points, point_type, reason, related_order_id, balance_after)
      VALUES (?, ?, 'admin', ?, ?, ?)
    `, [userId, -pointsToRefund, `환불로 인한 포인트 차감 (주문번호: ${orderId})`, orderId, newBalance]);

    // 5. 사용자 포인트 업데이트
    await db.execute('UPDATE users SET total_points = ? WHERE id = ?', [newBalance, userId]);

    console.log(`✅ [Points] User ${userId} refunded ${pointsToRefund} points. New balance: ${newBalance}`);
    return true;

  } catch (error) {
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
  const db = getDatabase();

  try {
    const history = await db.query(`
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
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `, [userId, limit]);

    return history;

  } catch (error) {
    console.error('❌ [Points] Failed to get point history:', error);
    return [];
  }
}

/**
 * 만료된 포인트 처리 (크론 작업용)
 */
export async function expirePoints(): Promise<number> {
  const db = getDatabase();

  try {
    const now = new Date();

    // 1. 만료된 포인트 조회
    const expiredPoints = await db.query(`
      SELECT user_id, points, id
      FROM user_points
      WHERE point_type = 'earn' AND expires_at <= ? AND expires_at IS NOT NULL
    `, [now]);

    let expiredCount = 0;

    for (const point of expiredPoints) {
      // 2. 사용자 현재 포인트 조회
      const users = await db.query('SELECT total_points FROM users WHERE id = ?', [point.user_id]);
      const currentPoints = users[0].total_points || 0;
      const newBalance = Math.max(0, currentPoints - point.points);

      // 3. 만료 내역 추가
      await db.execute(`
        INSERT INTO user_points (user_id, points, point_type, reason, balance_after)
        VALUES (?, ?, 'expire', '포인트 만료', ?)
      `, [point.user_id, -point.points, newBalance]);

      // 4. 사용자 포인트 업데이트
      await db.execute('UPDATE users SET total_points = ? WHERE id = ?', [newBalance, point.user_id]);

      expiredCount++;
    }

    console.log(`✅ [Points] Expired ${expiredCount} point records`);
    return expiredCount;

  } catch (error) {
    console.error('❌ [Points] Failed to expire points:', error);
    return 0;
  }
}
