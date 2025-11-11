/**
 * 투어 예약 API 자동 테스트
 * (핸들러 직접 호출)
 */
require('dotenv').config();

(async () => {
  try {
    const handler = require('../api/tour/book.js');

    console.log('📊 투어 예약 API 자동 테스트 시작...\n');

    // 테스트 요청 데이터
    const testBody = {
      listing_id: '356',  // 경복궁 가이드 투어
      user_email: 'tourtest@example.com',
      user_name: '투어테스트',
      user_phone: '010-9999-8888',
      tour_date: '2025-11-20',  // 미래 날짜
      participants: [
        { name: '성인1', age: 35, passport: 'M11111111' },
        { name: '어린이1', age: 8, passport: 'M22222222' }
      ],
      adult_count: 1,
      child_count: 1,
      infant_count: 0,
      price_adult: 30000,
      price_child: 21000,
      price_infant: 0,
      special_requests: '오후 2시 미팅 희망',
      total_amount: 51000
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
      console.log('\n✅ 투어 예약 생성 성공!');
      console.log(`예약번호: ${responseData.data.booking_number}`);
      console.log(`바우처: ${responseData.data.voucher_code}`);
      console.log(`투어명: ${responseData.data.tour_name}`);
      console.log(`투어날짜: ${responseData.data.tour_date}`);
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
        console.log(`   성인: ${booking.num_adults}, 어린이: ${booking.num_children}`);
        console.log(`   금액: ${booking.total_amount}원`);
        console.log(`   상태: ${booking.status} / ${booking.payment_status}`);

        // customer_info 확인
        try {
          const customerInfo = JSON.parse(booking.customer_info);
          console.log(`   바우처: ${customerInfo.voucher_code}`);
          console.log(`   QR 코드: ${customerInfo.qr_code ? '생성됨' : '없음'}`);
          console.log(`   참가자: ${customerInfo.participants ? customerInfo.participants.length + '명' : '정보 없음'}`);
        } catch (e) {
          console.log('   customer_info 파싱 실패');
        }

        console.log('\n✅ P0-2 (tour/book.js) 테스트 성공!');
        console.log('다음 단계: P0-3 (events/book.js 생성)');
      } else {
        console.log('\n❌ DB에서 예약을 찾을 수 없습니다.');
      }
    } else {
      console.log('\n❌ 투어 예약 생성 실패');
      console.log('에러:', responseData.error || '알 수 없는 오류');
    }

  } catch (error) {
    console.error('\n❌ 테스트 오류:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
