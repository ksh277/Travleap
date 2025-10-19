require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkStructure() {
  const connection = connect({ url: process.env.DATABASE_URL });

  console.log('Checking data structure:\n');

  // Check lodgings table
  console.log('1. lodgings table:');
  try {
    const lodgings = await connection.execute('SELECT COUNT(*) as count FROM lodgings WHERE is_active = 1');
    console.log('   Active lodgings: ' + lodgings.rows[0].count);
    
    const sample = await connection.execute('SELECT id, name, vendor_id FROM lodgings LIMIT 3');
    sample.rows.forEach(row => {
      console.log('   - [' + row.id + '] ' + row.name + ' (vendor: ' + row.vendor_id + ')');
    });
  } catch (error) {
    console.log('   ERROR: ' + error.message);
  }

  // Check rooms table
  console.log('\n2. rooms table:');
  try {
    const rooms = await connection.execute('SELECT COUNT(*) as count FROM rooms WHERE is_active = 1');
    console.log('   Active rooms: ' + rooms.rows[0].count);
    
    const sample = await connection.execute('SELECT id, name, lodging_id FROM rooms LIMIT 3');
    sample.rows.forEach(row => {
      console.log('   - [' + row.id + '] ' + row.name + ' (lodging: ' + row.lodging_id + ')');
    });
  } catch (error) {
    console.log('   ERROR: ' + error.message);
  }

  // Check listings with stay category
  console.log('\n3. listings table (stay category):');
  try {
    const categoryResult = await connection.execute('SELECT id FROM categories WHERE slug = ?', ['stay']);
    const categoryId = categoryResult.rows[0].id;
    
    const listings = await connection.execute('SELECT COUNT(*) as count FROM listings WHERE category_id = ? AND is_active = 1', [categoryId]);
    console.log('   Active stay listings: ' + listings.rows[0].count);
    
    const sample = await connection.execute('SELECT id, title, partner_id FROM listings WHERE category_id = ? LIMIT 3', [categoryId]);
    sample.rows.forEach(row => {
      console.log('   - [' + row.id + '] ' + row.title + ' (partner: ' + row.partner_id + ')');
    });
  } catch (error) {
    console.log('   ERROR: ' + error.message);
  }

  console.log('\n\nConclusion:');
  console.log('We have TWO different data structures:');
  console.log('1. lodgings + rooms (PMS-style structure)');
  console.log('2. listings with category=stay (simple structure)');
  console.log('\nWhich one should AccommodationManagement use?');
}

checkStructure().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
