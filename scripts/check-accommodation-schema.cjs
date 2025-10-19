require('dotenv').config();
const { connect } = require('@planetscale/database');

async function checkAccommodationSchema() {
  const connection = connect({ url: process.env.DATABASE_URL });

  try {
    console.log('\n=== accommodation_partners 테이블 구조 ===');
    const partnerSchema = await connection.execute('DESCRIBE accommodation_partners');
    console.log('Columns:', partnerSchema.rows.map(r => r.Field).join(', '));

    console.log('\n=== accommodation_rooms 테이블 구조 ===');
    const roomSchema = await connection.execute('DESCRIBE accommodation_rooms');
    console.log('Columns:', roomSchema.rows.map(r => r.Field).join(', '));

    console.log('\n=== 샘플 partner 데이터 (ID=1) ===');
    const partnerData = await connection.execute('SELECT * FROM accommodation_partners WHERE id = 1 LIMIT 1');
    if (partnerData.rows.length > 0) {
      console.log(JSON.stringify(partnerData.rows[0], null, 2));
    }

    console.log('\n=== 샘플 room 데이터 (첫 1개) ===');
    const roomData = await connection.execute('SELECT * FROM accommodation_rooms LIMIT 1');
    if (roomData.rows.length > 0) {
      console.log(JSON.stringify(roomData.rows[0], null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkAccommodationSchema();
