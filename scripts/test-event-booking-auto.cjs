/**
 * 이벤트 예약 API 자동 테스트
 */
require('dotenv').config();

(async () => {
  try {
    const handler = require('../api/events/book.js');

    console.log('📊 이벤트 예약 API 자동 테스트 시작...\n');

    // 테스트 요청 데이터
    const testBody = {
      listing_id: '357',  // 서울 재즈 페스티벌
      user_email: 'eventtest@example.com',
      user_name: '이벤트테스트',
      user_phone: '010-8888-7777',
      event_date: '2025-12-07',  // 이벤트 기간 내 (2025-12-06 ~ 2025-12-08)
      ticket_type: 'vip',
      num_tickets: 2,
      price_per_ticket: 80000,
      special_requests: 'VIP 라운지 이용 희망',
      total_amount: 160000
    };

    console.log('=== 요청 데이터 ===');
    console.log(JSON.stringify(testBody, null, 2));
    console.log();

    // Mock Request/Response 객체
    const mockReq = {
      method: 'POST',
      body: testBody
    };

    let responseData = null;
    let statusCode = null;

    const mockRes = {
      setHeader: () => {},
      status: (code) => {
        statusCode = code;
        return mockRes;
      },
      json: (data) => {
        responseData = data;
        return mockRes;
      },
      end: () => {}
    };

    // API 핸들러 호출
    console.log('=== API 호출 중... ===');
    await handler(mockReq, mockRes);

    console.log('\n=== 응답 ===');
    console.log(`Status: ${statusCode}`);
    console.log(JSON.stringify(responseData, null, 2));

    if (statusCode === 201 && responseData && responseData.success) {
      console.log('\n✅ 이벤트 예약 생성 성공!');
      console.log(`예약번호: ${responseData.data.booking_number}`);
      console.log(`이벤트명: ${responseData.data.event_name}`);
      console.log(`이벤트날짜: ${responseData.data.event_date}`);
      console.log(`티켓종류: ${responseData.data.ticket_type}`);
      console.log(`티켓수량: ${responseData.data.num_tickets}장`);
      console.log(`총금액: ${responseData.data.total_amount}원`);

      // DB에서 예약 확인
      const { connect } = require('@planetscale/database');
      const connection = connect({ url: process.env.DATABASE_URL });

      const bookingResult = await connection.execute(
        `SELECT
          booking_number,
          listing_id,
          user_id,
          start_date,
          num_adults,
          num_children,
          total_amount,
          status,
          payment_status,
          customer_info
         FROM bookings
         WHERE booking_number = ?`,
        [responseData.data.booking_number]
      );

      if (bookingResult.rows && bookingResult.rows.length > 0) {
        const booking = bookingResult.rows[0];
        console.log('\n=== DB 확인 ===');
        console.log(`✅ bookings 테이블에 예약 존재`);
        console.log(`   listing_id: ${booking.listing_id}`);
        console.log(`   user_id: ${booking.user_id}`);
        console.log(`   start_date: ${booking.start_date}`);
        console.log(`   티켓: ${booking.num_adults}장`);
        console.log(`   금액: ${booking.total_amount}원`);
        console.log(`   상태: ${booking.status} / ${booking.payment_status}`);

        // customer_info 확인
        try {
          const customerInfo = JSON.parse(booking.customer_info);
          console.log(`   티켓종류: ${customerInfo.ticket_type}`);
          console.log(`   티켓수량: ${customerInfo.num_tickets}장`);
          console.log(`   이벤트타입: ${customerInfo.event_type || 'N/A'}`);
          console.log(`   장소: ${customerInfo.venue_info || 'N/A'}`);
        } catch (e) {
          console.log('   customer_info 파싱 실패');
        }

        console.log('\n✅ P0-3 (events/book.js) 테스트 성공!');
        console.log('다음 단계: 전체 카테고리 결제 플로우 최종 검증');
      } else {
        console.log('\n❌ DB에서 예약을 찾을 수 없습니다.');
      }
    } else {
      console.log('\n❌ 이벤트 예약 생성 실패');
      console.log('에러:', responseData.error || '알 수 없는 오류');
    }

  } catch (error) {
    console.error('\n❌ 테스트 오류:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
