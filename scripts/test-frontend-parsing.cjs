// 프론트엔드 파싱 시뮬레이션
require('dotenv').config();
const https = require('https');

https.get('https://travleap.vercel.app/api/orders', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('=== API 응답 분석 ===');
      console.log('Keys:', Object.keys(result));
      console.log('success:', result.success);
      console.log('Has orders field:', !!result.orders);
      console.log('Has data field:', !!result.data);

      // AdminOrders.tsx 로직 시뮬레이션
      const orders = result.data || result.orders || [];
      console.log('\n=== 프론트엔드 파싱 결과 ===');
      console.log('Parsed orders count:', orders.length);

      if (orders.length > 0) {
        console.log('\n첫 번째 주문:');
        console.log('  - id:', orders[0].id);
        console.log('  - product_name:', orders[0].product_name);
        console.log('  - amount:', orders[0].amount);
      } else {
        console.log('\n⚠️ 주문 배열이 비어있습니다!');
        console.log('result.data:', result.data);
        console.log('result.orders type:', typeof result.orders);
      }
    } catch (e) {
      console.error('JSON 파싱 실패:', e);
    }
  });
}).on('error', err => console.error('요청 실패:', err));
