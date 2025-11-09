/**
 * Toss Payments Secret Key 유효성 테스트
 */

const TOSS_SECRET_KEY = 'test_sk_Z1aOwX7K8mynBGZ74vR08yQxzvNP';

async function testTossKey() {
  try {
    console.log('🔑 Toss Payments Secret Key 테스트 시작...\n');
    console.log('테스트 키:', TOSS_SECRET_KEY);

    // Toss Payments API로 간단한 요청 (잘못된 paymentKey로 의도적 실패 유도)
    const testPaymentKey = 'test_payment_key_invalid';
    const authHeader = Buffer.from(TOSS_SECRET_KEY + ':').toString('base64');

    console.log('\n📡 Toss API 호출 중...\n');

    const response = await fetch(`https://api.tosspayments.com/v1/payments/${testPaymentKey}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    console.log('응답 상태:', response.status);
    console.log('응답 내용:', JSON.stringify(result, null, 2));

    // 키가 유효하면 404 (결제 없음) 또는 400 (잘못된 요청)
    // 키가 무효하면 401 (인증 실패)
    if (response.status === 401) {
      console.log('\n❌ Secret Key가 유효하지 않습니다!');
      console.log('에러:', result.message);
      return false;
    } else if (response.status === 404 || response.status === 400) {
      console.log('\n✅ Secret Key가 유효합니다! (예상된 404/400 응답)');
      return true;
    } else {
      console.log('\n⚠️ 예상하지 못한 응답:', response.status);
      return false;
    }

  } catch (error) {
    console.error('❌ 테스트 실패:', error.message);
    return false;
  }
}

testTossKey();
