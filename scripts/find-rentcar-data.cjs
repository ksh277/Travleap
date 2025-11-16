const { connect } = require('@planetscale/database');
require('dotenv').config();

async function findRentcarData() {
  const conn = connect({ url: process.env.DATABASE_URL });

  console.log('\n=== 렌트카 데이터 찾기 ===\n');

  try {
    // 1. 렌트카 리스팅 조회
    console.log('1. 렌트카 리스팅 조회...');
    const listings = await conn.execute(`
      SELECT id, title, partner_id, price_from
      FROM listings
      WHERE category = 'rentcar'
      LIMIT 5
    `);

    if (listings.rows && listings.rows.length > 0) {
      console.log(`   ✅ 렌트카 리스팅 ${listings.rows.length}건 발견:\n`);
      listings.rows.forEach((l, i) => {
        const price = l.price_from ? l.price_from.toLocaleString() : '0';
        console.log(`   ${i+1}. ID ${l.id}: ${l.title}`);
        console.log(`      파트너 ID: ${l.partner_id}, 가격: ${price}원\n`);
      });

      const ids = listings.rows.map(l => l.id);

      // 2. 해당 리스팅의 예약 조회
      console.log('2. 렌트카 예약 조회...');
      const bookings = await conn.execute(`
        SELECT id, booking_number, status, payment_status, total_amount, customer_info
        FROM bookings
        WHERE listing_id IN (${ids.join(',')})
        ORDER BY created_at DESC
        LIMIT 5
      `);

      if (bookings.rows && bookings.rows.length > 0) {
        console.log(`   ✅ 렌트카 예약 ${bookings.rows.length}건 발견:\n`);
        bookings.rows.forEach((b, i) => {
          console.log(`   ${i+1}. 예약번호: ${b.booking_number}`);
          console.log(`      상태: ${b.status} / 결제: ${b.payment_status}`);
          console.log(`      금액: ${b.total_amount ? b.total_amount.toLocaleString() : '0'}원`);

          if (b.customer_info) {
            const custInfo = typeof b.customer_info === 'string' ? JSON.parse(b.customer_info) : b.customer_info;
            console.log(`      고객정보 키:`, Object.keys(custInfo));
          }
          console.log('');
        });
      } else {
        console.log('   ⚠️  렌트카 예약 없음\n');
      }

      // 3. 파트너 정보 조회
      console.log('3. 파트너 정보 조회...');
      const partnerIds = [...new Set(listings.rows.map(l => l.partner_id))];

      const partners = await conn.execute(`
        SELECT id, business_name, email, phone
        FROM partners
        WHERE id IN (${partnerIds.join(',')})
        LIMIT 5
      `);

      if (partners.rows && partners.rows.length > 0) {
        console.log(`   ✅ 파트너 ${partners.rows.length}명 발견:\n`);
        partners.rows.forEach((p, i) => {
          console.log(`   ${i+1}. ID ${p.id}: ${p.business_name || '이름 없음'}`);
          console.log(`      이메일: ${p.email || '-'}, 전화: ${p.phone || '-'}\n`);
        });
      } else {
        console.log('   ⚠️  파트너 정보 없음\n');
      }

    } else {
      console.log('   ⚠️  렌트카 리스팅 없음\n');
      console.log('   (벤더가 아직 렌트카 상품을 등록하지 않았을 수 있습니다)\n');
    }

  } catch (error) {
    console.error('❌ 오류:', error.message);
  }
}

findRentcarData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
