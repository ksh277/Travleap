// 주문의 listing_id를 실제 상품 ID로 수정
import { connect } from '@planetscale/database';
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.DATABASE_HOST,
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD
};

async function fixOrderListings() {
  console.log('🔧 주문 상품 연결 수정 시작...\n');

  try {
    const conn = connect(config);

    // 1. 실제 존재하는 상품 ID 조회
    const listingsResult = await conn.execute('SELECT id, title FROM listings ORDER BY id LIMIT 10');
    console.log(`📦 사용 가능한 상품: ${listingsResult.rows.length}개`);

    if (listingsResult.rows.length > 0) {
      console.log('\n상품 목록:');
      listingsResult.rows.forEach((listing: any, idx: number) => {
        console.log(`  ${idx + 1}. ID: ${listing.id} - ${listing.title}`);
      });
    }

    if (listingsResult.rows.length < 4) {
      console.log('\n⚠️  상품이 4개 미만입니다. 더 많은 상품이 필요합니다.');
      return;
    }

    // 2. 주문의 listing_id 업데이트
    console.log('\n🔄 주문 업데이트 중...');

    const listing1 = listingsResult.rows[0];
    const listing2 = listingsResult.rows[1];
    const listing3 = listingsResult.rows[2];
    const listing4 = listingsResult.rows[3];

    await conn.execute('UPDATE orders SET listing_id = ? WHERE id = 1', [listing1.id]);
    console.log(`✅ 주문 #1 → ${listing1.title} (ID: ${listing1.id})`);

    await conn.execute('UPDATE orders SET listing_id = ? WHERE id = 2', [listing2.id]);
    console.log(`✅ 주문 #2 → ${listing2.title} (ID: ${listing2.id})`);

    await conn.execute('UPDATE orders SET listing_id = ? WHERE id = 3', [listing3.id]);
    console.log(`✅ 주문 #3 → ${listing3.title} (ID: ${listing3.id})`);

    await conn.execute('UPDATE orders SET listing_id = ? WHERE id = 4', [listing4.id]);
    console.log(`✅ 주문 #4 → ${listing4.title} (ID: ${listing4.id})`);

    // 3. 확인
    console.log('\n📋 업데이트된 주문 확인:');
    const ordersResult = await conn.execute(`
      SELECT
        o.id,
        o.total_amount,
        l.title as product_title,
        l.id as listing_id
      FROM orders o
      LEFT JOIN listings l ON o.listing_id = l.id
      ORDER BY o.id
    `);

    ordersResult.rows.forEach((order: any) => {
      console.log(`  주문 #${order.id}: ${order.product_title || '상품 없음'} (₩${Number(order.total_amount).toLocaleString()})`);
    });

    console.log('\n🎉 주문 상품 연결 수정 완료!');

  } catch (error) {
    console.error('❌ 수정 실패:', error);
  }

  process.exit(0);
}

fixOrderListings();
