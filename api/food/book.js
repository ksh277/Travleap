/**
 * 음식점 예약 생성 API
 * POST /api/food/book
 *
 * ⚠️ 주의: bookings 테이블 사용 (기존 관광지, 숙박과 동일)
 * category_id=1858 (음식)
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const {
      listing_id,
      user_id,
      user_email,
      user_name,
      user_phone,
      reservation_date,   // 예약 날짜
      reservation_time,   // 예약 시간
      party_size = 2,     // 인원 수
      special_requests,   // 특별 요청사항
      total_amount        // 프론트엔드에서 계산된 금액
    } = req.body;

    console.log('📋 [Food Booking] 요청 받음:', {
      listing_id,
      user_id,
      reservation_date,
      reservation_time,
      party_size
    });

    // 필수 필드 검증
    if (!listing_id || !reservation_date) {
      return res.status(400).json({
        success: false,
        error: '필수 필드가 누락되었습니다. (listing_id, reservation_date 필수)'
      });
    }

    // 날짜 검증
    const reservationDateObj = new Date(reservation_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (reservationDateObj < today) {
      return res.status(400).json({
        success: false,
        error: '예약 날짜는 오늘 이후여야 합니다.'
      });
    }

    // 음식점 정보 조회 (listings 테이블에서)
    const restaurantResult = await connection.execute(
      `SELECT
        l.*
      FROM listings l
      WHERE l.id = ? AND l.category_id = 1858`,
      [listing_id]
    );

    if (!restaurantResult || !restaurantResult.rows || restaurantResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '음식점을 찾을 수 없습니다.'
      });
    }

    const restaurant = restaurantResult.rows[0];

    // 활성화 상태 확인
    if (!restaurant.is_active || !restaurant.is_published) {
      return res.status(400).json({
        success: false,
        error: '이 음식점은 현재 예약할 수 없습니다.'
      });
    }

    // 가격 계산
    const partySizeCount = parseInt(party_size) || 2;
    const pricePerPerson = restaurant.price_from || 0;
    const subtotal = partySizeCount * pricePerPerson;
    const finalTotalAmount = total_amount || Math.floor(subtotal);

    // user_id 확인 (필수)
    let finalUserId = user_id;
    if (!finalUserId && user_email) {
      // Neon PostgreSQL에서 이메일로 사용자 조회
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
            `INSERT INTO users (email, name, phone, role, created_at, updated_at)
             VALUES ($1, $2, $3, 'customer', NOW(), NOW())
             RETURNING id`,
            [user_email, user_name || 'Guest', user_phone || '']
          );
          finalUserId = insertResult.rows[0].id;
          console.log('✅ [Food Booking] 신규 사용자 생성:', finalUserId);
        }
      } finally {
        await poolNeon.end();
      }
    }

    if (!finalUserId) {
      return res.status(400).json({
        success: false,
        error: 'user_id 또는 user_email이 필요합니다.'
      });
    }

    // 예약 번호 생성
    const bookingNumber = `FOOD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // customer_info JSON 생성
    const customerInfo = JSON.stringify({
      name: user_name || 'Guest',
      email: user_email || '',
      phone: user_phone || '',
      reservation_time: reservation_time || '',
      party_size: partySizeCount
    });

    // bookings 테이블에 예약 생성
    const bookingResult = await connection.execute(
      `INSERT INTO bookings (
        booking_number,
        listing_id,
        user_id,
        start_date,
        num_adults,
        num_children,
        price_adult,
        price_child,
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
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
      )`,
      [
        bookingNumber,
        listing_id,
        finalUserId,
        reservation_date,
        partySizeCount,
        0,  // num_children (음식점 예약에선 미사용)
        Math.floor(pricePerPerson),
        0,  // price_child
        Math.floor(subtotal),
        0,  // discount_amount
        0,  // tax_amount
        finalTotalAmount,
        'card',
        'pending',
        'pending',
        customerInfo,
        special_requests || ''
      ]
    );

    console.log('✅ [Food Booking] 예약 생성 완료:', {
      bookingNumber,
      booking_id: bookingResult.insertId,
      restaurant_name: restaurant.title
    });

    return res.status(201).json({
      success: true,
      message: '예약이 생성되었습니다.',
      data: {
        booking_id: bookingResult.insertId,
        booking_number: bookingNumber,
        restaurant_name: restaurant.title,
        reservation_date,
        reservation_time: reservation_time || '',
        party_size: partySizeCount,
        total_amount: finalTotalAmount,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('❌ [Food Booking] 오류:', error);
    return res.status(500).json({
      success: false,
      error: '예약 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};
