const https = require('https');

https.get('https://travleap.vercel.app/api/orders', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    const orders = result.orders || [];

    console.log('📊 주문번호 분석\n');

    const withOrderNum = orders.filter(o => o.order_number || o.booking_number);
    const withoutOrderNum = orders.filter(o => !o.order_number && !o.booking_number);

    console.log(`✅ 주문번호 있음: ${withOrderNum.length}개`);
    console.log(`❌ 주문번호 없음: ${withoutOrderNum.length}개\n`);

    if (withoutOrderNum.length > 0) {
      console.log('❌ 주문번호 없는 항목들:');
      withoutOrderNum.forEach(o => {
        console.log(`  - ID ${o.id}: ${o.product_title}, ₩${o.amount}, ${o.payment_status}, ${o.created_at}`);
        console.log(`    category: ${o.category}`);
        console.log(`    booking_id: ${o.booking_id}`);
        console.log('');
      });

      console.log('\n💡 원인 분석:');
      console.log('payments 테이블의 gateway_transaction_id가 NULL인 경우');
      console.log('→ 결제 승인 전 생성된 주문 또는 데이터 누락\n');

      console.log('🔧 해결 방법:');
      console.log('1. payments.id를 주문번호로 표시 (예: ORD-71)');
      console.log('2. 또는 기존 주문에 UUID 주문번호 생성');
    }
  });
}).on('error', err => console.error('Error:', err));
