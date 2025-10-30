const { connect } = require('@planetscale/database');
const QRCode = require('qrcode');

/**
 * 투어 예약 생성 API
 * POST /api/tour/book
 *
 * Body:
 * - schedule_id: 일정 ID
 * - user_id: 사용자 ID
 * - participants: 참가자 정보 배열
 * - adult_count: 성인 수
 * - child_count: 아동 수
 * - infant_count: 유아 수
 * - special_requests: 특별 요청사항
 */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const {
      schedule_id,
      user_id,
      participants,
      adult_count = 0,
      child_count = 0,
      infant_count = 0,
      special_requests = ''
    } = req.body;

    // 필수 필드 확인
    if (!schedule_id || !user_id || !participants || participants.length === 0) {
      return res.status(400).json({
        success: false,
        error: '필수 정보가 누락되었습니다.'
      });
    }

    // 일정 정보 조회
    const scheduleResult = await connection.execute(
      `SELECT
        ts.*,
        tp.price_adult_krw,
        tp.price_child_krw,
        tp.price_infant_krw,
        tp.package_name
       FROM tour_schedules ts
       INNER JOIN tour_packages tp ON ts.package_id = tp.id
       WHERE ts.id = ? AND ts.status IN ('scheduled', 'confirmed')`,
      [schedule_id]
    );

    if (!scheduleResult.rows || scheduleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '일정을 찾을 수 없거나 예약이 불가능합니다.'
      });
    }

    const schedule = scheduleResult.rows[0];

    // 정원 확인
    const totalParticipants = adult_count + child_count + infant_count;
    const availableSeats = schedule.max_participants - schedule.current_participants;

    if (totalParticipants > availableSeats) {
      return res.status(400).json({
        success: false,
        error: `남은 좌석이 부족합니다. (남은 좌석: ${availableSeats}석)`
      });
    }

    // 가격 계산 (일정별 가격 우선, 없으면 패키지 기본 가격)
    const priceAdult = schedule.price_adult_krw || schedule.price_adult_krw;
    const priceChild = schedule.price_child_krw || schedule.price_child_krw || 0;
    const priceInfant = schedule.price_infant_krw || 0;

    const totalPrice = (adult_count * priceAdult) +
                      (child_count * priceChild) +
                      (infant_count * priceInfant);

    // 최소 금액 검증
    if (totalPrice <= 0) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 가격입니다.'
      });
    }

    // 예약 번호 생성 (TOUR-YYYYMMDD-XXXX)
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `TOUR-${today}-${randomNum}`;

    // 바우처 코드 생성
    const voucherCode = `VCH-${today}-${randomNum}`;

    // QR 코드 생성
    const qrData = JSON.stringify({
      bookingNumber,
      voucherCode,
      scheduleId: schedule_id,
      participants: totalParticipants
    });
    const qrCode = await QRCode.toDataURL(qrData);

    // 예약 생성
    const insertResult = await connection.execute(
      `INSERT INTO tour_bookings (
        booking_number,
        schedule_id,
        user_id,
        participants,
        adult_count,
        child_count,
        infant_count,
        total_price_krw,
        voucher_code,
        qr_code,
        special_requests,
        status,
        payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')`,
      [
        bookingNumber,
        schedule_id,
        user_id,
        JSON.stringify(participants),
        adult_count,
        child_count,
        infant_count,
        totalPrice,
        voucherCode,
        qrCode,
        special_requests
      ]
    );

    // 일정의 참가자 수 증가 (정원 초과 방지)
    const updateResult = await connection.execute(
      `UPDATE tour_schedules
       SET current_participants = current_participants + ?,
           status = CASE
             WHEN current_participants + ? >= max_participants THEN 'full'
             ELSE status
           END,
           updated_at = NOW()
       WHERE id = ?
         AND current_participants + ? <= max_participants`,
      [totalParticipants, totalParticipants, schedule_id, totalParticipants]
    );

    // 업데이트 실패 시 (정원 초과된 경우)
    if (!updateResult.rowsAffected || updateResult.rowsAffected === 0) {
      // 이미 생성된 예약 삭제
      await connection.execute(
        'DELETE FROM tour_bookings WHERE id = ?',
        [insertResult.insertId]
      );

      return res.status(409).json({
        success: false,
        error: '예약 처리 중 정원이 마감되었습니다. 다시 시도해주세요.',
        code: 'SEATS_FULL'
      });
    }

    console.log(`✅ [Tour Booking] 예약 생성 완료: ${bookingNumber}`);

    return res.status(201).json({
      success: true,
      message: '예약이 생성되었습니다.',
      data: {
        booking_id: insertResult.insertId,
        booking_number: bookingNumber,
        voucher_code: voucherCode,
        total_price: totalPrice,
        status: 'pending',
        payment_status: 'pending'
      }
    });

  } catch (error) {
    console.error('❌ [Tour Booking API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
