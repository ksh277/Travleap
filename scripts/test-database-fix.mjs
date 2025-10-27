import 'dotenv/config';
import { db } from '../utils/database.ts';

(async () => {
  try {
    console.log('=== database.ts 수정 검증 테스트 ===\n');

    // 1. 기본 연결 테스트
    console.log('1. 기본 연결 테스트...');
    const testResult = await db.query('SELECT 1 as test');
    console.log('✅ 연결 성공, 결과:', testResult);
    console.log('   타입:', Array.isArray(testResult) ? `Array (length: ${testResult.length})` : typeof testResult);

    // 2. cart_items 조회 (userId=1)
    console.log('\n2. cart_items 조회 (userId=1)...');
    const cartItems = await db.query(`
      SELECT
        ci.id as cart_item_id,
        ci.listing_id,
        ci.selected_date,
        ci.num_adults,
        ci.num_children,
        ci.num_seniors,
        ci.price_snapshot,
        l.title,
        l.images,
        l.category,
        l.location,
        l.price_from
      FROM cart_items ci
      LEFT JOIN listings l ON ci.listing_id = l.id
      WHERE ci.user_id = ?
      ORDER BY ci.created_at DESC
    `, [1]);

    console.log('✅ 조회 성공!');
    console.log('   결과 타입:', Array.isArray(cartItems) ? 'Array' : typeof cartItems);
    console.log('   레코드 수:', cartItems.length);

    if (cartItems.length > 0) {
      console.log('   첫 번째 항목:', cartItems[0]);

      // server-api.ts의 map() 로직 시뮬레이션
      console.log('\n3. server-api.ts map() 시뮬레이션...');
      const formattedItems = cartItems.map((item) => {
        let imageUrl = '';
        if (item.images) {
          try {
            const parsed = typeof item.images === 'string' ? JSON.parse(item.images) : item.images;
            imageUrl = Array.isArray(parsed) ? parsed[0] : '';
          } catch {
            imageUrl = typeof item.images === 'string' ? item.images : '';
          }
        }

        return {
          id: item.listing_id,
          title: item.title || '상품',
          price: item.price_snapshot || item.price_from || 0,
          image: imageUrl,
          category: item.category || '',
          location: item.location || '',
          date: item.selected_date,
          guests: (item.num_adults || 0) + (item.num_children || 0) + (item.num_seniors || 0),
        };
      });

      console.log('✅ map() 성공, 포맷된 결과:', formattedItems);
    } else {
      console.log('   ℹ️  userId=1의 장바구니가 비어있습니다.');
    }

    // 4. categories 조회
    console.log('\n4. categories 조회...');
    const categories = await db.query('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC');
    console.log('✅ 카테고리 수:', categories.length);
    if (categories.length > 0) {
      console.log('   첫 번째 카테고리:', categories[0]);
    }

    // 5. listings 조회
    console.log('\n5. listings 조회 (limit 3)...');
    const listings = await db.query('SELECT id, title, category_id, price_from FROM listings WHERE is_published = 1 LIMIT 3');
    console.log('✅ 상품 수:', listings.length);
    if (listings.length > 0) {
      console.log('   첫 번째 상품:', listings[0]);
    }

    console.log('\n✅ 모든 테스트 통과!');
    console.log('\n🎉 database.ts 수정이 성공적으로 작동합니다!');

  } catch (error) {
    console.error('\n❌ 테스트 실패:', error.message);
    console.error('에러 상세:', error);
    process.exit(1);
  }
})();
