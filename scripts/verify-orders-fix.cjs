const https = require('https');

https.get('https://travleap.vercel.app/api/orders', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    const orders = result.data || result.orders || [];

    console.log('=== API Response Info ===');
    console.log('Deployed At:', result.deployedAt);
    console.log('Version:', result.version);
    console.log('\n=== Order Count ===');
    console.log('Total orders:', orders.length);

    if (orders.length > 0) {
      console.log('\n=== Type Check (First 3 orders) ===');
      orders.slice(0, 3).forEach((o, i) => {
        console.log(`Order ${i+1}: id=${o.id}(${typeof o.id}), amount=${o.amount}(${typeof o.amount}), category=${o.category}`);
      });

      console.log('\n=== React Rendering Validation ===');
      const allValidTypes = orders.every(o =>
        typeof o.id === 'number' &&
        typeof o.amount === 'number'
      );
      console.log('All orders have correct types?', allValidTypes ? 'YES' : 'NO');

      // Check for null IDs
      const nullIds = orders.filter(o => o.id === null || o.id === undefined);
      if (nullIds.length > 0) {
        console.log('\nWARNING: Found', nullIds.length, 'orders with null ID:');
        nullIds.forEach(o => {
          console.log(`  - category=${o.category}, booking_id=${o.booking_id}, amount=${o.amount}`);
        });
      }

      // Rentcar orders check
      const rentcarOrders = orders.filter(o => o.category === '렌트카');
      console.log('\n=== Rentcar Orders ===');
      console.log('Count:', rentcarOrders.length);
      rentcarOrders.forEach((o, i) => {
        console.log(`  ${i+1}. id=${o.id}, booking_id=${o.booking_id}, product=${o.product_title}, amount=${o.amount}`);
      });

      // Popup orders check
      const popupOrders = orders.filter(o => o.category === '팝업');
      console.log('\n=== Popup Orders ===');
      console.log('Count:', popupOrders.length);
    }
  });
}).on('error', err => console.error('Error:', err));
