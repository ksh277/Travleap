const https = require('https');

https.get('https://travleap.vercel.app/api/orders', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);
    const orders = result.data || result.orders || [];

    console.log('=== React Key Analysis ===');
    console.log('Total orders:', orders.length);
    console.log('');

    // Generate keys like AdminOrders.tsx does
    const keyMap = new Map();

    orders.forEach((order, index) => {
      const key = `${order.id}-${order.category}-${order.booking_number || order.order_number}`;

      if (!keyMap.has(key)) {
        keyMap.set(key, []);
      }
      keyMap.get(key).push({
        index,
        id: order.id,
        category: order.category,
        booking_number: order.booking_number,
        order_number: order.order_number,
        product: order.product_title || order.product_name,
        amount: order.amount
      });
    });

    console.log('=== Unique Keys vs Total Orders ===');
    console.log(`Unique keys: ${keyMap.size}`);
    console.log(`Total orders: ${orders.length}`);
    console.log(`Missing orders: ${orders.length - keyMap.size}`);
    console.log('');

    // Find duplicate keys
    const duplicateKeys = [...keyMap.entries()].filter(([key, orders]) => orders.length > 1);

    if (duplicateKeys.length > 0) {
      console.log('🚨 DUPLICATE KEYS FOUND:');
      console.log('');

      duplicateKeys.forEach(([key, orders]) => {
        console.log(`Key: "${key}" (${orders.length} orders)`);
        orders.forEach(o => {
          console.log(`  - Order #${o.id}: ${o.product}, ${o.amount}원`);
        });
        console.log('');
      });
    } else {
      console.log('✅ No duplicate keys found');
    }

    // Check for null/undefined values
    console.log('\n=== Null/Undefined Value Check ===');
    const nullCategories = orders.filter(o => !o.category);
    const nullBothNumbers = orders.filter(o => !o.booking_number && !o.order_number);

    console.log(`Orders with null/undefined category: ${nullCategories.length}`);
    console.log(`Orders with null/undefined booking_number AND order_number: ${nullBothNumbers.length}`);

    if (nullBothNumbers.length > 0) {
      console.log('\n⚠️ Orders with missing identifiers:');
      nullBothNumbers.forEach(o => {
        console.log(`  - ID ${o.id}: category="${o.category}", booking_number="${o.booking_number}", order_number="${o.order_number}"`);
      });
    }
  });
}).on('error', err => console.error('Error:', err));
