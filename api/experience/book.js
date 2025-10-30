const { connect } = require('@planetscale/database');
const QRCode = require('qrcode');

/**
 * 체험 예약 생성 API
 * POST /api/experience/book
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
      slot_id,
      user_id,
      participants,
      equipment_rental = false,
      equipment_rental_items = []
    } = req.body;

    if (!slot_id || !user_id || !participants || participants.length === 0) {
      return res.status(400).json({
        success: false,
        error: '필수 정보가 누락되었습니다.'
      });
    }

    // 슬롯 정보 조회
    const slotResult = await connection.execute(
      `SELECT es.*, e.price_krw, e.equipment_rental_price_krw, e.waiver_required
       FROM experience_slots es
       INNER JOIN experiences e ON es.experience_id = e.id
       WHERE es.id = ? AND es.status IN ('scheduled', 'confirmed')`,
      [slot_id]
    );

    if (!slotResult.rows || slotResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '슬롯을 찾을 수 없습니다.'
      });
    }

    const slot = slotResult.rows[0];
    const availableSeats = slot.max_participants - slot.current_participants;

    if (participants.length > availableSeats) {
      return res.status(400).json({
        success: false,
        error: `남은 좌석이 부족합니다. (남은 좌석: ${availableSeats}석)`
      });
    }

    // 가격 계산
    let totalPrice = slot.price_krw * participants.length;
    if (equipment_rental && slot.equipment_rental_price_krw) {
      totalPrice += slot.equipment_rental_price_krw * participants.length;
    }

    // 예약 번호 생성
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `EXP-${today}-${randomNum}`;
    const voucherCode = `VCH-${today}-${randomNum}`;

    // QR 코드 생성
    const qrData = JSON.stringify({ bookingNumber, voucherCode, slotId: slot_id });
    const qrCode = await QRCode.toDataURL(qrData);

    // 예약 생성
    const result = await connection.execute(
      `INSERT INTO experience_bookings (
        booking_number,
        slot_id,
        user_id,
        participants,
        participant_count,
        total_price_krw,
        equipment_rental,
        equipment_rental_items,
        voucher_code,
        qr_code,
        status,
        payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')`,
      [
        bookingNumber,
        slot_id,
        user_id,
        JSON.stringify(participants),
        participants.length,
        totalPrice,
        equipment_rental,
        JSON.stringify(equipment_rental_items),
        voucherCode,
        qrCode
      ]
    );

    // 슬롯 참가자 수 증가 (정원 초과 방지)
    const updateResult = await connection.execute(
      `UPDATE experience_slots
       SET current_participants = current_participants + ?,
           status = CASE
             WHEN current_participants + ? >= max_participants THEN 'full'
             ELSE status
           END
       WHERE id = ?
         AND current_participants + ? <= max_participants`,
      [participants.length, participants.length, slot_id, participants.length]
    );

    // 업데이트 실패 시 (정원 초과된 경우)
    if (!updateResult.rowsAffected || updateResult.rowsAffected === 0) {
      // 이미 생성된 예약 삭제
      await connection.execute(
        'DELETE FROM experience_bookings WHERE id = ?',
        [result.insertId]
      );

      return res.status(409).json({
        success: false,
        error: '예약 처리 중 정원이 마감되었습니다. 다시 시도해주세요.',
        code: 'SEATS_FULL'
      });
    }

    console.log(`✅ [Experience Booking] 예약 생성: ${bookingNumber}`);

    return res.status(201).json({
      success: true,
      message: '예약이 생성되었습니다.',
      data: {
        booking_id: result.insertId,
        booking_number: bookingNumber,
        voucher_code: voucherCode,
        total_price: totalPrice,
        waiver_required: slot.waiver_required
      }
    });

  } catch (error) {
    console.error('❌ [Experience Booking API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
