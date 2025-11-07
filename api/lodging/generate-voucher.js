/**
 * 숙박 바우처 생성 API
 *
 * 기능:
 * - 결제 완료 후 6자리 바우처 코드 생성
 * - QR 코드 생성 (Base64)
 * - 중복 생성 방지 (멱등성 보장)
 *
 * 라우트: POST /api/lodging/bookings/:id/generate-voucher
 * 권한: 결제 완료된 예약의 소유자, 관리자
 */

const { db } = require('../../utils/database.cjs');
const { JWTUtils } = require('../../utils/jwt.cjs');
const QRCode = require('qrcode');

/**
 * 바우처 코드 생성 (6자리 영숫자)
 * 혼동 방지: I, O, 0, 1 제외
 */
function generateVoucherCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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

    // 2. JWT 인증 확인 (선택 사항)
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    let decoded = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      decoded = JWTUtils.verifyToken(token);
    }

    // 3. 예약 ID 추출
    const bookingId = req.query.id || req.params.id;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        error: 'Booking ID is required'
      });
    }

    console.log(`🎫 [Generate-Voucher] Processing for lodging booking ID: ${bookingId}`);

    // 4. 예약 정보 조회
    const bookings = await db.query(`
      SELECT
        lb.id,
        lb.guest_name,
        lb.guest_email,
        lb.guest_phone,
        lb.checkin_date,
        lb.checkout_date,
        lb.nights,
        lb.total_price,
        lb.status,
        lb.payment_status,
        lb.voucher_code,
        lb.user_id,
        l.id as lodging_id,
        l.name as lodging_name,
        l.address as lodging_address,
        l.phone as lodging_phone
      FROM lodging_bookings lb
      JOIN lodgings l ON lb.lodging_id = l.id
      WHERE lb.id = ?
      LIMIT 1
    `, [bookingId]);

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    const booking = bookings[0];

    // 5. 권한 확인 (예약 소유자 또는 관리자만)
    if (decoded) {
      const isOwner = decoded.userId === booking.user_id;
      const isAdmin = decoded.role === 'admin';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Access denied - You do not own this booking'
        });
      }
    }

    // 6. 결제 상태 확인
    if (booking.payment_status !== 'paid' && booking.payment_status !== 'captured') {
      return res.status(400).json({
        success: false,
        error: 'Payment not completed',
        payment_status: booking.payment_status
      });
    }

    // 7. 중복 생성 방지 (이미 바우처가 있으면 기존 값 반환)
    if (booking.voucher_code) {
      console.log(`⚠️  [Generate-Voucher] Voucher already exists: ${booking.voucher_code}`);

      // 기존 QR 코드 조회
      const existingBooking = await db.query(`
        SELECT qr_code
        FROM lodging_bookings
        WHERE id = ?
      `, [bookingId]);

      return res.status(200).json({
        success: true,
        data: {
          booking_id: booking.id,
          voucher_code: booking.voucher_code,
          qr_code: existingBooking[0]?.qr_code || null,
          already_existed: true
        },
        message: 'Voucher already exists (idempotent response)'
      });
    }

    // 8. 바우처 코드 생성 (중복 체크 포함)
    let voucherCode = generateVoucherCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const duplicates = await db.query(`
        SELECT id FROM lodging_bookings WHERE voucher_code = ?
      `, [voucherCode]);

      if (duplicates.length === 0) {
        break; // 중복 없음
      }

      voucherCode = generateVoucherCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique voucher code');
    }

    console.log(`✅ [Generate-Voucher] Generated code: ${voucherCode}`);

    // 9. QR 코드 데이터 구성
    const qrData = {
      type: 'lodging_booking',
      booking_id: booking.id,
      voucher_code: voucherCode,
      guest_name: booking.guest_name,
      lodging_name: booking.lodging_name,
      checkin_date: booking.checkin_date,
      checkout_date: booking.checkout_date,
      nights: booking.nights,
      issued_at: new Date().toISOString()
    };

    // 10. QR 코드 생성 (Base64)
    const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300
    });

    console.log(`🎨 [Generate-Voucher] QR code generated (${qrCodeDataUrl.length} bytes)`);

    // 11. DB 업데이트 (바우처 및 QR 저장)
    await db.execute(`
      UPDATE lodging_bookings
      SET voucher_code = ?, qr_code = ?, updated_at = NOW()
      WHERE id = ?
    `, [voucherCode, qrCodeDataUrl, bookingId]);

    console.log(`✅ [Generate-Voucher] Saved to DB: booking ${bookingId}`);

    // 12. 히스토리 로그 기록
    try {
      await db.execute(`
        INSERT INTO lodging_booking_history (
          booking_id,
          action,
          details,
          created_by,
          created_at
        ) VALUES (?, 'VOUCHER_GENERATED', ?, ?, NOW())
      `, [
        bookingId,
        JSON.stringify({
          voucher_code: voucherCode,
          generated_at: new Date().toISOString()
        }),
        decoded?.email || 'system'
      ]);
    } catch (logError) {
      console.warn('⚠️  [Generate-Voucher] History log failed (non-critical):', logError.message);
    }

    // 13. 성공 응답
    return res.status(200).json({
      success: true,
      data: {
        booking_id: booking.id,
        voucher_code: voucherCode,
        qr_code: qrCodeDataUrl,
        booking_info: {
          guest_name: booking.guest_name,
          lodging_name: booking.lodging_name,
          checkin_date: booking.checkin_date,
          checkout_date: booking.checkout_date,
          nights: booking.nights
        }
      },
      message: 'Voucher generated successfully'
    });

  } catch (error) {
    console.error('❌ [Generate-Voucher] Error:', error);

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
