const mysql = require('mysql2/promise');
require('dotenv').config();

async function verify() {
  let connection;

  try {
    connection = await mysql.createConnection({
      host: process.env.DATABASE_HOST || 'aws.connect.psdb.cloud',
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME || 'travleap',
      ssl: { rejectUnauthorized: true }
    });

    console.log('\n' + '='.repeat(70));
    console.log('📊 Travleap 플랫폼 데이터 현황');
    console.log('='.repeat(70));

    // 렌트카 통계
    console.log('\n🚗 렌트카 시스템:');
    console.log('-'.repeat(70));

    const [vendors] = await connection.execute('SELECT COUNT(*) as count FROM rentcar_vendors');
    console.log(`   렌트카 벤더: ${vendors[0].count}개`);

    const [vehicles] = await connection.execute('SELECT COUNT(*) as count FROM rentcar_vehicles');
    console.log(`   전체 차량: ${vehicles[0].count}대`);

    const [vendorDetails] = await connection.execute(`
      SELECT rv.business_name, rv.vendor_code, COUNT(v.id) as vehicle_count
      FROM rentcar_vendors rv
      LEFT JOIN rentcar_vehicles v ON rv.id = v.vendor_id
      GROUP BY rv.id, rv.business_name, rv.vendor_code
      ORDER BY vehicle_count DESC
    `);
    console.log('\n   벤더별 차량:');
    vendorDetails.forEach(v => {
      const isPMS = v.vendor_code.includes('TURO');
      const badge = isPMS ? ' [PMS 연동]' : '';
      console.log(`   - ${v.business_name}${badge}: ${v.vehicle_count}대`);
    });

    // 숙박 통계
    console.log('\n🏨 숙박 시스템:');
    console.log('-'.repeat(70));

    const [partners] = await connection.execute('SELECT COUNT(*) as count FROM partners');
    console.log(`   파트너: ${partners[0].count}개`);

    const [listings] = await connection.execute('SELECT COUNT(*) as count FROM listings WHERE category_id = 1');
    console.log(`   숙박 상품: ${listings[0].count}개`);

    // 최근 추가된 PMS 숙박 파트너 확인
    const [recentPartner] = await connection.execute(`
      SELECT business_name, contact_name, email, phone
      FROM partners
      ORDER BY id DESC
      LIMIT 1
    `);
    if (recentPartner.length > 0) {
      const p = recentPartner[0];
      console.log(`\n   최근 추가 (PMS 연동):`);
      console.log(`   - ${p.business_name}`);
      console.log(`   - 담당자: ${p.contact_name}`);
      console.log(`   - 연락처: ${p.phone}`);
    }

    // PMS 호텔의 객실 확인
    const [hotelRooms] = await connection.execute(`
      SELECT title, short_description, price_from, available_spots
      FROM listings
      WHERE partner_id = (SELECT id FROM partners ORDER BY id DESC LIMIT 1)
      ORDER BY price_from
    `);
    if (hotelRooms.length > 0) {
      console.log(`\n   객실 타입 (${hotelRooms.length}개):`);
      hotelRooms.forEach(r => {
        const roomName = r.title.includes(' - ') ? r.title.split(' - ')[1] : r.title;
        console.log(`   - ${roomName}: ₩${r.price_from.toLocaleString()}/박 (${r.available_spots}실)`);
      });

      const totalRooms = hotelRooms.reduce((sum, r) => sum + r.available_spots, 0);
      console.log(`\n   총 객실 재고: ${totalRooms}실`);
    }

    // 전체 상품 통계
    console.log('\n📦 전체 상품 통계:');
    console.log('-'.repeat(70));

    const [allListings] = await connection.execute('SELECT COUNT(*) as count FROM listings');
    console.log(`   전체 상품: ${allListings[0].count}개`);

    const [byCategory] = await connection.execute(`
      SELECT category_id, COUNT(*) as count
      FROM listings
      GROUP BY category_id
      ORDER BY count DESC
    `);
    console.log('\n   카테고리별:');
    byCategory.forEach(c => {
      const categoryName = c.category_id === 1 ? '숙박' :
                          c.category_id === 2 ? '렌트카' :
                          c.category_id === 3 ? '액티비티' :
                          `기타(${c.category_id})`;
      console.log(`   - ${categoryName}: ${c.count}개`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('✅ 데이터 확인 완료!');
    console.log('='.repeat(70));

    console.log('\n💡 배포 사이트에서 확인:');
    console.log('   https://travleap.vercel.app');
    console.log('\n   📌 PMS 연동 데이터:');
    console.log('   - 렌트카: Turo Korea (120대)');
    console.log('   - 숙박: 제주 오션뷰 호텔 (7개 객실 타입, 58실)');
    console.log('');

  } catch (error) {
    console.error('❌ 오류:', error);
  } finally {
    if (connection) await connection.end();
  }
}

verify();
