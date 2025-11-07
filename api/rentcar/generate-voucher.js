/**
 * 렌트카 바우처 생성 API
 *
 * 기능:
 * - 6자리 영숫자 바우처 코드 생성
 * - QR 코드 생성 (Base64)
 * - 결제 완료 시 자동 호출
 *
 * 라우트: POST /api/rentcar/bookings/:id/generate-voucher
 * 권한: 결제 완료 후 시스템 또는 사용자
 */

const { db } = require('../../utils/database.cjs');
const QRCode = require('qrcode');
const crypto = require('crypto');

/**
 * 바우처 코드 생성 (6자리 영숫자)
 */
function generateVoucherCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 혼동 방지: I,O,0,1 제외
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * 고유한 바우처 코드 생성 (중복 체크)
 */
async function generateUniqueVoucherCode() {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = generateVoucherCode();

    // 중복 체크
    const existing = await db.query(`
      SELECT id FROM rentcar_bookings WHERE voucher_code = ? LIMIT 1
    `, [code]);

    if (existing.length === 0) {
      return code;
    }

    attempts++;
  }

  throw new Error('Failed to generate unique voucher code after 10 attempts');
}

module.exports = async function handler(req, res) {
  try {
    // 1. POST 메서드만 허용
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

    // 2. 예약 ID 추출
    const bookingId = req.query.id || req.params.id;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID is required'
      });
    }

    console.log(`🎫 [Voucher] Generating for booking ID: ${bookingId}`);

    // 3. 예약 정보 조회
    const bookings = await db.query(`
      SELECT
        id,
        booking_number,
        voucher_code,
        status,
        payment_status,
        customer_name,
        customer_email,
        customer_phone,
        pickup_date,
        pickup_time
      FROM rentcar_bookings
      WHERE id = ?
      LIMIT 1
    `, [bookingId]);

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    const booking = bookings[0];

    // 4. 상태 확인 (confirmed 상태만 바우처 생성 가능)
    if (booking.payment_status !== 'paid') {
      return res.status(400).json({
        success: false,
        error: 'Payment must be completed to generate voucher',
        payment_status: booking.payment_status
      });
    }

    // 5. 이미 바우처가 있으면 재생성하지 않음
    if (booking.voucher_code) {
      console.log(`⚠️  [Voucher] Already exists for booking ${bookingId}`);

      // 기존 QR 코드 반환
      return res.status(200).json({
        success: true,
        data: {
          booking_id: booking.id,
          booking_number: booking.booking_number,
          voucher_code: booking.voucher_code,
          qr_code: booking.qr_code || null,
          message: 'Voucher already exists'
        }
      });
    }

    // 6. 바우처 코드 생성
    const voucherCode = await generateUniqueVoucherCode();

    // 7. QR 코드 데이터 구성
    const qrData = {
      type: 'rentcar_booking',
      booking_id: booking.id,
      booking_number: booking.booking_number,
      voucher_code: voucherCode,
      customer_name: booking.customer_name,
      pickup_date: booking.pickup_date,
      pickup_time: booking.pickup_time,
      issued_at: new Date().toISOString()
    };

    // 8. QR 코드 생성 (Base64)
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300
    });

    // 9. DB 업데이트
    await db.execute(`
      UPDATE rentcar_bookings
      SET
        voucher_code = ?,
        qr_code = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [voucherCode, qrCodeDataUrl, bookingId]);

    console.log(`✅ [Voucher] Generated: ${voucherCode} for booking ${booking.booking_number}`);

    // 10. 성공 응답
    return res.status(200).json({
      success: true,
      data: {
        booking_id: booking.id,
        booking_number: booking.booking_number,
        voucher_code: voucherCode,
        qr_code: qrCodeDataUrl,
        message: 'Voucher generated successfully'
      }
    });

  } catch (error) {
    console.error('❌ [Voucher] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
