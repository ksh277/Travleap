const https = require('https');

console.log('=== Frontend Parsing Logic Analysis ===\n');

https.get('https://travleap.vercel.app/api/orders', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const result = JSON.parse(data);

    console.log('1️⃣ API Response Structure:');
    console.log('   - Has "data" field:', 'data' in result, '(value:', result.data, ')');
    console.log('   - Has "orders" field:', 'orders' in result);
    console.log('   - success:', result.success);
    console.log('   - version:', result.version);
    console.log('');

    // AdminOrders.tsx logic: result.data || result.orders || []
    const ordersFromAdminOrders = result.data || result.orders || [];
    console.log('2️⃣ AdminOrders.tsx Logic (result.data || result.orders || []):');
    console.log('   - result.data:', result.data);
    console.log('   - result.data is undefined?', result.data === undefined);
    console.log('   - result.data is null?', result.data === null);
    console.log('   - result.data is empty array?', Array.isArray(result.data) && result.data.length === 0);
    console.log('   - Final orders count:', ordersFromAdminOrders.length);
    console.log('');

    // useAdminData.ts logic: ordersRes.orders || []
    const ordersFromUseAdminData = result.orders || [];
    console.log('3️⃣ useAdminData.ts Logic (ordersRes.orders || []):');
    console.log('   - result.orders:', Array.isArray(result.orders) ? `Array(${result.orders.length})` : result.orders);
    console.log('   - Final orders count:', ordersFromUseAdminData.length);
    console.log('');

    console.log('4️⃣ Potential Issue Detection:');
    if (result.data !== undefined && result.data !== null) {
      console.log('   ⚠️ WARNING: result.data exists and is not undefined/null!');
      console.log('   - If result.data is truthy but empty, AdminOrders will get [] instead of result.orders');
      console.log('   - result.data value:', JSON.stringify(result.data));
    } else {
      console.log('   ✅ result.data is undefined/null, so AdminOrders should get result.orders');
    }
    console.log('');

    console.log('5️⃣ Orders Count Comparison:');
    console.log('   - AdminOrders logic result:', ordersFromAdminOrders.length, 'orders');
    console.log('   - useAdminData logic result:', ordersFromUseAdminData.length, 'orders');
    console.log('   - Are they equal?', ordersFromAdminOrders.length === ordersFromUseAdminData.length ? 'YES ✅' : 'NO ❌');
    console.log('');

    console.log('6️⃣ Sample Order Data (first 2):');
    const orders = result.orders || [];
    if (orders.length > 0) {
      orders.slice(0, 2).forEach((o, i) => {
        console.log(`   Order ${i + 1}:`);
        console.log(`     - id: ${o.id} (${typeof o.id})`);
        console.log(`     - category: ${o.category}`);
        console.log(`     - booking_number: ${o.booking_number}`);
        console.log(`     - order_number: ${o.order_number}`);
        console.log(`     - user_name: "${o.user_name}"`);
        console.log(`     - user_email: "${o.user_email}"`);
        console.log(`     - product_title: "${o.product_title}"`);
        const key = `${o.id}-${o.category}-${o.booking_number || o.order_number}`;
        console.log(`     - React key: "${key}"`);
        console.log('');
      });
    }
  });
}).on('error', err => console.error('Error:', err));
