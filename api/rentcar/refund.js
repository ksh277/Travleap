const { connect } = require('@planetscale/database');
const jwt = require('jsonwebtoken');

/**
 * 렌트카 환불 API (벤더용)
 * POST /api/rentcar/refund
 * Body: { booking_number: string }
 *
 * 벤더가 예약을 환불 처리합니다.
 * 픽업 전후 상관없이 환불 가능 (벤더 권한으로 skipPolicy=true 사용)
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'POST 메서드만 지원합니다.' });
  }

  try {
    // 벤더 인증
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
    }

    const token = authHeader.substring(7);
    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    } catch (error) {
      return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
    }

    if (decoded.role !== 'vendor' && decoded.role !== 'admin') {
      return res.status(403).json({ success: false, message: '벤더 권한이 필요합니다.' });
    }

    // booking_number 검증
    const { booking_number } = req.body;

    if (!booking_number) {
      return res.status(400).json({ success: false, message: '예약 번호를 입력해주세요.' });
    }

    // DB 연결
    const connection = connect({ url: process.env.DATABASE_URL });

    // 벤더 ID 조회
    let vendorId;
    if (decoded.role === 'admin') {
      vendorId = req.body.vendorId;
    } else {
      const vendorResult = await connection.execute(
        'SELECT id FROM rentcar_vendors WHERE user_id = ? LIMIT 1',
        [decoded.userId]
      );

      if (!vendorResult.rows || vendorResult.rows.length === 0) {
        return res.status(403).json({ success: false, message: '등록된 벤더 정보가 없습니다.' });
      }

      vendorId = vendorResult.rows[0].id;
    }

    console.log('💰 [Rentcar Refund] 환불 요청:', {
      vendorId,
      bookingNumber: booking_number
    });

    // 예약 조회
    const bookingResult = await connection.execute(
      `SELECT id, booking_number, vendor_id, status, payment_status, payment_key, total_krw
       FROM rentcar_bookings
       WHERE booking_number = ?
       LIMIT 1`,
      [booking_number]
    );

    if (!bookingResult.rows || bookingResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: '예약을 찾을 수 없습니다.' });
    }

    const booking = bookingResult.rows[0];

    // 벤더 권한 확인
    if (decoded.role !== 'admin' && booking.vendor_id !== vendorId) {
      return res.status(403).json({ success: false, message: '해당 예약에 대한 권한이 없습니다.' });
    }

    // 상태 확인
    if (booking.status === 'cancelled') {
      return res.status(400).json({ success: false, message: '이미 취소된 예약입니다.' });
    }

    if (booking.status === 'completed') {
      return res.status(400).json({ success: false, message: '이미 완료된 예약입니다.' });
    }

    if (booking.payment_status === 'refunded') {
      return res.status(400).json({ success: false, message: '이미 환불된 예약입니다.' });
    }

    if (!booking.payment_key) {
      return res.status(400).json({ success: false, message: '결제 정보가 없습니다.' });
    }

    console.log('   📋 예약 정보:', {
      bookingId: booking.id,
      status: booking.status,
      paymentStatus: booking.payment_status,
      paymentKey: booking.payment_key
    });

    // /api/payments/refund 로직 직접 호출
    // payments/refund 모듈을 import하여 사용
    const refundModule = require('../payments/refund');

    // refundPayment 함수가 export되어 있으면 사용, 없으면 handler를 직접 호출
    let refundResult;

    if (typeof refundModule.refundPayment === 'function') {
      console.log('   🔄 Calling refundPayment function directly...');
      refundResult = await refundModule.refundPayment({
        paymentKey: booking.payment_key,
        cancelReason: '벤더 요청 환불',
        skipPolicy: true
      });
    } else {
      // refundPayment 함수가 없으면 handler를 mock request로 호출
      console.log('   🔄 Calling refund handler with mock request...');
      const mockReq = {
        method: 'POST',
        headers: { authorization: `Bearer ${token}` },
        body: {
          paymentKey: booking.payment_key,
          cancelReason: '벤더 요청 환불',
          skipPolicy: true
        }
      };

      let mockResData = null;
      let mockResStatus = 200;
      const mockRes = {
        setHeader: () => {},
        status: (code) => {
          mockResStatus = code;
          return mockRes;
        },
        json: (data) => {
          mockResData = data;
          return mockRes;
        },
        end: () => mockRes
      };

      await refundModule(mockReq, mockRes);
      refundResult = mockResData;

      if (mockResStatus !== 200) {
        return res.status(mockResStatus).json(refundResult);
      }
    }

    if (!refundResult || !refundResult.success) {
      console.error('❌ [Rentcar Refund] 환불 처리 실패:', refundResult);
      return res.status(400).json({
        success: false,
        message: refundResult?.message || '환불 처리에 실패했습니다.',
        error: refundResult?.error
      });
    }

    console.log('✅ [Rentcar Refund] 환불 완료:', {
      bookingNumber: booking_number,
      refundAmount: refundResult.data?.refund_amount
    });

    return res.status(200).json({
      success: true,
      message: '환불이 완료되었습니다.',
      data: {
        booking_number: booking_number,
        booking_id: booking.id,
        refund_amount: refundResult.data?.refund_amount || booking.total_krw,
        refunded_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [Rentcar Refund] 오류:', error);
    return res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.',
      error: error.message
    });
  }
};
