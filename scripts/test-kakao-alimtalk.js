/**
 * 카카오 알림톡 테스트 스크립트
 *
 * 사용법:
 *   node scripts/test-kakao-alimtalk.js
 *
 * 환경 변수 확인:
 *   VITE_KAKAO_ALIMTALK_API_KEY
 *   VITE_KAKAO_SENDER_KEY
 *   VITE_KAKAO_BIZ_USER_ID
 */

require('dotenv').config();

// 테스트 데이터
const testBooking = {
  order_number: 'TEST-' + Date.now(),
  product_name: '제주 신라호텔 디럭스룸',
  partner_name: '제주 신라호텔',
  partner_phone: '01012345678', // 테스트용 전화번호로 변경
  customer_name: '홍길동',
  customer_phone: '01087654321',
  start_date: '2025-11-10',
  end_date: '2025-11-12',
  num_adults: 2,
  num_children: 0,
  total_amount: 350000
};

async function testKakaoAlimtalk() {
  console.log('🧪 카카오 알림톡 테스트 시작...\n');

  // 1. 환경 변수 확인
  console.log('📋 환경 변수 확인:');
  console.log(`  VITE_KAKAO_ALIMTALK_API_KEY: ${process.env.VITE_KAKAO_ALIMTALK_API_KEY ? '✅ 설정됨' : '❌ 미설정'}`);
  console.log(`  VITE_KAKAO_SENDER_KEY: ${process.env.VITE_KAKAO_SENDER_KEY ? '✅ 설정됨' : '❌ 미설정'}`);
  console.log(`  VITE_KAKAO_BIZ_USER_ID: ${process.env.VITE_KAKAO_BIZ_USER_ID ? '✅ 설정됨' : '❌ 미설정'}\n`);

  if (!process.env.VITE_KAKAO_ALIMTALK_API_KEY) {
    console.log('⚠️  환경 변수가 설정되지 않았습니다.');
    console.log('   .env 파일에 VITE_KAKAO_ALIMTALK_API_KEY를 추가하세요.');
    console.log('   가이드: KAKAO_ALIMTALK_SETUP.md 참고\n');
    console.log('📱 개발 모드로 테스트 메시지 출력:\n');
    printTestMessage(testBooking);
    return;
  }

  // 2. API 호출 테스트
  try {
    console.log('📱 알림톡 발송 시도...');
    console.log(`  수신자: ${testBooking.partner_phone}`);
    console.log(`  주문번호: ${testBooking.order_number}\n`);

    const message = generateMessage(testBooking);

    // 실제 API 호출 (카카오 공식 엔드포인트는 실제 발급받은 정보에 따라 다를 수 있음)
    const response = await fetch('https://alimtalk-api.bizmsg.kr/v2/sender/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'userid': process.env.VITE_KAKAO_BIZ_USER_ID || '',
        'Authorization': `Bearer ${process.env.VITE_KAKAO_ALIMTALK_API_KEY}`
      },
      body: JSON.stringify({
        senderkey: process.env.VITE_KAKAO_SENDER_KEY,
        tpl_code: 'new_booking_partner', // 템플릿 코드 (실제 등록한 코드로 변경)
        receiver: testBooking.partner_phone.replace(/-/g, ''),
        recvname: testBooking.partner_name,
        message: message
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ 알림톡 발송 성공!');
      console.log('   응답:', JSON.stringify(result, null, 2));
    } else {
      const error = await response.json();
      console.error('❌ 알림톡 발송 실패:');
      console.error('   상태:', response.status, response.statusText);
      console.error('   오류:', JSON.stringify(error, null, 2));

      // 일반적인 오류 가이드
      if (response.status === 401) {
        console.log('\n💡 해결 방법:');
        console.log('   - API 키가 올바른지 확인하세요');
        console.log('   - Bearer 토큰 형식이 맞는지 확인하세요');
      } else if (response.status === 404) {
        console.log('\n💡 해결 방법:');
        console.log('   - 템플릿 코드(tpl_code)가 올바른지 확인하세요');
        console.log('   - 비즈메시지 관리자 센터에서 템플릿이 승인되었는지 확인하세요');
      }
    }

  } catch (error) {
    console.error('❌ 네트워크 오류:', error.message);
    console.log('\n💡 해결 방법:');
    console.log('   - 인터넷 연결을 확인하세요');
    console.log('   - API 엔드포인트 URL이 올바른지 확인하세요');
  }
}

function generateMessage(booking) {
  return `[Travleap] 새 예약 접수

📋 주문번호: ${booking.order_number}
🏨 상품: ${booking.product_name}
📅 날짜: ${booking.start_date}${booking.end_date && booking.end_date !== booking.start_date ? ` ~ ${booking.end_date}` : ''}
👤 예약자: ${booking.customer_name}
📞 연락처: ${booking.customer_phone}
👥 인원: 성인 ${booking.num_adults}명${booking.num_children > 0 ? `, 아동 ${booking.num_children}명` : ''}
💰 금액: ${booking.total_amount.toLocaleString()}원

파트너 대시보드에서 예약을 확정해주세요.
${process.env.VITE_APP_URL || 'https://travleap.vercel.app'}/partner/orders`;
}

function printTestMessage(booking) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📱 알림톡 메시지 미리보기:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(generateMessage(booking));
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

// 스크립트 실행
testKakaoAlimtalk().then(() => {
  console.log('✅ 테스트 완료\n');
}).catch((error) => {
  console.error('❌ 테스트 실패:', error);
  process.exit(1);
});
