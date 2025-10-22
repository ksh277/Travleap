/**
 * 숙박 예약 생성 API
 * POST /api/accommodations/book
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const {
      room_id,
      accommodation_vendor_id,
      user_id,
      user_email,
      user_name,
      user_phone,
      check_in_date,
      check_out_date,
      guests,
      special_requests,
      total_price,
      payment_method,
      payment_status
    } = req.body;

    // 필수 필드 검증
    if (!room_id || !accommodation_vendor_id || !check_in_date || !check_out_date || !user_email) {
      return res.status(400).json({
        success: false,
        error: '필수 필드가 누락되었습니다. (room_id, accommodation_vendor_id, check_in_date, check_out_date, user_email)'
      });
    }

    // 날짜 검증
    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkIn < today) {
      return res.status(400).json({
        success: false,
        error: '체크인 날짜는 오늘 이후여야 합니다.'
      });
    }

    if (checkOut <= checkIn) {
      return res.status(400).json({
        success: false,
        error: '체크아웃 날짜는 체크인 날짜 이후여야 합니다.'
      });
    }

    // 객실 정보 조회
    const roomResult = await connection.execute(
      'SELECT * FROM accommodation_rooms WHERE id = ? AND vendor_id = ?',
      [room_id, accommodation_vendor_id]
    );

    if (!roomResult.rows || roomResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '객실을 찾을 수 없습니다.'
      });
    }

    const room = roomResult.rows[0];

    if (!room.is_available) {
      return res.status(400).json({
        success: false,
        error: '이 객실은 현재 예약할 수 없습니다.'
      });
    }

    // 예약 가능 여부 확인 (중복 예약 체크)
    const conflictCheck = await connection.execute(
      `SELECT id FROM bookings
       WHERE room_id = ?
       AND status IN ('pending', 'confirmed')
       AND (
         (check_in_date <= ? AND check_out_date > ?)
         OR (check_in_date < ? AND check_out_date >= ?)
         OR (check_in_date >= ? AND check_out_date <= ?)
       )`,
      [room_id, check_in_date, check_in_date, check_out_date, check_out_date, check_in_date, check_out_date]
    );

    if (conflictCheck.rows && conflictCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: '선택하신 날짜에 이미 예약이 존재합니다.'
      });
    }

    // 가격 계산
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const calculatedPrice = total_price || (room.base_price_per_night * nights);

    // 예약 생성
    const bookingResult = await connection.execute(
      `INSERT INTO bookings (
        user_id, room_id, accommodation_vendor_id, listing_type,
        customer_name, customer_email, customer_phone,
        check_in_date, check_out_date, guests,
        special_requests, total_price, payment_method, payment_status,
        status, created_at, updated_at
      ) VALUES (
        ?, ?, ?, 'accommodation',
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        'pending', NOW(), NOW()
      )`,
      [
        user_id || null,
        room_id,
        accommodation_vendor_id,
        user_name || 'Guest',
        user_email,
        user_phone || '',
        check_in_date,
        check_out_date,
        guests || 2,
        special_requests || '',
        calculatedPrice,
        payment_method || 'card',
        payment_status || 'pending'
      ]
    );

    console.log('Accommodation booking created:', bookingResult);

    return res.status(201).json({
      success: true,
      message: '예약이 생성되었습니다.',
      data: {
        booking_id: bookingResult.insertId,
        room_name: room.room_name,
        check_in: check_in_date,
        check_out: check_out_date,
        nights,
        total_price: calculatedPrice,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Booking creation error:', error);
    return res.status(500).json({
      success: false,
      error: '예약 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};
