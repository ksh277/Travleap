/**
 * 이벤트 예약 생성 API
 * POST /api/events/book
 *
 * ⚠️ 주의: bookings 테이블 사용 (기존 음식, 관광지, 체험, 투어와 동일)
 * category_id=1861 (행사)
 *
 * Body:
 * - listing_id: 이벤트 상품 ID
 * - user_id: 사용자 ID
 * - user_email: 사용자 이메일 (user_id 없을 시)
 * - user_name: 사용자 이름
 * - user_phone: 사용자 전화번호
 * - event_date: 이벤트 참가 날짜 (YYYY-MM-DD)
 * - ticket_type: 티켓 유형 (예: 'standard', 'vip', 'early_bird')
 * - num_tickets: 티켓 수량
 * - price_per_ticket: 티켓당 가격
 * - special_requests: 특별 요청사항
 * - total_amount: 총 금액 (프론트엔드에서 계산)
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
      event_date,
      ticket_type = 'standard',
      num_tickets = 1,
      num_adults,      // ✅ 성인 수 (선택)
      num_children,    // ✅ 어린이 수 (선택)
      num_infants,     // ✅ 유아 수 (선택)
      price_per_ticket = 0,
      special_requests = '',
      total_amount
    } = req.body;

    console.log('📋 [Event Booking] 요청 받음:', {
      listing_id,
      user_id,
      event_date,
      ticket_type,
      num_tickets
    });

    // 필수 필드 확인
    if (!listing_id || !event_date) {
      return res.status(400).json({
        success: false,
        error: '필수 정보가 누락되었습니다. (listing_id, event_date 필수)'
      });
    }

    // 날짜 검증
    const eventDateObj = new Date(event_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (eventDateObj < today) {
      return res.status(400).json({
        success: false,
        error: '이벤트 날짜는 오늘 이후여야 합니다.'
      });
    }

    // 이벤트 상품 정보 조회 (listings + listing_event)
    const eventResult = await connection.execute(
      `SELECT
        l.*,
        le.event_type,
        le.start_date,
        le.end_date,
        le.venue_info,
        le.venue_address,
        le.organizer,
        le.age_restriction
       FROM listings l
       LEFT JOIN listing_event le ON l.id = le.listing_id
       WHERE l.id = ? AND l.category_id = 1861`,
      [listing_id]
    );

    if (!eventResult || !eventResult.rows || eventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '이벤트를 찾을 수 없습니다.'
      });
    }

    const event = eventResult.rows[0];

    // 활성화 상태 확인
    if (!event.is_active || !event.is_published) {
      return res.status(400).json({
        success: false,
        error: '이 이벤트는 현재 예약할 수 없습니다.'
      });
    }

    // 이벤트 기간 확인
    if (event.start_date && event.end_date) {
      const startDate = new Date(event.start_date);
      const endDate = new Date(event.end_date);

      if (eventDateObj < startDate || eventDateObj > endDate) {
        return res.status(400).json({
          success: false,
          error: `이벤트 기간은 ${event.start_date} ~ ${event.end_date}입니다.`
        });
      }
    }

    // ✅ 가격 계산 (타입 안전성 개선)
    const numTicketsCount = parseInt(num_tickets) || 1;
    if (numTicketsCount <= 0) {
      return res.status(400).json({
        success: false,
        error: '최소 1장 이상의 티켓이 필요합니다.'
      });
    }

    const pricePerTicket = Number(price_per_ticket) || Number(event.price_from) || 0;
    const subtotal = numTicketsCount * pricePerTicket;
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
          console.log('✅ [Event Booking] 신규 사용자 생성:', finalUserId);
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

    // 예약 번호 생성 (EVT-YYYYMMDD-XXXX 형식)
    const today_str = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const bookingNumber = `EVT-${today_str}-${randomNum}`;

    // ✅ 인원 정보 처리 (있으면 사용, 없으면 티켓 수량 기준)
    const adultsCount = num_adults !== undefined ? parseInt(num_adults) : numTicketsCount;
    const childrenCount = num_children !== undefined ? parseInt(num_children) : 0;
    const infantsCount = num_infants !== undefined ? parseInt(num_infants) : 0;

    // customer_info JSON 생성 (이벤트 특화 정보 포함)
    const customerInfo = JSON.stringify({
      name: user_name || 'Guest',
      email: user_email || '',
      phone: user_phone || '',
      ticket_type: ticket_type,
      num_tickets: numTicketsCount,
      adults: adultsCount,
      children: childrenCount,
      infants: infantsCount,
      event_type: event.event_type || '',
      venue_info: event.venue_info || '',
      venue_address: event.venue_address || '',
      organizer: event.organizer || '',
      age_restriction: event.age_restriction || ''
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
        adults,
        children,
        infants,
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
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()
      )`,
      [
        bookingNumber,
        listing_id,
        finalUserId,
        event_date,
        numTicketsCount,  // num_adults에 티켓 수량 저장 (하위 호환성)
        0,  // num_children (하위 호환성)
        adultsCount,  // ✅ adults 컬럼
        childrenCount,  // ✅ children 컬럼
        infantsCount,  // ✅ infants 컬럼
        Math.floor(pricePerTicket),
        0,  // price_child
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

    console.log('✅ [Event Booking] 예약 생성 완료:', {
      bookingNumber,
      booking_id: bookingResult.insertId,
      event_name: event.title
    });

    return res.status(201).json({
      success: true,
      message: '이벤트 예약이 생성되었습니다.',
      data: {
        booking_id: bookingResult.insertId,
        booking_number: bookingNumber,
        event_name: event.title,
        event_date,
        ticket_type,
        num_tickets: numTicketsCount,
        total_amount: Math.floor(finalTotalAmount),
        status: 'pending',
        payment_status: 'pending'
      }
    });

  } catch (error) {
    console.error('❌ [Event Booking API] 오류:', error);
    return res.status(500).json({
      success: false,
      error: '이벤트 예약 처리 중 오류가 발생했습니다.',
      details: error.message
    });
  }
};
