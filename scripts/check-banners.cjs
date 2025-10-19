require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkBanners() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('Checking home_banners table:\n');

  try {
    const result = await connection.execute('SELECT * FROM home_banners WHERE is_active = 1 ORDER BY display_order ASC');
    
    console.log('Found ' + result.rows.length + ' active banners:');
    result.rows.forEach(banner => {
      console.log('   - [' + banner.id + '] ' + (banner.title || 'No title'));
      console.log('     Image: ' + (banner.image_url || 'No image'));
      console.log('     Link: ' + (banner.link_url || 'No link'));
      console.log('     Order: ' + banner.display_order);
      console.log('');
    });
  } catch (error) {
    console.log('ERROR: ' + error.message);
  }
}

checkBanners().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
