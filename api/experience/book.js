/**
 * 체험 예약 생성 API
 * POST /api/experience/book
 *
 * ⚠️ 주의: bookings 테이블 사용 (기존 관광지, 음식과 동일)
 * category_id=1862 (체험)
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
      experience_date,    // 체험 날짜
      experience_time,    // 체험 시간
      num_participants = 1, // 참가 인원
      special_requests,   // 특별 요청사항
      total_amount        // 프론트엔드에서 계산된 금액
    } = req.body;

    console.log('📋 [Experience Booking] 요청 받음:', {
      listing_id,
      user_id,
      experience_date,
      experience_time,
      num_participants
    });

    // 필수 필드 검증
    if (!listing_id || !experience_date) {
      return res.status(400).json({
        success: false,
        error: '필수 필드가 누락되었습니다. (listing_id, experience_date 필수)'
      });
    }

    // 날짜 검증
    const experienceDateObj = new Date(experience_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (experienceDateObj < today) {
      return res.status(400).json({
        success: false,
        error: '체험 날짜는 오늘 이후여야 합니다.'
      });
    }

    // 체험 정보 조회 (listings 테이블에서)
    const experienceResult = await connection.execute(
      `SELECT
        l.*
      FROM listings l
      WHERE l.id = ? AND l.category_id = 1862`,
      [listing_id]
    );

    if (!experienceResult || !experienceResult.rows || experienceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '체험을 찾을 수 없습니다.'
      });
    }

    const experience = experienceResult.rows[0];

    // 활성화 상태 확인
    if (!experience.is_active || !experience.is_published) {
      return res.status(400).json({
        success: false,
        error: '이 체험은 현재 예약할 수 없습니다.'
      });
    }

    // 가격 계산
    const participantCount = parseInt(num_participants) || 1;
    const pricePerPerson = experience.price_from || 0;
    const subtotal = participantCount * pricePerPerson;
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
          // 사용자가 없으면 신규 생성 (username, password_hash 필수)
          const username = user_email.split('@')[0] + '_' + Date.now();
          const placeholderPassword = '$2a$10$GUEST.BOOKING.NO.PASSWORD.HASH.PLACEHOLDER';

          const insertResult = await poolNeon.query(
            `INSERT INTO users (username, email, password_hash, name, phone, role, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 'customer', NOW(), NOW())
             RETURNING id`,
            [username, user_email, placeholderPassword, user_name || 'Guest', user_phone || '']
          );
          finalUserId = insertResult.rows[0].id;
          console.log('✅ [Experience Booking] 신규 사용자 생성:', finalUserId);
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
    const bookingNumber = `EXP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // customer_info JSON 생성
    const customerInfo = JSON.stringify({
      name: user_name || 'Guest',
      email: user_email || '',
      phone: user_phone || '',
      experience_time: experience_time || '',
      num_participants: participantCount
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
        experience_date,
        participantCount,
        0,  // num_children (체험에선 미사용)
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

    console.log('✅ [Experience Booking] 예약 생성 완료:', {
      bookingNumber,
      booking_id: bookingResult.insertId,
      experience_name: experience.title
    });

    return res.status(201).json({
      success: true,
      message: '예약이 생성되었습니다.',
      data: {
        booking_id: bookingResult.insertId,
        booking_number: bookingNumber,
        experience_name: experience.title,
        experience_date,
        experience_time: experience_time || '',
        num_participants: participantCount,
        total_amount: finalTotalAmount,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('❌ [Experience Booking] 오류:', error);
    return res.status(500).json({
      success: false,
      error: '예약 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};
