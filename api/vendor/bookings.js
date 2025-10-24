const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

module.exports = async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 벤더 인증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '인증 토큰이 필요합니다.'
      });
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: '유효하지 않은 토큰입니다.'
      });
    }

    if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '벤더 권한이 필요합니다.'
      });
    }

    // DB 연결
    const connection = connect({ url: process.env.DATABASE_URL });

    // 벤더 ID 조회
    let vendorId;
    if (decoded.role === 'admin') {
      vendorId = req.query.vendorId || req.body?.vendorId;
    } else {
      const vendorResult = await connection.execute(
        'SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
        [decoded.userId]
      );

      if (!vendorResult.rows || vendorResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: '등록된 벤더 정보가 없습니다.'
        });
      }

      vendorId = vendorResult.rows[0].id;
    }

    // GET: 예약 목록 조회
    if (req.method === 'GET') {
      const result = await connection.execute(
        `SELECT
          b.id,
          b.booking_number,
          b.vendor_id,
          b.vehicle_id,
          b.user_id,
          b.pickup_date,
          b.pickup_time,
          b.dropoff_date,
          b.dropoff_time,
          b.total_krw as total_amount,
          b.customer_name,
          b.customer_phone,
          b.customer_email,
          b.status,
          b.payment_status,
          b.created_at,
          v.display_name as vehicle_name
        FROM rentcar_bookings b
        LEFT JOIN rentcar_vehicles v ON b.vehicle_id = v.id
        WHERE b.vendor_id = ?
          AND b.payment_status = 'paid'
        ORDER BY b.created_at DESC`,
        [vendorId]
      );

      return res.status(200).json({
        success: true,
        data: result.rows || []
      });
    }

    // DELETE: 예약 삭제
    if (req.method === 'DELETE') {
      const bookingId = req.query.id || req.url.split('/').pop();

      // 예약이 해당 벤더의 것인지 확인
      const checkResult = await connection.execute(
        'SELECT id, vendor_id, status FROM rentcar_bookings WHERE id = ?',
        [bookingId]
      );

      if (!checkResult.rows || checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '예약을 찾을 수 없습니다.'
        });
      }

      if (decoded.role !== 'admin' && checkResult.rows[0].vendor_id !== vendorId) {
        return res.status(403).json({
          success: false,
          message: '해당 예약에 대한 권한이 없습니다.'
        });
      }

      // 예약 삭제 (실제로는 status를 deleted로 변경)
      await connection.execute(
        'UPDATE rentcar_bookings SET status = ?, updated_at = NOW() WHERE id = ?',
        ['deleted', bookingId]
      );

      return res.status(200).json({
        success: true,
        message: '예약이 삭제되었습니다.'
      });
    }

    // POST: 환불 처리 (?action=refund)
    if (req.method === 'POST' && req.query.action === 'refund') {
      const bookingId = req.query.id;
      const { refund_amount, refund_reason } = req.body;

      // 예약이 해당 벤더의 것인지 확인
      const checkResult = await connection.execute(
        'SELECT id, vendor_id, status, payment_status, total_krw FROM rentcar_bookings WHERE id = ?',
        [bookingId]
      );

      if (!checkResult.rows || checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: '예약을 찾을 수 없습니다.'
        });
      }

      const booking = checkResult.rows[0];

      if (decoded.role !== 'admin' && booking.vendor_id !== vendorId) {
        return res.status(403).json({
          success: false,
          message: '해당 예약에 대한 권한이 없습니다.'
        });
      }

      if (booking.payment_status !== 'paid') {
        return res.status(400).json({
          success: false,
          message: '결제가 완료된 예약만 환불할 수 있습니다.'
        });
      }

      // 1. rentcar_payments에서 paymentKey와 실제 결제 금액 조회
      let paymentKey = null;
      let actualPaidAmount = null;
      try {
        const paymentResult = await connection.execute(
          'SELECT payment_key, amount FROM rentcar_payments WHERE booking_id = ? LIMIT 1',
          [bookingId]
        );

        if (paymentResult.rows && paymentResult.rows.length > 0) {
          paymentKey = paymentResult.rows[0].payment_key;
          actualPaidAmount = paymentResult.rows[0].amount;
          console.log('💰 실제 결제 금액:', actualPaidAmount);
        }
      } catch (e) {
        console.warn('⚠️ rentcar_payments 테이블 조회 실패 (테이블 없을 수 있음):', e.message);
      }

      // 환불 금액 결정: 사용자 입력 > 실제 결제 금액 > 예약 금액
      const finalRefundAmount = refund_amount || actualPaidAmount || booking.total_krw;

      console.log('💳 환불 금액 결정:', {
        requested: refund_amount,
        actualPaid: actualPaidAmount,
        bookingTotal: booking.total_krw,
        final: finalRefundAmount
      });

      // 2. Toss Payments API로 환불 처리 (paymentKey가 있을 때만)
      if (paymentKey && process.env.TOSS_SECRET_KEY) {
        try {
          console.log('💳 [Toss Payments] 환불 요청:', paymentKey);

          const tossResponse = await fetch(`https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${Buffer.from(process.env.TOSS_SECRET_KEY + ':').toString('base64')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              cancelReason: refund_reason || '벤더 요청 환불',
              cancelAmount: finalRefundAmount  // 실제 결제 금액 사용
            })
          });

          if (!tossResponse.ok) {
            const errorData = await tossResponse.json();
            console.error('❌ [Toss Payments] 환불 실패:', errorData);

            return res.status(400).json({
              success: false,
              message: `PG사 환불 처리 실패: ${errorData.message || '알 수 없는 오류'}`,
              error: errorData
            });
          }

          const tossResult = await tossResponse.json();
          console.log('✅ [Toss Payments] 환불 성공:', tossResult);

        } catch (tossError) {
          console.error('❌ [Toss Payments] 환불 API 호출 오류:', tossError);

          return res.status(500).json({
            success: false,
            message: 'PG사 환불 처리 중 오류가 발생했습니다.',
            error: tossError.message
          });
        }
      } else {
        console.warn('⚠️ paymentKey 또는 TOSS_SECRET_KEY 없음 - DB만 업데이트');
      }

      // 3. DB에 환불 정보 저장 (실제 결제 금액으로)
      await connection.execute(
        `UPDATE rentcar_bookings
         SET status = 'cancelled',
             payment_status = 'refunded',
             refund_amount_krw = ?,
             refund_reason = ?,
             refunded_at = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [finalRefundAmount, refund_reason || '벤더 요청', bookingId]
      );

      console.log('✅ 환불 완료:', {
        bookingId,
        refundAmount: finalRefundAmount,
        pgProcessed: !!paymentKey
      });

      return res.status(200).json({
        success: true,
        message: paymentKey ? '환불 처리가 완료되었습니다.' : '환불 처리가 완료되었습니다. (PG사 연동 없이 DB만 업데이트됨)',
        data: {
          booking_id: bookingId,
          refund_amount: finalRefundAmount,
          actual_paid_amount: actualPaidAmount,
          pg_refund_processed: !!paymentKey
        }
      });
    }

    return res.status(405).json({
      success: false,
      message: '지원하지 않는 메서드입니다.'
    });

  } catch (error) {
    console.error('❌ [Bookings API] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};
