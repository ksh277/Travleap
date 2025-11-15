/**
 * 이벤트 티켓 예약 API
 * POST /api/events/book
 *
 * 기능:
 * - 이벤트 티켓 예약 생성 (성인/어린이/유아 구분)
 * - 연령대별 가격 검증
 * - bookings 테이블에 예약 저장
 */

const { connect } = require('@planetscale/database');

module.exports = async function handler(req, res) {
  // CORS 헤더
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
      user_name,
      user_email,
      user_phone,
      event_date,
      num_adults,
      num_children,
      num_infants,
      special_requests,
      total_amount
    } = req.body;

    console.log('🎉 [Events Book] 예약 요청:', {
      listing_id,
      user_id,
      event_date,
      num_adults,
      num_children,
      num_infants,
      total_amount
    });

    // 필수 필드 검증
    if (!listing_id || !user_email || !user_name || !event_date) {
      return res.status(400).json({
        success: false,
        error: '필수 필드가 누락되었습니다.'
      });
    }

    // 최소 1명 이상 예약 확인
    const totalGuests = (num_adults || 0) + (num_children || 0) + (num_infants || 0);
    if (totalGuests === 0) {
      return res.status(400).json({
        success: false,
        error: '최소 1명 이상 선택해주세요.'
      });
    }

    // 1. 이벤트 정보 조회
    const listingResult = await connection.execute(`
      SELECT
        id, title, category_id,
        price_from as adult_price,
        child_price,
        infant_price,
        is_active
      FROM listings
      WHERE id = ? AND is_active = 1
    `, [listing_id]);

    if (!listingResult.rows || listingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '이벤트를 찾을 수 없습니다.'
      });
    }

    const listing = listingResult.rows[0];

    // 2. 🔒 서버에서 금액 재계산 (보안: 클라이언트 조작 방지)
    const serverAdultPrice = listing.adult_price || 0;
    const serverChildPrice = listing.child_price || 0;
    const serverInfantPrice = listing.infant_price || 0;

    const serverCalculatedTotal =
      (num_adults || 0) * serverAdultPrice +
      (num_children || 0) * serverChildPrice +
      (num_infants || 0) * serverInfantPrice;

    console.log('💰 [Events Book] 가격 검증:', {
      serverCalculated: serverCalculatedTotal,
      clientProvided: total_amount,
      adultPrice: serverAdultPrice,
      childPrice: serverChildPrice,
      infantPrice: serverInfantPrice
    });

    // 3. 🔒 금액 검증 (1원 이하 오차 허용)
    if (Math.abs(serverCalculatedTotal - (total_amount || 0)) > 1) {
      console.error('❌ [Events Book] 금액 조작 감지:', {
        expected: serverCalculatedTotal,
        received: total_amount,
        difference: Math.abs(serverCalculatedTotal - total_amount)
      });

      return res.status(400).json({
        success: false,
        error: 'PRICE_TAMPERED',
        message: '티켓 가격이 변경되었습니다. 페이지를 새로고침해주세요.',
        expected: serverCalculatedTotal,
        received: total_amount
      });
    }

    // 4. 예약 번호 생성
    const bookingNumber = `EVENT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 5. bookings 테이블에 저장
    const result = await connection.execute(`
      INSERT INTO bookings (
        user_id,
        listing_id,
        booking_number,
        total_amount,
        status,
        payment_status,
        start_date,
        adults,
        children,
        infants,
        guests,
        special_requests,
        customer_info,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      user_id || null,
      listing_id,
      bookingNumber,
      serverCalculatedTotal,
      'pending',
      'pending',
      event_date,
      num_adults || 0,
      num_children || 0,
      num_infants || 0,
      totalGuests,
      special_requests || null,
      JSON.stringify({
        name: user_name,
        email: user_email,
        phone: user_phone || null
      })
    ]);

    console.log('✅ [Events Book] 예약 생성 완료:', bookingNumber);

    // 6. 응답 반환
    return res.status(200).json({
      success: true,
      data: {
        booking_id: result.insertId,
        booking_number: bookingNumber,
        listing_id,
        listing_title: listing.title,
        event_date,
        num_adults,
        num_children,
        num_infants,
        total_guests: totalGuests,
        total_amount: serverCalculatedTotal,
        pricing: {
          adult_price: serverAdultPrice,
          child_price: serverChildPrice,
          infant_price: serverInfantPrice,
          adults_total: (num_adults || 0) * serverAdultPrice,
          children_total: (num_children || 0) * serverChildPrice,
          infants_total: (num_infants || 0) * serverInfantPrice
        }
      },
      message: '예약이 생성되었습니다.'
    });

  } catch (error) {
    console.error('❌ [Events Book] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || '예약 생성 중 오류가 발생했습니다.'
    });
  }
};
