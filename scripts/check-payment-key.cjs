require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkPaymentKey() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    const orderNumber = 'ORDER_1761922261162_7787';

    console.log(`🔍 주문 ${orderNumber}의 상세 정보 확인...\n`);

    const result = await connection.execute(`
      SELECT
        id,
        user_id,
        amount,
        payment_status,
        payment_method,
        payment_key,
        gateway_transaction_id,
        notes,
        created_at,
        updated_at
      FROM payments
      WHERE gateway_transaction_id = ?
    `, [orderNumber]);

    if (!result.rows || result.rows.length === 0) {
      console.error(`❌ 주문을 찾을 수 없습니다.`);
      return;
    }

    for (const payment of result.rows) {
      console.log(`📦 Payment ID: ${payment.id}`);
      console.log(`👤 User ID: ${payment.user_id}`);
      console.log(`💰 Amount: ${payment.amount}원`);
      console.log(`📊 Payment Status: ${payment.payment_status}`);
      console.log(`💳 Payment Method: ${payment.payment_method || '없음'}`);
      console.log(`🔑 Payment Key: ${payment.payment_key || '❌ 없음 - confirm API 호출 안 됨!'}`);
      console.log(`🆔 Gateway Transaction ID: ${payment.gateway_transaction_id}`);
      console.log(`📅 Created At: ${payment.created_at}`);
      console.log(`📅 Updated At: ${payment.updated_at}`);

      if (payment.notes) {
        try {
          const notes = JSON.parse(payment.notes);
          console.log(`📝 Notes:`);
          console.log(`   - Category: ${notes.category || '없음'}`);
          console.log(`   - Subtotal: ${notes.subtotal || 0}원`);
          console.log(`   - Delivery Fee: ${notes.deliveryFee || 0}원`);
          console.log(`   - Coupon Discount: ${notes.couponDiscount || 0}원`);
          console.log(`   - Points Used: ${notes.pointsUsed || 0}P`);
          console.log(`   - Items: ${notes.items?.length || 0}개`);
        } catch (e) {
          console.log(`📝 Notes: (파싱 실패)`);
        }
      }

      console.log('');

      // payment_key가 없으면 confirm API가 호출되지 않은 것
      if (!payment.payment_key) {
        console.log(`❌❌❌ 심각한 문제 발견!`);
        console.log(`payment_key가 없습니다. 이것은 /api/payments/confirm API가 호출되지 않았다는 의미입니다.`);
        console.log(`\n가능한 원인:`);
        console.log(`1. PaymentWidget에서 성공 페이지로 리다이렉트 되지 않음`);
        console.log(`2. 성공 페이지에서 confirm API 호출 실패`);
        console.log(`3. confirm API 호출 중 에러 발생`);
        console.log(`\n해결 방법:`);
        console.log(`1. PaymentSuccessPage2.tsx 로직 확인`);
        console.log(`2. 브라우저 콘솔 로그 확인`);
        console.log(`3. 서버 로그에서 confirm API 호출 여부 확인\n`);
      } else {
        console.log(`✅ payment_key가 있습니다. confirm API가 호출되었습니다.`);
        console.log(`\n포인트 적립이 안 된 이유:`);
        console.log(`confirm API는 호출되었으나, 포인트 적립 로직에서 에러가 발생했을 가능성이 높습니다.`);
        console.log(`서버 로그를 확인하여 "[포인트]" 키워드로 검색해보세요.\n`);
      }
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

checkPaymentKey();
