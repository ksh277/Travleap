/**
 * 실패한 결제 데이터 클린업 API (관리자 전용)
 * POST /api/admin/cleanup-failed-payments
 *
 * 결제 성공(paid, completed)이 아닌 오래된 pending 상태 결제를 삭제합니다.
 */

const { connect } = require('@planetscale/database');
const { withAuth } = require('../../utils/auth-middleware');
const { withSecureCors } = require('../../utils/cors-middleware');

async function handler(req, res) {
  // 관리자 권한 확인
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: '관리자 권한이 필요합니다.'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const { user_email } = req.body;

    if (!user_email) {
      return res.status(400).json({
        success: false,
        error: 'user_email is required'
      });
    }

    console.log('🧹 [Cleanup] 실패한 결제 데이터 삭제 요청:', user_email);

    // 1. 사용자 ID 조회 (Neon PostgreSQL)
    const { Pool } = require('@neondatabase/serverless');
    const poolNeon = new Pool({
      connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
    });

    let userId;
    try {
      const userResult = await poolNeon.query(
        'SELECT id FROM users WHERE email = $1',
        [user_email]
      );

      if (!userResult.rows || userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: '사용자를 찾을 수 없습니다.'
        });
      }

      userId = userResult.rows[0].id;
      console.log(`👤 [Cleanup] 사용자 ID: ${userId}`);
    } finally {
      await poolNeon.end();
    }

    // 2. 삭제할 결제 내역 조회 (pending 상태만)
    const pendingPayments = await connection.execute(`
      SELECT id, order_number, booking_id, amount, created_at
      FROM payments
      WHERE user_id = ?
        AND payment_status = 'pending'
      ORDER BY created_at DESC
    `, [userId]);

    const deleteCount = pendingPayments.rows?.length || 0;

    if (deleteCount === 0) {
      return res.status(200).json({
        success: true,
        message: '삭제할 실패한 결제가 없습니다.',
        deleted_count: 0
      });
    }

    console.log(`📋 [Cleanup] 삭제 대상: ${deleteCount}건`);

    // 3. 관련 bookings 삭제 (있는 경우)
    for (const payment of pendingPayments.rows) {
      if (payment.order_number) {
        // 장바구니 주문인 경우
        await connection.execute(`
          DELETE FROM bookings
          WHERE order_number = ?
        `, [payment.order_number]);
        console.log(`🗑️  [Cleanup] bookings 삭제 완료: order_number=${payment.order_number}`);
      } else if (payment.booking_id) {
        // 단일 예약인 경우
        await connection.execute(`
          DELETE FROM bookings
          WHERE id = ?
        `, [payment.booking_id]);
        console.log(`🗑️  [Cleanup] booking 삭제 완료: booking_id=${payment.booking_id}`);
      }
    }

    // 4. payments 삭제
    const deleteResult = await connection.execute(`
      DELETE FROM payments
      WHERE user_id = ?
        AND payment_status = 'pending'
    `, [userId]);

    console.log(`✅ [Cleanup] 삭제 완료: ${deleteCount}건`);

    return res.status(200).json({
      success: true,
      message: `${deleteCount}건의 실패한 결제가 삭제되었습니다.`,
      deleted_count: deleteCount,
      deleted_payments: pendingPayments.rows?.map(p => ({
        id: p.id,
        order_number: p.order_number,
        amount: p.amount,
        created_at: p.created_at
      }))
    });

  } catch (error) {
    console.error('❌ [Cleanup] 클린업 실패:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '클린업 중 오류가 발생했습니다.'
    });
  }
}

// JWT 인증 및 보안 CORS 적용
module.exports = withSecureCors(withAuth(handler, { requireAuth: true, requireAdmin: true }));
