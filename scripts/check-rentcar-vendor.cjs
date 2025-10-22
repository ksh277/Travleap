const { connect } = require('@planetscale/database');
const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

async function checkRentcarVendor() {
  console.log('🔍 rentcar@vendor.com 계정 찾기...\n');

  // 1. Neon DB 확인
  try {
    const sql = neon(process.env.POSTGRES_DATABASE_URL);
    const neonUser = await sql`SELECT id, email, name, role FROM users WHERE email = 'rentcar@vendor.com'`;
    
    if (neonUser.length > 0) {
      console.log('✅ Neon DB users:');
      console.log(`   ID: ${neonUser[0].id}, Email: ${neonUser[0].email}, Role: ${neonUser[0].role}\n`);
    } else {
      console.log('❌ Neon DB users: 없음\n');
    }
  } catch (e) {
    console.log('❌ Neon DB 조회 실패:', e.message, '\n');
  }

  // 2. PlanetScale DB 확인
  try {
    const conn = connect({ url: process.env.DATABASE_URL });
    const psUser = await conn.execute('SELECT id, email, name, role FROM users WHERE email = ?', ['rentcar@vendor.com']);
    
    if (psUser.rows.length > 0) {
      console.log('✅ PlanetScale DB users:');
      console.log(`   ID: ${psUser.rows[0].id}, Email: ${psUser.rows[0].email}, Role: ${psUser.rows[0].role}\n`);
    } else {
      console.log('❌ PlanetScale DB users: 없음\n');
    }
  } catch (e) {
    console.log('❌ PlanetScale DB 조회 실패:', e.message, '\n');
  }

  // 3. PlanetScale rentcar_vendors 확인
  try {
    const conn = connect({ url: process.env.DATABASE_URL });
    const vendor = await conn.execute('SELECT id, business_name, contact_email, vendor_code, status FROM rentcar_vendors WHERE contact_email = ?', ['rentcar@vendor.com']);
    
    if (vendor.rows.length > 0) {
      console.log('✅ PlanetScale DB rentcar_vendors:');
      console.log(`   ID: ${vendor.rows[0].id}`);
      console.log(`   업체명: ${vendor.rows[0].business_name}`);
      console.log(`   이메일: ${vendor.rows[0].contact_email}`);
      console.log(`   코드: ${vendor.rows[0].vendor_code}`);
      console.log(`   상태: ${vendor.rows[0].status}\n`);
    } else {
      console.log('❌ PlanetScale DB rentcar_vendors: 없음\n');
    }
  } catch (e) {
    console.log('❌ PlanetScale rentcar_vendors 조회 실패:', e.message, '\n');
  }
}

checkRentcarVendor().then(() => process.exit(0));
