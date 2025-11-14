const { connect } = require('@planetscale/database');
const QRCode = require('qrcode');

/**
 * 투어 예약 생성 API
 * POST /api/tour/book
 *
 * ⚠️ 주의: bookings 테이블 사용 (기존 음식, 관광지, 체험과 동일)
 * category_id=1855 (여행/투어)
 *
 * Body:
 * - listing_id: 투어 상품 ID
 * - user_id: 사용자 ID
 * - user_email: 사용자 이메일 (user_id 없을 시)
 * - user_name: 사용자 이름
 * - user_phone: 사용자 전화번호
 * - tour_date: 투어 날짜 (YYYY-MM-DD)
 * - participants: 참가자 정보 배열
 * - adult_count: 성인 수
 * - child_count: 아동 수
 * - infant_count: 유아 수
 * - price_adult: 성인 1인당 가격
 * - price_child: 아동 1인당 가격
 * - price_infant: 유아 1인당 가격
 * - special_requests: 특별 요청사항
 * - total_amount: 총 금액 (프론트엔드에서 계산)
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
      listing_id,
      user_id,
      user_email,
      user_name,
      user_phone,
      tour_date,
      participants,
      adult_count = 0,
      child_count = 0,
      infant_count = 0,
      price_adult = 0,
      price_child = 0,
      price_infant = 0,
      special_requests = '',
      total_amount
    } = req.body;

    // ✅ 타입 안전성: 수량 필드 숫자 변환
    const adultCount = parseInt(adult_count) || 0;
    const childCount = parseInt(child_count) || 0;
    const infantCount = parseInt(infant_count) || 0;

    console.log('📋 [Tour Booking] 요청 받음:', {
      listing_id,
      user_id,
      tour_date,
      adultCount,
      childCount,
      infantCount
    });

    // 필수 필드 확인
    if (!listing_id || !tour_date) {
      return res.status(400).json({
        success: false,
        error: '필수 정보가 누락되었습니다. (listing_id, tour_date 필수)'
      });
    }

    // 날짜 검증
    const tourDateObj = new Date(tour_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (tourDateObj < today) {
      return res.status(400).json({
        success: false,
        error: '투어 날짜는 오늘 이후여야 합니다.'
      });
    }

    // 투어 상품 정보 조회 (listings + listing_tour)
    const tourResult = await connection.execute(
      `SELECT
        l.*,
        lt.tour_type,
        lt.duration_hours,
        lt.meeting_point,
        lt.difficulty_level
       FROM listings l
       LEFT JOIN listing_tour lt ON l.id = lt.listing_id
       WHERE l.id = ? AND l.category_id = 1855`,
      [listing_id]
    );

    if (!tourResult || !tourResult.rows || tourResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '투어 상품을 찾을 수 없습니다.'
      });
    }

    const tour = tourResult.rows[0];

    // 활성화 상태 확인
    if (!tour.is_active || !tour.is_published) {
      return res.status(400).json({
        success: false,
        error: '이 투어는 현재 예약할 수 없습니다.'
      });
    }

    // ✅ 가격 계산 (타입 안전성 개선)
    const totalParticipants = adultCount + childCount + infantCount;
    if (totalParticipants === 0) {
      return res.status(400).json({
        success: false,
        error: '최소 1명 이상의 참가자가 필요합니다.'
      });
    }

    // 가격 필드 숫자 변환
    const priceAdultNum = Number(price_adult) || Number(tour.price_from) || 0;
    const priceChildNum = Number(price_child) || Math.floor(priceAdultNum * 0.7) || 0;
    const priceInfantNum = Number(price_infant) || 0;

    const subtotal = (adultCount * priceAdultNum) +
                     (childCount * priceChildNum) +
                     (infantCount * priceInfantNum);

    const finalTotalAmount = Number(total_amount) || Math.floor(subtotal);

    // 최소 금액 검증
    if (finalTotalAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: '유효하지 않은 가격입니다.'
      });
    }

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
          const username = user_email.split('@')[0] + '_' + Date.now();
          const placeholderPassword = '$2a$10$GUEST.BOOKING.NO.PASSWORD.HASH.PLACEHOLDER';

          const insertResult = await poolNeon.query(
            `INSERT INTO users (username, email, password_hash, name, phone, role, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, 'user', NOW(), NOW())
             RETURNING id`,
            [username, user_email, placeholderPassword, user_name || 'Guest', user_phone || '']
          );
          finalUserId = insertResult.rows[0].id;
          console.log('✅ [Tour Booking] 신규 사용자 생성:', finalUserId);
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

    // 예약 번호 생성 (TOUR-YYYYMMDD-XXXX)
    const today_str = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `TOUR-${today_str}-${randomNum}`;

    // 바우처 코드 생성
    const voucherCode = `VCH-${today_str}-${randomNum}`;

    // QR 코드 생성
    const qrData = JSON.stringify({
      bookingNumber,
      voucherCode,
      listing_id,
      tour_date,
      participants: totalParticipants,
      adult_count: adultCount,
      child_count: childCount,
      infant_count: infantCount
    });
    const qrCode = await QRCode.toDataURL(qrData);

    // customer_info JSON 생성 (투어 특화 정보 포함)
    const customerInfo = JSON.stringify({
      name: user_name || 'Guest',
      email: user_email || '',
      phone: user_phone || '',
      participants: participants || [],
      adult_count: adultCount,
      child_count: childCount,
      infant_count: infantCount,
      voucher_code: voucherCode,
      qr_code: qrCode,
      tour_type: tour.tour_type || '',
      duration_hours: tour.duration_hours || 0,
      meeting_point: tour.meeting_point || ''
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
        tour_date,
        adultCount,
        childCount + infantCount,  // num_children에 child + infant 합산
        Math.floor(priceAdultNum),
        Math.floor(priceChildNum),
        Math.floor(subtotal),
        0,  // discount_amount
        0,  // tax_amount
        Math.floor(finalTotalAmount),
        'card',
        'pending',
        'pending',
        customerInfo,
        special_requests || ''
      ]
    );

    console.log('✅ [Tour Booking] 예약 생성 완료:', {
      bookingNumber,
      booking_id: bookingResult.insertId,
      tour_name: tour.title,
      voucher_code: voucherCode
    });

    return res.status(201).json({
      success: true,
      message: '투어 예약이 생성되었습니다.',
      data: {
        booking_id: bookingResult.insertId,
        booking_number: bookingNumber,
        voucher_code: voucherCode,
        qr_code: qrCode,
        tour_name: tour.title,
        tour_date,
        adult_count: adultCount,
        child_count: childCount,
        infant_count: infantCount,
        total_amount: Math.floor(finalTotalAmount),
        status: 'pending',
        payment_status: 'pending'
      }
    });

  } catch (error) {
    console.error('❌ [Tour Booking API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: '투어 예약 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};
