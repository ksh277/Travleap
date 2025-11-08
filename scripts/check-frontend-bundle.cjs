const https = require('https');

console.log('=== Frontend Bundle Check ===\n');

// Check if Vercel is serving the latest bundle
https.get('https://travleap.vercel.app/', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Extract JavaScript bundle hash from HTML
    const jsMatch = data.match(/\/assets\/index-([a-zA-Z0-9]+)\.js/);

    if (jsMatch) {
      const bundleHash = jsMatch[1];
      console.log('Current bundle hash:', bundleHash);
      console.log('Expected hash: DvIlc0tQ (from local build)');
      console.log('Match:', bundleHash === 'DvIlc0tQ' ? '✅ YES - Latest build deployed' : '❌ NO - Old build still deployed');
      console.log('');
      console.log('Full script tag:', jsMatch[0]);
    } else {
      console.log('❌ Could not find JavaScript bundle in HTML');
    }

    // Check if HTML contains admin routes
    const hasAdminRoute = data.includes('admin') || data.includes('AdminOrders');
    console.log('\nHTML contains admin code:', hasAdminRoute ? '✅ YES' : '❌ NO (SPA - routes in JS)');
  });
}).on('error', err => console.error('Error:', err));
