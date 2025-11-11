/**
 * 숙박 예약 생성 API (실제 bookings 테이블 사용)
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
      listing_id,  // room_id를 listing_id로 변경
      user_id,
      user_email,
      user_name,
      user_phone,
      start_date,  // check_in_date를 start_date로 변경
      end_date,    // check_out_date를 end_date로 변경
      check_in_time,
      check_out_time,
      num_adults,
      num_children,
      num_seniors,
      special_requests,
      total_amount,  // total_price를 total_amount로 변경
      payment_method,
      payment_status
    } = req.body;

    // 필수 필드 검증
    if (!listing_id || !start_date || !end_date || !user_email) {
      return res.status(400).json({
        success: false,
        error: '필수 필드가 누락되었습니다. (listing_id, start_date, end_date, user_email)'
      });
    }

    // 날짜 검증
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (startDateObj < today) {
      return res.status(400).json({
        success: false,
        error: '체크인 날짜는 오늘 이후여야 합니다.'
      });
    }

    if (endDateObj <= startDateObj) {
      return res.status(400).json({
        success: false,
        error: '체크아웃 날짜는 체크인 날짜 이후여야 합니다.'
      });
    }

    // 객실 정보 조회 (listings 테이블에서)
    const roomResult = await connection.execute(
      `SELECT
        l.*,
        p.business_name,
        p.check_in_time as default_check_in,
        p.check_out_time as default_check_out
      FROM listings l
      LEFT JOIN partners p ON l.partner_id = p.id
      WHERE l.id = ? AND l.category_id = 1857`,
      [listing_id]
    );

    if (!roomResult || !roomResult.rows || roomResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '객실을 찾을 수 없습니다.'
      });
    }

    const room = roomResult.rows[0];

    if (!room.is_active) {
      return res.status(400).json({
        success: false,
        error: '이 객실은 현재 예약할 수 없습니다.'
      });
    }

    // 예약 가능 여부 확인 (중복 예약 체크)
    const conflictCheck = await connection.execute(
      `SELECT id FROM bookings
       WHERE listing_id = ?
       AND status IN ('pending', 'confirmed')
       AND (
         (start_date <= ? AND end_date > ?)
         OR (start_date < ? AND end_date >= ?)
         OR (start_date >= ? AND end_date <= ?)
       )`,
      [listing_id, start_date, start_date, end_date, end_date, start_date, end_date]
    );

    if (conflictCheck && conflictCheck.rows && conflictCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: '선택하신 날짜에 이미 예약이 존재합니다.'
      });
    }

    // 가격 계산
    const nights = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));
    const adultsCount = num_adults || 2;
    const childrenCount = num_children || 0;
    const seniorsCount = num_seniors || 0;

    // 기본 가격 계산 (1박 기준 가격 * 박수)
    const basePrice = (room.base_price_per_night || 0) * nights;
    const weekendSurcharge = (room.weekend_surcharge || 0) * nights;
    const subtotal = basePrice + weekendSurcharge;

    const finalTotalAmount = total_amount || subtotal;

    // user_id 확인 (필수)
    let finalUserId = user_id;
    if (!finalUserId) {
      // ✅ Neon PostgreSQL에서 이메일로 사용자 조회
      const { Pool } = require('@neondatabase/serverless');
      const poolNeon = new Pool({
        connectionString: process.env.POSTGRES_DATABASE_URL || process.env.DATABASE_URL
      });

      try {
        const userResult = await poolNeon.query(
          'SELECT id FROM users WHERE email = $1',
          [user_email]
        );

        if (userResult.rows && userResult.rows.length > 0) {
          finalUserId = userResult.rows[0].id;
        } else {
          // 사용자가 없으면 신규 생성
          const insertResult = await poolNeon.query(
            `INSERT INTO users (email, name, role, created_at, updated_at)
             VALUES ($1, $2, 'customer', NOW(), NOW())
             RETURNING id`,
            [user_email, user_name || 'Guest']
          );
          finalUserId = insertResult.rows[0].id;
        }
      } finally {
        await poolNeon.end();
      }
    }

    // 예약 번호 생성
    const bookingNumber = `BK${Date.now()}`;

    // customer_info JSON 생성
    const customerInfo = JSON.stringify({
      name: user_name || 'Guest',
      email: user_email,
      phone: user_phone || ''
    });

    // 예약 생성 (실제 bookings 테이블 구조에 맞춤)
    const bookingResult = await connection.execute(
      `INSERT INTO bookings (
        booking_number,
        listing_id,
        user_id,
        start_date,
        end_date,
        check_in_time,
        check_out_time,
        num_adults,
        num_children,
        num_seniors,
        price_adult,
        price_child,
        price_senior,
        subtotal,
        discount_amount,
        tax_amount,
        total_amount,
        payment_method,
        payment_status,
        status,
        customer_info,
        special_requests,
        created_at,
        updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
      )`,
      [
        bookingNumber,
        listing_id,
        finalUserId,
        start_date,
        end_date,
        check_in_time || room.default_check_in || '15:00',
        check_out_time || room.default_check_out || '11:00',
        adultsCount,
        childrenCount,
        seniorsCount,
        room.base_price_per_night || 0,  // price_adult (1인당 가격으로 간주)
        room.base_price_per_night ? Math.floor(room.base_price_per_night * 0.7) : 0,  // price_child (70%)
        room.base_price_per_night || 0,  // price_senior (동일)
        subtotal,
        0,  // discount_amount
        0,  // tax_amount
        finalTotalAmount,
        payment_method || 'card',
        payment_status || 'pending',
        'pending',
        customerInfo,
        special_requests || ''
      ]
    );

    console.log('Accommodation booking created:', bookingResult);

    return res.status(201).json({
      success: true,
      message: '예약이 생성되었습니다.',
      data: {
        booking_id: bookingResult.insertId,
        booking_number: bookingNumber,
        room_name: room.title,
        check_in: start_date,
        check_out: end_date,
        nights,
        total_amount: finalTotalAmount,
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
